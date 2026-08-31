import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { CITIES } from '../../../shared/constants';
import { CREW_BOSS_MIN_RANK, CityProp, PROPS, isPropType, propId } from '../../../shared/props';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
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
    if (!decoded.worldId) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    }

    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Request body is required' }) };
    }

    const { cityId, type } = JSON.parse(event.body) as { cityId: number; type: unknown };
    if (!Number.isInteger(cityId) || cityId < 0 || cityId >= CITIES.length || !isPropType(type)) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid prop request' }) };
    }

    const playerResult = await docClient.send(new GetCommand({
      TableName: PLAYERS_TABLE,
      Key: { worldId: decoded.worldId },
    }));
    const player = playerResult.Item as Player | undefined;

    if (!player) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };
    }

    if (player.city !== cityId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You must be in this city to claim its prop' }) };
    }

    if ((player.jailUntil && new Date(player.jailUntil) > new Date()) ||
        (player.hospitalUntil && new Date(player.hospitalUntil) > new Date())) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot claim a prop right now' }) };
    }

    const definition = PROPS.find((prop) => prop.type === type)!;
    if (definition.ownership === 'crew_boss_only' && player.rank < CREW_BOSS_MIN_RANK) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: 'Only crew bosses can own the Chop Shop' }),
      };
    }

    const now = new Date().toISOString();
    const prop: CityProp = {
      propId: propId(cityId, type),
      cityId,
      type,
      ownerId: player.worldId,
      ownerUsername: player.username,
      claimedAt: now,
      ...(type === 'restaurant' ? { storedIncome: 0 } : {}),
      ...(type === 'chop_shop' ? { storedBullets: 0 } : {}),
    };

    try {
      await docClient.send(new PutCommand({
        TableName: CITY_PROPS_TABLE,
        Item: prop,
        ConditionExpression: 'attribute_not_exists(propId)',
      }));
    } catch (error: any) {
      if (error?.name === 'ConditionalCheckFailedException') {
        return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'That prop is already owned' }) };
      }
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, prop, message: `${definition.name} claimed in ${CITIES[cityId].name}` }),
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    }

    console.error('claimProp failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
