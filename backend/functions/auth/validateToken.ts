import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { getJWTSecret } from '../../shared/utils';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds

interface TokenPayload {
  walletAddress: string;
  username: string;
  iat?: number;
  exp?: number;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Token validation request');

  try {
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
          error: 'Missing or invalid authorization header'
        })
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = await getJWTSecret();

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, jwtSecret) as TokenPayload;
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
          error: 'Invalid or expired token'
        })
      };
    }

    // Get player from database
    const player = await getPlayerByWallet(payload.walletAddress);
    
    if (!player) {
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
          error: 'Player not found'
        })
      };
    }

    // Check for inactivity timeout (20 minutes)
    const lastActiveTime = new Date(player.lastActive).getTime();
    const now = Date.now();
    
    if (now - lastActiveTime > INACTIVITY_TIMEOUT) {
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
          error: 'Session expired due to inactivity',
          code: 'INACTIVITY_TIMEOUT'
        })
      };
    }

    // Update last active time
    await updatePlayerLastActive(payload.walletAddress);

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
        player: {
          ...player,
          lastActive: new Date().toISOString() // Return updated timestamp
        }
      })
    };

  } catch (error) {
    console.error('Token validation error:', error);
    
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

async function getPlayerByWallet(walletAddress: string): Promise<Player | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: PLAYERS_TABLE,
      Key: { walletAddress }
    }));
    
    return result.Item as Player || null;
  } catch (error) {
    console.error('Error getting player by wallet:', error);
    return null;
  }
}

async function updatePlayerLastActive(walletAddress: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: PLAYERS_TABLE,
      Key: { walletAddress },
      UpdateExpression: 'SET lastActive = :lastActive',
      ExpressionAttributeValues: {
        ':lastActive': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error('Error updating last active:', error);
  }
}