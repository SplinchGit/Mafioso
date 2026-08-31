import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { getJWTSecret } from '../../shared/utils';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players-v2';
const INACTIVITY_TIMEOUT = 20 * 60 * 1000;
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };

interface TokenPayload { worldId: string; username: string; iat?: number; exp?: number }

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Missing or invalid authorization header' }) };

    const jwtSecret = await getJWTSecret();
    let payload: TokenPayload;
    try {
      payload = jwt.verify(authHeader.substring(7), jwtSecret) as TokenPayload;
    } catch {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid or expired token' }) };
    }
    if (!payload.worldId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid session token' }) };

    const result = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: payload.worldId } }));
    const player = result.Item as Player | undefined;
    if (!player) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };

    const now = Date.now();
    if (now - new Date(player.lastActive).getTime() > INACTIVITY_TIMEOUT) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Session expired due to inactivity', code: 'INACTIVITY_TIMEOUT' }) };
    }

    const lastActive = new Date().toISOString();
    await docClient.send(new UpdateCommand({
      TableName: PLAYERS_TABLE,
      Key: { worldId: payload.worldId },
      UpdateExpression: 'SET lastActive = :lastActive',
      ExpressionAttributeValues: { ':lastActive': lastActive },
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, player: { ...player, lastActive } }) };
  } catch (error) {
    console.error('validateToken failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
