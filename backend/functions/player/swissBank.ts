import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player, SwissBankResponse } from '../../../shared/types';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };

type BankAction = 'deposit' | 'withdraw';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Authentication required' }) };
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { worldId?: string };
    if (!decoded.worldId || !event.body) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid request' }) };

    const { action, amount } = JSON.parse(event.body) as { action: BankAction; amount: number };
    if ((action !== 'deposit' && action !== 'withdraw') || !Number.isInteger(amount) || amount <= 0) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Amount must be a positive integer and action must be deposit or withdraw' }) };

    const result = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: decoded.worldId } }));
    const player = result.Item as Player | undefined;
    if (!player) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };
    if (player.jailUntil && new Date(player.jailUntil) > new Date()) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot access Swiss Bank while in jail' }) };
    if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot access Swiss Bank while in the hospital' }) };

    const now = new Date().toISOString();
    let update;
    try {
      update = await docClient.send(new UpdateCommand({
        TableName: PLAYERS_TABLE,
        Key: { worldId: player.worldId },
        UpdateExpression: action === 'deposit'
          ? 'ADD money :moneyDelta, swissBank :bankDelta SET lastActive = :now'
          : 'ADD money :moneyDelta, swissBank :bankDelta SET lastActive = :now',
        ConditionExpression: action === 'deposit' ? 'money >= :amount' : 'swissBank >= :amount',
        ExpressionAttributeValues: action === 'deposit'
          ? { ':moneyDelta': -amount, ':bankDelta': amount, ':amount': amount, ':now': now }
          : { ':moneyDelta': amount, ':bankDelta': -amount, ':amount': amount, ':now': now },
        ReturnValues: 'ALL_NEW',
      }));
    } catch (error: any) {
      if (error?.name === 'ConditionalCheckFailedException') return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: action === 'deposit' ? 'Insufficient cash for that deposit.' : 'Insufficient Swiss Bank funds for that withdrawal.' }) };
      throw error;
    }

    const response: SwissBankResponse = {
      success: true,
      player: update.Attributes as Player,
      message: action === 'deposit' ? `Successfully deposited $${amount.toLocaleString()} to Swiss Bank` : `Successfully withdrew $${amount.toLocaleString()} from Swiss Bank`,
    };
    return { statusCode: 200, headers, body: JSON.stringify(response) };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    console.error('swissBank failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
