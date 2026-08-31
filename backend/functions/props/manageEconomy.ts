import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import {
  CHOP_SHOP_BULLETS_PER_DAY,
  CityProp,
  MIN_BULLET_PRICE,
  RESTAURANT_INCOME_PER_DAY,
  propId,
} from '../../../shared/props';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const CITY_PROPS_TABLE = process.env.CITY_PROPS_TABLE || 'mafioso-city-props';
const DAY_MS = 24 * 60 * 60 * 1000;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function accrue(prop: CityProp, now: Date): CityProp {
  const last = new Date(prop.lastAccruedAt || prop.claimedAt || now.toISOString());
  const elapsedMs = Math.max(0, now.getTime() - last.getTime());

  if (prop.type === 'restaurant') {
    const generated = Math.floor((elapsedMs / DAY_MS) * RESTAURANT_INCOME_PER_DAY);
    return {
      ...prop,
      storedIncome: (prop.storedIncome || 0) + generated,
      lastAccruedAt: now.toISOString(),
    };
  }

  if (prop.type === 'chop_shop') {
    const generated = Math.floor((elapsedMs / DAY_MS) * CHOP_SHOP_BULLETS_PER_DAY);
    return {
      ...prop,
      storedBullets: (prop.storedBullets || 0) + generated,
      lastAccruedAt: now.toISOString(),
    };
  }

  return prop;
}

async function authenticate(event: APIGatewayProxyEvent): Promise<Player | APIGatewayProxyResult> {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Authentication required' }) };
  }

  const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { worldId?: string };
  if (!decoded.worldId) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
  }

  const result = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: decoded.worldId } }));
  if (!result.Item) {
    return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };
  }
  return result.Item as Player;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Request body is required' }) };
    const body = JSON.parse(event.body) as {
      action?: string;
      cityId?: number;
      bulletPrice?: number;
      quantity?: number;
    };

    const playerOrError = await authenticate(event);
    if ('statusCode' in playerOrError) return playerOrError;
    const player = playerOrError;

    if (!Number.isInteger(body.cityId) || body.cityId! < 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid city' }) };
    }
    const cityId = body.cityId!;

    if (body.action === 'collect_restaurant') {
      const id = propId(cityId, 'restaurant');
      const result = await docClient.send(new GetCommand({ TableName: CITY_PROPS_TABLE, Key: { propId: id } }));
      if (!result.Item) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Restaurant is unowned' }) };
      const prop = accrue(result.Item as CityProp, new Date());
      if (prop.ownerId !== player.worldId) return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Only the owner can collect restaurant income' }) };

      const amount = prop.storedIncome || 0;
      if (amount < 1) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No restaurant income to collect yet' }) };

      await docClient.send(new TransactWriteCommand({ TransactItems: [
        {
          Update: {
            TableName: CITY_PROPS_TABLE,
            Key: { propId: id },
            UpdateExpression: 'SET storedIncome = :zero, lastAccruedAt = :now',
            ConditionExpression: 'ownerId = :owner',
            ExpressionAttributeValues: { ':zero': 0, ':now': prop.lastAccruedAt, ':owner': player.worldId },
          },
        },
        {
          Update: {
            TableName: PLAYERS_TABLE,
            Key: { worldId: player.worldId },
            UpdateExpression: 'ADD money :amount',
            ExpressionAttributeValues: { ':amount': amount },
          },
        },
      ] }));

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, amount, message: `Collected $${amount.toLocaleString()} from the restaurant.` }) };
    }

    if (body.action === 'set_bullet_price') {
      const price = Math.floor(Number(body.bulletPrice));
      if (!Number.isFinite(price) || price < MIN_BULLET_PRICE) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Bullet price must be at least $${MIN_BULLET_PRICE}` }) };
      }
      const id = propId(cityId, 'chop_shop');
      await docClient.send(new UpdateCommand({
        TableName: CITY_PROPS_TABLE,
        Key: { propId: id },
        UpdateExpression: 'SET bulletPrice = :price',
        ConditionExpression: 'ownerId = :owner',
        ExpressionAttributeValues: { ':price': price, ':owner': player.worldId },
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, bulletPrice: price, message: `Bullet price set to $${price}.` }) };
    }

    if (body.action === 'buy_bullets') {
      const quantity = Math.floor(Number(body.quantity));
      if (!Number.isFinite(quantity) || quantity < 1) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Quantity must be at least 1' }) };
      }
      if (player.city !== cityId) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You must be in this city to buy its bullets' }) };
      }

      const id = propId(cityId, 'chop_shop');
      const result = await docClient.send(new GetCommand({ TableName: CITY_PROPS_TABLE, Key: { propId: id } }));
      if (!result.Item) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Chop Shop is unowned' }) };
      const prop = accrue(result.Item as CityProp, new Date());
      if (!prop.ownerId) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Chop Shop is unowned' }) };
      if (prop.ownerId === player.worldId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Owners do not buy from themselves' }) };

      const available = prop.storedBullets || 0;
      if (quantity > available) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Only ${available} bullets are currently in stock` }) };
      const price = prop.bulletPrice || MIN_BULLET_PRICE;
      const total = price * quantity;
      if (player.money < total) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Not enough money' }) };

      await docClient.send(new TransactWriteCommand({ TransactItems: [
        {
          Update: {
            TableName: CITY_PROPS_TABLE,
            Key: { propId: id },
            UpdateExpression: 'SET storedBullets = :remaining, lastAccruedAt = :now ADD salesRevenue :total',
            ConditionExpression: 'ownerId = :owner',
            ExpressionAttributeValues: { ':remaining': available - quantity, ':now': prop.lastAccruedAt, ':owner': prop.ownerId, ':total': total },
          },
        },
        {
          Update: {
            TableName: PLAYERS_TABLE,
            Key: { worldId: player.worldId },
            UpdateExpression: 'ADD money :debit, bullets :quantity',
            ConditionExpression: 'money >= :total',
            ExpressionAttributeValues: { ':debit': -total, ':quantity': quantity, ':total': total },
          },
        },
        {
          Update: {
            TableName: PLAYERS_TABLE,
            Key: { worldId: prop.ownerId },
            UpdateExpression: 'ADD money :total',
            ExpressionAttributeValues: { ':total': total },
          },
        },
      ] }));

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, quantity, total, unitPrice: price, message: `Bought ${quantity} bullets for $${total.toLocaleString()}.` }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Unknown economy action' }) };
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    }
    if (error?.name === 'ConditionalCheckFailedException' || error?.name === 'TransactionCanceledException') {
      return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'The prop changed while you were acting. Try again.' }) };
    }
    console.error('manageEconomy failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
