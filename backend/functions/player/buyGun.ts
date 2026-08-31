import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player, StorePurchaseResponse } from '../../../shared/types';
import { GUNS } from '../../../shared/constants';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Authentication required' }) };
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { worldId?: string };
    if (!decoded.worldId || !event.body) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid request' }) };

    const { gunId } = JSON.parse(event.body) as { gunId: number };
    if (!Number.isInteger(gunId) || gunId < 0 || gunId >= GUNS.length) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid gun ID' }) };

    const result = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: decoded.worldId } }));
    const player = result.Item as Player | undefined;
    if (!player) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };

    const gun = GUNS[gunId];
    if (player.jailUntil && new Date(player.jailUntil) > new Date()) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot purchase items while in jail' }) };
    if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot purchase items while in the hospital' }) };
    if (gunId > 0 && player.gunId !== gunId - 1) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `You must own ${GUNS[gunId - 1].name} before purchasing this gun` }) };
    if (player.money < gun.price) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Insufficient funds. You need $${gun.price.toLocaleString()}` }) };

    const now = new Date().toISOString();
    let update;
    try {
      update = await docClient.send(new UpdateCommand({
        TableName: PLAYERS_TABLE,
        Key: { worldId: player.worldId },
        UpdateExpression: 'ADD money :debit SET gunId = :gunId, lastActive = :now',
        ConditionExpression: 'money >= :price',
        ExpressionAttributeValues: { ':debit': -gun.price, ':price': gun.price, ':gunId': gunId, ':now': now },
        ReturnValues: 'ALL_NEW',
      }));
    } catch (error: any) {
      if (error?.name === 'ConditionalCheckFailedException') return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Insufficient funds. Your balance changed before the purchase completed.' }) };
      throw error;
    }

    const response: StorePurchaseResponse = {
      success: true,
      item: { id: gun.id, name: gun.name, price: gun.price, type: 'gun', divisor: gun.divisor },
      player: update.Attributes as Player,
      message: `Successfully purchased ${gun.name}!`,
    };
    return { statusCode: 200, headers, body: JSON.stringify(response) };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    console.error('buyGun failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
