import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Player } from '../../../shared/types';
import { GAME_CONFIG } from '../../../shared/constants';
import { getJWTSecret } from '../../shared/utils';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';

interface CreateAccountRequest {
  walletAddress: string;
  username: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Create account request initiated', {
    requestId,
    operation: 'create-account',
    hasBody: !!event.body
  });

  try {
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

    const { walletAddress, username }: CreateAccountRequest = JSON.parse(event.body);

    // Validate required fields
    if (!walletAddress || !username) {
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
          error: 'Wallet address and username are required'
        })
      };
    }

    // Validate username format
    if (!isValidUsername(username)) {
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
          error: 'Invalid username format'
        })
      };
    }

    // Check if username is already taken
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
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
          error: 'Username is already taken'
        })
      };
    }

    // Create new player
    const worldId = generateWorldId();
    const player = await createNewPlayer(walletAddress, username, worldId);

    // Generate JWT token
    const jwtSecret = await getJWTSecret();
    const token = jwt.sign(
      { 
        walletAddress: player.walletAddress,
        username: player.username 
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

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
        player,
        token
      })
    };

  } catch (error) {
    await logger.error('Create account error', {
      requestId,
      operation: 'create-account',
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

function isValidUsername(username: string): boolean {
  // 3-20 characters, alphanumeric + underscore only
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    // Query the GSI for username to check if it exists
    const result = await docClient.send(new QueryCommand({
      TableName: PLAYERS_TABLE,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username
      },
      Limit: 1
    }));
    
    return !!(result.Items && result.Items.length > 0);
  } catch (error) {
    logger.errorSync('Error checking username', {
      operation: 'check-username-exists',
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    return true; // Assume taken on error to be safe
  }
}

async function createNewPlayer(walletAddress: string, username: string, worldId: string): Promise<Player> {
  const now = new Date().toISOString();
  
  const newPlayer: Player = {
    walletAddress, // Primary key
    worldId,       // Internal game ID
    username,
    money: GAME_CONFIG.STARTING_MONEY,
    respect: GAME_CONFIG.STARTING_RESPECT,
    rank: 0,
    city: 0, // Start in London
    lastActive: now,
    createdAt: now,
    stats: {
      crimesCommitted: 0,
      crimesSuccessful: 0,
      crimesFailed: 0,
      timesJailed: 0,
      timesHospitalized: 0,
      totalMoneyEarned: 0,
      totalRespectEarned: 0,
      rankUps: 0
    }
  };

  await docClient.send(new PutCommand({
    TableName: PLAYERS_TABLE,
    Item: newPlayer,
    ConditionExpression: 'attribute_not_exists(walletAddress)' // Ensure no duplicate wallet
  }));

  return newPlayer;
}

function generateWorldId(): string {
  return `mafioso_${crypto.randomBytes(16).toString('hex')}`;
}