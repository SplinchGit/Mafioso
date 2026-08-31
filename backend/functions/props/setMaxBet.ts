import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { DEFAULT_MAX_BET, isHouseGameType, propId } from '../../../shared/props';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const CITY_PROPS_TABLE = process.env.CITY_PROPS_TABLE || 'mafioso-city-props';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Authentication required' }) };
    }

    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { worldId?: string };
    if (!decoded.worldId || !event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid request' }) };
    }

    const { cityId, type, maxBet } = JSON.parse(event.body) as { cityId: number; type: unknown; maxBet: number };
    if (!Number.isInteger(cityId) || !isHouseGameType(type) || !Number.isInteger(maxBet) || maxBet < 1) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Max bet must be a whole number of at least 1' }) };
    }

    const id = propId(cityId, type);
    const current = await docClient.send(new GetCommand({ TableName: CITY_PROPS_TABLE, Key: { propId: id } }));
    if (!current.Item?.ownerId) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Casino prop is not owned' }) };
    }
    if (current.Item.ownerId !== decoded.worldId) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Only the owner can set the max bet' }) };
    }

    await docClient.send(new UpdateCommand({
      TableName: CITY_PROPS_TABLE,
      Key: { propId: id },
      UpdateExpression: 'SET maxBet = :maxBet',
      ConditionExpression: 'ownerId = :ownerId',
      ExpressionAttributeValues: { ':maxBet': maxBet, ':ownerId': decoded.worldId },
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, maxBet, previousMaxBet: current.Item.maxBet ?? DEFAULT_MAX_BET }) };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    }
    console.error('setMaxBet failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
