import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { CityProp } from '../../../shared/props';

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
    jwt.verify(authHeader.substring(7), JWT_SECRET);

    const scan = await docClient.send(new ScanCommand({ TableName: CITY_PROPS_TABLE }));
    const props = (scan.Items || []) as CityProp[];
    const playerCache = new Map<string, Player | null>();
    let released = 0;
    let baselined = 0;

    for (const prop of props) {
      if (!prop.ownerId) continue;

      let owner = playerCache.get(prop.ownerId);
      if (owner === undefined) {
        const result = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: prop.ownerId } }));
        owner = (result.Item as Player | undefined) || null;
        playerCache.set(prop.ownerId, owner);
      }
      if (!owner) continue;

      if (prop.ownerDeathsAtClaim === undefined) {
        await docClient.send(new UpdateCommand({
          TableName: CITY_PROPS_TABLE,
          Key: { propId: prop.propId },
          UpdateExpression: 'SET ownerDeathsAtClaim = :deaths',
          ConditionExpression: 'ownerId = :owner',
          ExpressionAttributeValues: { ':deaths': owner.deaths || 0, ':owner': prop.ownerId },
        }));
        baselined += 1;
        continue;
      }

      if ((owner.deaths || 0) > prop.ownerDeathsAtClaim) {
        await docClient.send(new DeleteCommand({
          TableName: CITY_PROPS_TABLE,
          Key: { propId: prop.propId },
          ConditionExpression: 'ownerId = :owner AND ownerDeathsAtClaim = :claimedDeaths',
          ExpressionAttributeValues: { ':owner': prop.ownerId, ':claimedDeaths': prop.ownerDeathsAtClaim },
        }));
        released += 1;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, released, baselined }),
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    }
    console.error('cleanupDeadProps failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
