import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { CITIES } from '../../../shared/constants';
import { CityProp, PROPS, propId } from '../../../shared/props';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const CITY_PROPS_TABLE = process.env.CITY_PROPS_TABLE || 'mafioso-city-props';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Authentication required' }) };
    }

    jwt.verify(authHeader.substring(7), JWT_SECRET);

    const rawCityId = event.queryStringParameters?.cityId;
    const cityId = Number(rawCityId);
    if (!Number.isInteger(cityId) || cityId < 0 || cityId >= CITIES.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid city ID' }) };
    }

    const keys = PROPS.map((prop) => ({ propId: propId(cityId, prop.type) }));
    const result = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [CITY_PROPS_TABLE]: { Keys: keys },
      },
    }));

    const owned = new Map<string, CityProp>();
    for (const item of result.Responses?.[CITY_PROPS_TABLE] || []) {
      const prop = item as CityProp;
      owned.set(prop.type, prop);
    }

    const props: CityProp[] = PROPS.map((definition) => owned.get(definition.type) || ({
      propId: propId(cityId, definition.type),
      cityId,
      type: definition.type,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, cityId, props }),
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    }

    console.error('getCityProps failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
