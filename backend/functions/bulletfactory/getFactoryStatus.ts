import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player, BulletFactory, BulletFactoryResponse } from '../../../shared/types';
import { CITIES, GAME_CONFIG } from '../../../shared/constants';
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
  await logger.info('Get factory status request initiated', {
    requestId,
    operation: 'get-factory-status'
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

    // Get all factories
    const factories = await getAllFactories();
    
    // Enhance factory data with additional information
    const enhancedFactories = await Promise.all(
      CITIES.map(async (city, index) => {
        const factory = factories.find(f => f.cityId === index);
        let ownerUsername = null;
        let bulletsAvailableToCollect = 0;
        let isOwnedByPlayer = false;

        if (factory && factory.ownerId) {
          // Get owner's username
          const owner = await getPlayer(factory.ownerId);
          ownerUsername = owner?.username || 'Unknown';
          isOwnedByPlayer = factory.ownerId === player.worldId;

          // Calculate bullets available to collect if owned by current player
          if (isOwnedByPlayer) {
            bulletsAvailableToCollect = calculateBulletsToCollect(factory);
          }
        }

        // Calculate city store bullets (40% of production)
        const cityStoreBullets = factory ? calculateCityStoreBullets(factory) : 0;

        return {
          cityId: index,
          cityName: city.name,
          cityFlag: city.flag,
          isOwned: !!factory?.ownerId,
          ownerId: factory?.ownerId || null,
          ownerUsername,
          isOwnedByPlayer,
          bulletsAvailableToCollect,
          cityStoreBullets,
          lastCollectionTime: factory?.lastCollectionTime || null
        };
      })
    );

    // Check if player can take over any factory
    const canTakeoverFactory = player.rank >= 15 && (player.bulletFactoryId === undefined || player.bulletFactoryId === null);

    const response: BulletFactoryResponse = {
      success: true,
      factories: enhancedFactories as any,
      message: 'Factory status retrieved successfully'
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        ...response,
        playerCanTakeover: canTakeoverFactory,
        playerFactoryId: player.bulletFactoryId
      })
    };

  } catch (error) {
    await logger.error('Get factory status error', {
      requestId,
      operation: 'get-factory-status',
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

async function getAllFactories(): Promise<BulletFactory[]> {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: BULLET_FACTORIES_TABLE
    }));
    
    return (result.Items as BulletFactory[]) || [];
  } catch (error) {
    logger.errorSync('Error getting all factories', {
      operation: 'get-all-factories',
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
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

function calculateCityStoreBullets(factory: BulletFactory): number {
  // For simplicity, we'll calculate accumulated city store bullets since factory creation
  // In a real implementation, you might want to track this separately
  const now = new Date();
  const lastCollection = new Date(factory.lastCollectionTime);
  const timeSinceLastCollection = now.getTime() - lastCollection.getTime();
  
  // 40% of daily production goes to city store (1,440 bullets per day = 60 per hour = 1 per minute)
  const cityBulletsPerMinute = (GAME_CONFIG.BULLET_FACTORY_PRODUCTION_PER_DAY * (100 - GAME_CONFIG.BULLET_FACTORY_OWNER_PERCENTAGE) / 100) / (24 * 60);
  const minutesSinceLastCollection = timeSinceLastCollection / (1000 * 60);
  
  return Math.floor(factory.storedBullets + (cityBulletsPerMinute * minutesSinceLastCollection));
}