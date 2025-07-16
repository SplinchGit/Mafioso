import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { CARS, GAME_CONFIG } from '../../../shared/constants';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Get cars request initiated', {
    requestId,
    operation: 'get-cars'
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
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
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
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
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
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Player not found'
        })
      };
    }

    // Calculate melt cooldown remaining
    let meltCooldownRemaining = 0;
    if (player.lastMeltTime) {
      const lastMelt = new Date(player.lastMeltTime);
      const now = new Date();
      const timeSinceLastMelt = now.getTime() - lastMelt.getTime();
      const cooldownRemaining = GAME_CONFIG.CAR_MELT_COOLDOWN * 1000 - timeSinceLastMelt;
      meltCooldownRemaining = Math.max(0, cooldownRemaining);
    }

    // Enhance car data with additional info
    const enhancedCars = player.cars.map(car => {
      const carData = CARS[car.carType];
      const baseBullets = carData?.baseBullets || 0;
      const damageMultiplier = (100 - car.damage) / 100;
      const bulletsIfMelted = Math.floor(baseBullets * damageMultiplier);

      return {
        ...car,
        name: carData?.name || 'Unknown Car',
        baseBullets,
        bulletsIfMelted,
        isActive: player.activeCar === car.id
      };
    });

    // Group cars by type for better organization
    const groupedCars = enhancedCars.reduce((groups: any, car) => {
      const carType = car.carType;
      if (!groups[carType]) {
        groups[carType] = [];
      }
      groups[carType].push(car);
      return groups;
    }, {});

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: {
          cars: enhancedCars,
          groupedCars,
          activeCar: player.activeCar,
          meltCooldownRemaining: Math.ceil(meltCooldownRemaining / 1000), // in seconds
          totalCars: player.cars.length
        }
      })
    };

  } catch (error) {
    await logger.error('Get cars error', {
      requestId,
      operation: 'get-cars',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
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