import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player, ShootResult } from '../../../shared/types';
import { GAME_CONFIG, RANK_DIFFERENCE_MULTIPLIERS, GUNS, PROTECTION, CARS } from '../../../shared/constants';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Shoot player request initiated', {
    requestId,
    operation: 'shoot-player',
    hasBody: !!event.body
  });

  try {
    // Verify authentication
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Authentication required'
        })
      };
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid authentication token'
        })
      };
    }

    // Get player data
    const player = await getPlayer(decoded.worldId);
    if (!player) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Player not found'
        })
      };
    }

    // Validate shooting attempt
    const validationResult = validateShootingAttempt(player);
    if (!validationResult.canShoot) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: validationResult.reason
        })
      };
    }

    // Get target player
    const targetPlayer = await getPlayer(validationResult.targetId!);
    if (!targetPlayer) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Target player not found'
        })
      };
    }

    // Calculate bullets required and check if player has enough
    const bulletsRequired = calculateBulletsRequired(player, targetPlayer);
    if (player.bullets < bulletsRequired) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: `Not enough bullets. You need ${bulletsRequired} bullets but only have ${player.bullets}`
        })
      };
    }

    // Execute the shooting
    const { updatedAttacker, updatedTarget, carsTransferred } = await executeShoot(player, targetPlayer, bulletsRequired);

    const response: ShootResult = {
      success: true,
      bulletsCost: bulletsRequired,
      target: targetPlayer.username,
      message: `Successfully killed ${targetPlayer.username}! They have been reset to Beggar rank.`,
      carsGained: carsTransferred
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    await logger.error('Shoot player error', {
      requestId,
      operation: 'shoot-player',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

async function getPlayer(worldId: string): Promise<Player | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: PLAYERS_TABLE,
      Key: { worldId }
    }));
    
    return result.Item as Player || null;
  } catch (error) {
    logger.errorSync('Error getting player', {
      operation: 'get-player',
      worldId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function validateShootingAttempt(player: Player): { canShoot: boolean; reason?: string; targetId?: string } {
  // Check if player is in jail or hospital
  if (player.jailUntil && new Date(player.jailUntil) > new Date()) {
    return { canShoot: false, reason: 'You cannot shoot while in jail' };
  }
  
  if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) {
    return { canShoot: false, reason: 'You cannot shoot while in the hospital' };
  }

  // Check if player has a gun
  if (player.gunId === undefined || player.gunId === null) {
    return { canShoot: false, reason: 'You need a gun to shoot someone' };
  }

  // Check if player has completed a search
  if (!player.searchingFor) {
    return { canShoot: false, reason: 'You must search for a target first' };
  }

  const searchEndTime = new Date(player.searchingFor.searchEndTime);
  const now = new Date();
  
  // Check if search is complete
  if (searchEndTime > now) {
    return { canShoot: false, reason: 'Your search is not complete yet' };
  }

  // Check if search result is still valid (within 1 hour of completion)
  const searchExpiredTime = new Date(searchEndTime.getTime() + GAME_CONFIG.SEARCH_RESULT_VALID_TIME * 1000);
  if (now > searchExpiredTime) {
    return { canShoot: false, reason: 'Your search results have expired. Please search again.' };
  }

  return { canShoot: true, targetId: player.searchingFor.targetId };
}

function calculateBulletsRequired(attacker: Player, target: Player): number {
  // Base bullets = 1,000
  let bulletsRequired = 1000;

  // Apply rank difference multiplier
  const rankDifference = Math.abs(attacker.rank - target.rank);
  const multiplierKey = Math.min(rankDifference, 10); // Cap at 10 for the multiplier lookup
  const rankMultiplier = RANK_DIFFERENCE_MULTIPLIERS[multiplierKey as keyof typeof RANK_DIFFERENCE_MULTIPLIERS];
  bulletsRequired *= rankMultiplier;

  // Apply target's protection multiplier
  if (target.protectionId !== undefined && target.protectionId !== null) {
    const protection = PROTECTION[target.protectionId];
    bulletsRequired *= protection.multiplier;
  }

  // Apply attacker's gun divisor (reduces bullets needed)
  if (attacker.gunId !== undefined && attacker.gunId !== null) {
    const gun = GUNS[attacker.gunId];
    bulletsRequired /= gun.divisor;
  }

  // Round up to nearest integer
  return Math.ceil(bulletsRequired);
}

async function executeShoot(attacker: Player, target: Player, bulletsUsed: number): Promise<{
  updatedAttacker: Player;
  updatedTarget: Player;
  carsTransferred: number;
}> {
  const now = new Date().toISOString();

  // Count how many cars the target has (for the killer to gain)
  const carsTransferred = target.cars.length;

  // Update attacker
  const attackerUpdates: Partial<Player> = {
    bullets: attacker.bullets - bulletsUsed,
    kills: attacker.kills + 1,
    lastActive: now,
    searchingFor: undefined, // Clear the search
  };

  // Transfer all cars from target to attacker
  if (target.cars.length > 0) {
    // Mark transferred cars as obtained from killing a player
    const transferredCars = target.cars.map(car => ({
      ...car,
      source: 'killed_player' as const
    }));
    attackerUpdates.cars = [...attacker.cars, ...transferredCars];
    
    // If attacker has no active car, set the first transferred car as active
    if (!attacker.activeCar && transferredCars.length > 0) {
      attackerUpdates.activeCar = transferredCars[0].id;
    }
  }

  // Update target (reset account)
  const targetUpdates: Partial<Player> = {
    money: GAME_CONFIG.STARTING_MONEY, // Reset to $1,000
    respect: 0, // Reset respect
    rank: 0, // Reset to Beggar
    gunId: undefined, // Remove gun
    protectionId: undefined, // Remove protection
    bullets: GAME_CONFIG.STARTING_BULLETS, // Reset bullets
    deaths: target.deaths + 1,
    cars: [], // Remove all cars (transferred to killer)
    activeCar: undefined, // Clear active car
    lastActive: now,
    // Note: Swiss Bank balance is preserved!
  };

  // Update both players in database
  await Promise.all([
    updatePlayer(attacker.worldId, attackerUpdates),
    updatePlayer(target.worldId, targetUpdates)
  ]);

  return {
    updatedAttacker: { ...attacker, ...attackerUpdates },
    updatedTarget: { ...target, ...targetUpdates },
    carsTransferred
  };
}

async function updatePlayer(worldId: string, updates: Partial<Player>): Promise<void> {
  // Build update expression
  const updateExpressions: string[] = [];
  const expressionAttributeNames: { [key: string]: string } = {};
  const expressionAttributeValues: { [key: string]: any } = {};

  Object.entries(updates).forEach(([key, value], index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    
    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = value;
  });

  await docClient.send(new UpdateCommand({
    TableName: PLAYERS_TABLE,
    Key: { worldId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));
}