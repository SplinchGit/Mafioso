import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { CITIES, GAME_CONFIG, CARS } from '../../../shared/constants';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';

interface TravelRequest {
  cityId: number;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Travel request initiated', {
    requestId,
    operation: 'travel',
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

    const { cityId }: TravelRequest = JSON.parse(event.body);

    // Validate city ID
    if (typeof cityId !== 'number' || cityId < 0 || cityId >= CITIES.length) {
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
          error: 'Invalid city ID'
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

    // Validate travel request
    const validationResult = validateTravel(player, cityId);
    if (!validationResult.canTravel) {
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

    // Process travel
    const { updatedPlayer, travelTimeSeconds } = await processTravel(player, cityId);

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
        data: {
          player: updatedPlayer,
          travelTimeSeconds,
          message: `Successfully traveled to ${CITIES[cityId].name} in ${Math.ceil(travelTimeSeconds / 60)} minutes`
        }
      })
    };

  } catch (error) {
    await logger.error('Travel error', {
      requestId,
      operation: 'travel',
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

function validateTravel(player: Player, cityId: number): { canTravel: boolean; reason?: string } {
  // Check if player is in jail or hospital
  if (player.jailUntil && new Date(player.jailUntil) > new Date()) {
    return { canTravel: false, reason: 'You cannot travel while in jail' };
  }
  
  if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) {
    return { canTravel: false, reason: 'You cannot travel while in the hospital' };
  }

  // Check if player is already in this city
  if (player.city === cityId) {
    return { canTravel: false, reason: 'You are already in this city' };
  }

  // Check if player has enough money
  const travelCost = GAME_CONFIG.TRAVEL_COST_BASE;
  if (player.money < travelCost) {
    return { canTravel: false, reason: `You need $${travelCost.toLocaleString()} to travel` };
  }

  // Check if player has an active car
  if (!player.activeCar || player.cars.length === 0) {
    return { canTravel: false, reason: 'You need a car to travel between cities' };
  }

  // Find the active car and check if it's not too damaged
  const activeCar = player.cars.find(car => car.id === player.activeCar);
  if (!activeCar) {
    return { canTravel: false, reason: 'Your active car was not found' };
  }

  if (activeCar.damage >= 100) {
    return { canTravel: false, reason: 'Your car is too damaged to travel. Repair or get a new car.' };
  }

  return { canTravel: true };
}

async function processTravel(player: Player, cityId: number): Promise<{
  updatedPlayer: Player;
  travelTimeSeconds: number;
}> {
  const now = new Date().toISOString();
  const travelCost = GAME_CONFIG.TRAVEL_COST_BASE;
  
  // Calculate travel time based on active car speed
  const travelTimeSeconds = calculateTravelTime(player);
  
  // Apply damage to active car
  const updatedCars = player.cars.map(car => {
    if (car.id === player.activeCar) {
      // Apply 5% damage for travel
      const newDamage = Math.min(100, car.damage + GAME_CONFIG.CAR_DAMAGE_PER_TRAVEL);
      return { ...car, damage: newDamage };
    }
    return car;
  });

  const updates: Partial<Player> = {
    city: cityId,
    money: player.money - travelCost,
    cars: updatedCars,
    lastActive: now
  };

  // Update player in database
  await updatePlayer(player.worldId, updates);

  const updatedPlayer = { ...player, ...updates };
  return { updatedPlayer, travelTimeSeconds };
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

function calculateTravelTime(player: Player): number {
  // Find the active car
  const activeCar = player.cars.find(car => car.id === player.activeCar);
  if (!activeCar) {
    // Fallback to base travel time if no active car found
    return GAME_CONFIG.TRAVEL_TIME;
  }

  // Get car stats
  const carData = CARS[activeCar.carType];
  if (!carData) {
    return GAME_CONFIG.TRAVEL_TIME;
  }

  // Calculate travel time based on car speed
  // Ferrari LaFerrari (speed 100) = 60 seconds (1 minute)
  // Fiat 500 (speed 45) = 10,800 seconds (3 hours)
  // Linear scale between these points
  
  // Formula: time = (maxTime - minTime) * (maxSpeed - carSpeed) / (maxSpeed - minSpeed) + minTime
  const maxSpeed = 100; // Ferrari LaFerrari
  const minSpeed = 45;  // Fiat 500
  const maxTime = 10800; // 3 hours for Fiat 500
  const minTime = 60;    // 1 minute for Ferrari LaFerrari
  
  const travelTime = Math.ceil(
    (maxTime - minTime) * (maxSpeed - carData.speed) / (maxSpeed - minSpeed) + minTime
  );
  
  return travelTime;
}