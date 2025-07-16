import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Player, CarListing, CarMarketplaceResponse } from '../../../shared/types';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const CAR_LISTINGS_TABLE = process.env.CAR_LISTINGS_TABLE || 'mafioso-car-listings';

interface ListCarRequest {
  carId: string;
  price: number;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('List car request initiated', {
    requestId,
    operation: 'list-car',
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

    const { carId, price }: ListCarRequest = JSON.parse(event.body);

    // Validate input
    if (!carId || typeof price !== 'number' || price < 1) {
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
          error: 'Valid car ID and price (minimum $1) are required'
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

    // Validate listing
    const validationResult = validateCarListing(player, carId);
    if (!validationResult.canList) {
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

    // Create listing
    const car = validationResult.car!;
    await createCarListing(player, car, price);

    const response: CarMarketplaceResponse = {
      success: true,
      message: `Successfully listed ${car.carType} for $${price.toLocaleString()}`
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
    await logger.error('List car error', {
      requestId,
      operation: 'list-car',
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

function validateCarListing(player: Player, carId: string): { canList: boolean; reason?: string; car?: any } {
  // Check if player is in jail or hospital
  if (player.jailUntil && new Date(player.jailUntil) > new Date()) {
    return { canList: false, reason: 'You cannot list cars while in jail' };
  }
  
  if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) {
    return { canList: false, reason: 'You cannot list cars while in the hospital' };
  }

  // Check if player owns the car
  const car = player.cars.find(c => c.id === carId);
  if (!car) {
    return { canList: false, reason: 'You do not own this car' };
  }

  // Check if car is currently active (can't sell active car)
  if (player.activeCar === carId) {
    return { canList: false, reason: 'You cannot sell your currently active car' };
  }

  return { canList: true, car };
}

async function createCarListing(player: Player, car: any, price: number): Promise<CarListing> {
  const now = new Date().toISOString();
  const listingId = crypto.randomUUID();
  
  const listing: CarListing = {
    id: listingId,
    sellerId: player.worldId,
    carId: car.id,
    carType: car.carType,
    damage: car.damage,
    price,
    listedAt: now,
    active: true
  };

  // Create listing in database
  await docClient.send(new PutCommand({
    TableName: CAR_LISTINGS_TABLE,
    Item: listing
  }));

  return listing;
}