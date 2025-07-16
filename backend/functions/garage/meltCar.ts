import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player, CarMeltResponse } from '../../../shared/types';
import { CARS, GAME_CONFIG } from '../../../shared/constants';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';

interface MeltCarRequest {
  carId: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Melt car request initiated', {
    requestId,
    operation: 'melt-car',
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

    if (!event.body) {
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
          error: 'Request body is required'
        })
      };
    }

    const { carId }: MeltCarRequest = JSON.parse(event.body);

    // Validate input
    if (!carId) {
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
          error: 'Car ID is required'
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

    // Validate melting
    const validationResult = validateCarMelt(player, carId);
    if (!validationResult.canMelt) {
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

    // Execute melting
    const { updatedPlayer, bulletsGained } = await executeMelt(player, validationResult.car!);

    const carName = CARS[validationResult.car!.carType]?.name || 'Unknown Car';
    const response: CarMeltResponse = {
      success: true,
      bulletsGained,
      player: updatedPlayer,
      message: `Successfully melted ${carName} for ${bulletsGained} bullets!`
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
    await logger.error('Melt car error', {
      requestId,
      operation: 'melt-car',
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

function validateCarMelt(player: Player, carId: string): { canMelt: boolean; reason?: string; car?: any } {
  // Check if player is in jail or hospital
  if (player.jailUntil && new Date(player.jailUntil) > new Date()) {
    return { canMelt: false, reason: 'You cannot melt cars while in jail' };
  }
  
  if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) {
    return { canMelt: false, reason: 'You cannot melt cars while in the hospital' };
  }

  // Check cooldown (5 minutes)
  if (player.lastMeltTime) {
    const lastMelt = new Date(player.lastMeltTime);
    const now = new Date();
    const timeSinceLastMelt = now.getTime() - lastMelt.getTime();
    const cooldownRemaining = GAME_CONFIG.CAR_MELT_COOLDOWN * 1000 - timeSinceLastMelt;
    
    if (cooldownRemaining > 0) {
      const minutesRemaining = Math.ceil(cooldownRemaining / (1000 * 60));
      return { canMelt: false, reason: `Melt cooldown active. Try again in ${minutesRemaining} minute(s).` };
    }
  }

  // Check if player owns the car
  const car = player.cars.find(c => c.id === carId);
  if (!car) {
    return { canMelt: false, reason: 'You do not own this car' };
  }

  // Check if car is currently active
  if (player.activeCar === carId) {
    return { canMelt: false, reason: 'You cannot melt your currently active car' };
  }

  return { canMelt: true, car };
}

function calculateBulletsFromMelt(car: any): number {
  const carData = CARS[car.carType];
  if (!carData) return 0;

  const baseBullets = carData.baseBullets;
  const damageMultiplier = (100 - car.damage) / 100; // 0% damage = 100% bullets, 100% damage = 0% bullets
  
  return Math.floor(baseBullets * damageMultiplier);
}

async function executeMelt(player: Player, car: any): Promise<{
  updatedPlayer: Player;
  bulletsGained: number;
}> {
  const now = new Date().toISOString();
  const bulletsGained = calculateBulletsFromMelt(car);

  // Remove car from player's inventory
  const updatedCars = player.cars.filter(c => c.id !== car.id);

  // Update active car if the melted car was active
  let updatedActiveCar = player.activeCar;
  if (player.activeCar === car.id) {
    updatedActiveCar = updatedCars.length > 0 ? updatedCars[0].id : undefined;
  }

  const updates = {
    cars: updatedCars,
    activeCar: updatedActiveCar,
    bullets: player.bullets + bulletsGained,
    lastMeltTime: now,
    lastActive: now
  };

  // Update player in database
  await updatePlayer(player.worldId, updates);

  const updatedPlayer: Player = { ...player, ...updates };

  return { updatedPlayer, bulletsGained };
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