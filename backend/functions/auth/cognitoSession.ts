import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { GAME_CONFIG } from '../../../shared/constants';
import { getJWTSecret } from '../../shared/utils';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players-v2';
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function validUsername(value: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(value);
}

async function usernameTaken(username: string, worldId: string): Promise<boolean> {
  const result = await docClient.send(new QueryCommand({
    TableName: PLAYERS_TABLE,
    IndexName: 'username-index',
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: { ':username': username },
    Limit: 1,
  }));
  return Boolean(result.Items?.some((item) => item.worldId !== worldId));
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const claims = event.requestContext.authorizer?.claims as Record<string, string> | undefined;
    const subject = claims?.sub;
    const email = claims?.email;
    if (!subject || !email) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Cognito authentication required' }) };
    }

    const worldId = `cognito_${subject}`;
    const existing = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId } }));
    let player = existing.Item as Player | undefined;

    if (!player) {
      const body = event.body ? JSON.parse(event.body) as { username?: string } : {};
      const username = String(body.username || claims.preferred_username || '').trim();
      if (!validUsername(username)) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, needsUsername: true, error: 'Choose a username using 3-20 letters, numbers or underscores' }) };
      }
      if (await usernameTaken(username, worldId)) {
        return { statusCode: 409, headers, body: JSON.stringify({ success: false, needsUsername: true, error: 'Username is already taken' }) };
      }

      const now = new Date().toISOString();
      player = {
        worldId,
        walletAddress: `cognito:${subject}`,
        username,
        money: GAME_CONFIG.STARTING_MONEY,
        respect: GAME_CONFIG.STARTING_RESPECT,
        rank: 0,
        city: 0,
        lastActive: now,
        createdAt: now,
        bullets: GAME_CONFIG.STARTING_BULLETS,
        kills: 0,
        deaths: 0,
        swissBank: GAME_CONFIG.STARTING_SWISS_BANK,
        cars: [],
        goods: { booze: 0, prozac: 0, weed: 0, crystal: 0, fashion: 0 },
        goodsCostBasis: { booze: 0, prozac: 0, weed: 0, crystal: 0, fashion: 0 },
        stats: {
          crimesCommitted: 0,
          crimesSuccessful: 0,
          crimesFailed: 0,
          timesJailed: 0,
          timesHospitalized: 0,
          totalMoneyEarned: 0,
          totalRespectEarned: 0,
          rankUps: 0,
        },
      };

      try {
        await docClient.send(new PutCommand({
          TableName: PLAYERS_TABLE,
          Item: player,
          ConditionExpression: 'attribute_not_exists(worldId)',
        }));
      } catch (error: any) {
        if (error?.name !== 'ConditionalCheckFailedException') throw error;
        const raced = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId } }));
        player = raced.Item as Player | undefined;
        if (!player) throw error;
      }
    }

    const jwtSecret = await getJWTSecret();
    const token = jwt.sign({ worldId: player.worldId, username: player.username, email }, jwtSecret, { expiresIn: '30d' });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, player, token }) };
  } catch (error) {
    console.error('cognitoSession failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
