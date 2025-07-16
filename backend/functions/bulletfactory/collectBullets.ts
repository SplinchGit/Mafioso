import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player, BulletFactory, BulletFactoryResponse } from '../../../shared/types';
import { GAME_CONFIG, CITIES } from '../../../shared/constants';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const BULLET_FACTORIES_TABLE = process.env.BULLET_FACTORIES_TABLE || 'mafioso-bullet-factories';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Collect bullets request initiated', {
    requestId,
    operation: 'collect-bullets'
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

    // Validate collection
    const validationResult = validateBulletCollection(player);
    if (!validationResult.canCollect) {
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

    // Get factory data
    const factory = await getFactory(player.bulletFactoryId!);
    if (!factory) {
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
          error: 'Factory not found'
        })
      };
    }

    // Calculate bullets to collect
    const bulletsToCollect = calculateBulletsToCollect(factory);

    if (bulletsToCollect === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          bulletsCollected: 0,
          message: 'No bullets available to collect at this time'
        })
      };
    }

    // Execute collection
    const { updatedPlayer } = await executeCollection(player, factory, bulletsToCollect);

    const cityName = CITIES[factory.cityId]?.name || 'Unknown City';
    const response: BulletFactoryResponse = {
      success: true,
      player: updatedPlayer,
      bulletsCollected: bulletsToCollect,
      message: `Collected ${bulletsToCollect} bullets from your factory in ${cityName}!`
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
    await logger.error('Collect bullets error', {
      requestId,
      operation: 'collect-bullets',
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

async function getFactory(cityId: number): Promise<BulletFactory | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: BULLET_FACTORIES_TABLE,
      Key: { cityId }
    }));
    
    return result.Item as BulletFactory || null;
  } catch (error) {
    logger.errorSync('Error getting factory', {
      operation: 'get-factory',
      cityId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function validateBulletCollection(player: Player): { canCollect: boolean; reason?: string } {
  // Check if player owns a factory
  if (player.bulletFactoryId === undefined || player.bulletFactoryId === null) {
    return { canCollect: false, reason: 'You do not own a bullet factory' };
  }

  // Check if player is in jail or hospital
  if (player.jailUntil && new Date(player.jailUntil) > new Date()) {
    return { canCollect: false, reason: 'You cannot collect bullets while in jail' };
  }
  
  if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) {
    return { canCollect: false, reason: 'You cannot collect bullets while in the hospital' };
  }

  return { canCollect: true };
}

function calculateBulletsToCollect(factory: BulletFactory): number {
  const now = new Date();
  const lastCollection = new Date(factory.lastCollectionTime);
  const timeSinceLastCollection = now.getTime() - lastCollection.getTime();
  
  // Calculate bullets produced since last collection
  // 60% of daily production goes to owner (2,160 bullets per day = 90 per hour = 1.5 per minute)
  const bulletsPerMinute = (GAME_CONFIG.BULLET_FACTORY_PRODUCTION_PER_DAY * GAME_CONFIG.BULLET_FACTORY_OWNER_PERCENTAGE / 100) / (24 * 60);
  const minutesSinceLastCollection = timeSinceLastCollection / (1000 * 60);
  
  return Math.floor(bulletsPerMinute * minutesSinceLastCollection);
}

async function executeCollection(player: Player, factory: BulletFactory, bulletsToCollect: number): Promise<{
  updatedPlayer: Player;
  updatedFactory: BulletFactory;
}> {
  const now = new Date().toISOString();

  // Update player bullets
  const updatedPlayer: Player = {
    ...player,
    bullets: player.bullets + bulletsToCollect,
    lastActive: now
  };

  // Update factory last collection time
  const updatedFactory: BulletFactory = {
    ...factory,
    lastCollectionTime: now
  };

  // Save both to database
  await Promise.all([
    // Update player
    updatePlayer(player.worldId, { bullets: updatedPlayer.bullets, lastActive: now }),
    // Update factory
    updateFactory(factory.cityId, { lastCollectionTime: now })
  ]);

  return { updatedPlayer, updatedFactory };
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

async function updateFactory(cityId: number, updates: Partial<BulletFactory>): Promise<void> {
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
    TableName: BULLET_FACTORIES_TABLE,
    Key: { cityId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));
}