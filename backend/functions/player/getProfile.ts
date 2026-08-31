import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players-v2';
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Authentication required' }) };
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { worldId?: string };
    if (!decoded.worldId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    const result = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: decoded.worldId } }));
    if (!result.Item) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, player: result.Item as Player }) };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    console.error('getProfile failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
