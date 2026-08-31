import { randomInt } from 'crypto';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import {
  BLACKJACK_NATURAL_WIN_SHARE,
  DEFAULT_MAX_BET,
  HOUSE_WIN_PERCENT,
  MIN_BET,
  isHouseGameType,
  propId,
} from '../../../shared/props';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
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
    if (!decoded.worldId || !event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid request' }) };
    }

    const { cityId, type, bet } = JSON.parse(event.body) as { cityId: number; type: unknown; bet: number };
    if (!Number.isInteger(cityId) || !isHouseGameType(type) || !Number.isInteger(bet) || bet < MIN_BET) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Bet must be a whole number of at least ${MIN_BET}` }) };
    }

    const [playerResult, propResult] = await Promise.all([
      docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: decoded.worldId } })),
      docClient.send(new GetCommand({ TableName: CITY_PROPS_TABLE, Key: { propId: propId(cityId, type) } })),
    ]);

    const player = playerResult.Item as Player | undefined;
    const prop = propResult.Item;
    if (!player) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };
    }
    if (player.city !== cityId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You must be in this city to play' }) };
    }
    if (!prop?.ownerId) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'This table has no owner' }) };
    }
    if (prop.ownerId === player.worldId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot bet against your own table' }) };
    }

    const maxBet = Number(prop.maxBet ?? DEFAULT_MAX_BET);
    if (bet > maxBet) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Maximum bet is ${maxBet}` }) };
    }
    if (player.money < bet) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You do not have enough money' }) };
    }

    const ownerResult = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: prop.ownerId } }));
    const owner = ownerResult.Item as Player | undefined;
    if (!owner) {
      return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Table owner is unavailable' }) };
    }

    const houseWins = randomInt(0, 100) < HOUSE_WIN_PERCENT;
    const natural21 = !houseWins && type === 'blackjack' && randomInt(0, 10000) < Math.round(BLACKJACK_NATURAL_WIN_SHARE * 10000);
    const ownerDelta = houseWins ? bet : -(natural21 ? Math.ceil(bet * 1.25) : bet);
    const playerDelta = -ownerDelta;

    if (ownerDelta < 0 && owner.money < Math.abs(ownerDelta)) {
      return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'The house cannot cover that bet right now' }) };
    }

    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: PLAYERS_TABLE,
            Key: { worldId: player.worldId },
            UpdateExpression: 'ADD money :delta',
            ConditionExpression: 'money >= :bet',
            ExpressionAttributeValues: { ':delta': playerDelta, ':bet': bet },
          },
        },
        {
          Update: {
            TableName: PLAYERS_TABLE,
            Key: { worldId: owner.worldId },
            UpdateExpression: 'ADD money :delta',
            ...(ownerDelta < 0 ? {
              ConditionExpression: 'money >= :liability',
              ExpressionAttributeValues: { ':delta': ownerDelta, ':liability': Math.abs(ownerDelta) },
            } : {
              ExpressionAttributeValues: { ':delta': ownerDelta },
            }),
          },
        },
      ],
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        game: type,
        bet,
        result: houseWins ? 'house_win' : natural21 ? 'blackjack_21' : 'player_win',
        playerDelta,
        ownerDelta,
        maxBet,
        message: houseWins
          ? `The house wins ${bet}.`
          : natural21
            ? `21. You win ${Math.abs(playerDelta)}.`
            : `You win ${Math.abs(playerDelta)}.`,
      }),
    };
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    }
    if (error?.name === 'TransactionCanceledException') {
      return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Balance changed before the bet settled. Try again.' }) };
    }
    console.error('playHouseGame failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
