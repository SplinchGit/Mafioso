import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player, BulletFactory, BulletFactoryResponse } from '../../../shared/types';
import { CITIES } from '../../../shared/constants';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const BULLET_FACTORIES_TABLE = process.env.BULLET_FACTORIES_TABLE || 'mafioso-bullet-factories';

interface TakeoverFactoryRequest {
  cityId: number;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Takeover factory request initiated', {
    requestId,
    operation: 'takeover-factory',
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

    const { cityId }: TakeoverFactoryRequest = JSON.parse(event.body);

    // Validate input
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

    // Get factory data
    const factory = await getFactory(cityId);

    // Validate takeover
    const validationResult = validateFactoryTakeover(player, factory);
    if (!validationResult.canTakeover) {
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

    // Execute takeover
    const { updatedPlayer } = await executeTakeover(player, cityId, factory);

    const cityName = CITIES[cityId]?.name || 'Unknown City';
    const response: BulletFactoryResponse = {
      success: true,
      player: updatedPlayer,
      message: `Successfully took over the bullet factory in ${cityName}!`
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
    await logger.error('Takeover factory error', {
      requestId,
      operation: 'takeover-factory',
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

function validateFactoryTakeover(player: Player, factory: BulletFactory | null): { canTakeover: boolean; reason?: string } {
  // Check if player is in jail or hospital
  if (player.jailUntil && new Date(player.jailUntil) > new Date()) {
    return { canTakeover: false, reason: 'You cannot takeover factories while in jail' };
  }
  
  if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) {
    return { canTakeover: false, reason: 'You cannot takeover factories while in the hospital' };
  }

  // Check if player is crew boss (rank 15+ for simplicity, adjust as needed)
  if (player.rank < 15) {
    return { canTakeover: false, reason: 'Only crew bosses (Faction Boss rank+) can own bullet factories' };
  }

  // Check if player already owns a factory
  if (player.bulletFactoryId !== undefined && player.bulletFactoryId !== null) {
    return { canTakeover: false, reason: 'You can only own one bullet factory at a time' };
  }

  // Check if factory already has an owner
  if (factory && factory.ownerId) {
    return { canTakeover: false, reason: 'This factory is already owned by another player' };
  }

  return { canTakeover: true };
}

async function executeTakeover(player: Player, cityId: number, existingFactory: BulletFactory | null): Promise<{
  updatedPlayer: Player;
  updatedFactory: BulletFactory;
}> {
  const now = new Date().toISOString();

  // Create or update factory
  const factory: BulletFactory = {
    cityId,
    ownerId: player.worldId,
    lastCollectionTime: now,
    storedBullets: existingFactory?.storedBullets || 0
  };

  // Update player
  const updatedPlayer: Player = {
    ...player,
    bulletFactoryId: cityId,
    lastActive: now
  };

  // Save both to database
  await Promise.all([
    // Update player
    updatePlayer(player.worldId, { bulletFactoryId: cityId, lastActive: now }),
    // Create/update factory
    docClient.send(new PutCommand({
      TableName: BULLET_FACTORIES_TABLE,
      Item: factory
    }))
  ]);

  return { updatedPlayer, updatedFactory: factory };
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