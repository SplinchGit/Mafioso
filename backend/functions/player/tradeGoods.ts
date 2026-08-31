import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Crew, GoodsInventory, GoodsTradeResponse, Player } from '../../../shared/types';
import { CREW_CONFIG, GOODS, GoodId, RANKS, getGoodsCapacity } from '../../../shared/constants';
import { getJWTSecret } from '../../shared/utils';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const CREWS_TABLE = process.env.CREWS_TABLE || 'mafioso-crews';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

interface TradeGoodsRequest {
  goodId: GoodId;
  action: 'buy' | 'sell';
  quantity: number;
}

function response(statusCode: number, body: object): APIGatewayProxyResult {
  return { statusCode, headers, body: JSON.stringify(body) };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    const userId = await getWorldId(event);

    if (!event.body) {
      return response(400, { success: false, error: 'Request body is required' });
    }

    const request = JSON.parse(event.body) as TradeGoodsRequest;
    const good = GOODS.find((candidate) => candidate.id === request.goodId);

    if (!good) {
      return response(400, { success: false, error: 'Unknown good' });
    }

    if (request.action !== 'buy' && request.action !== 'sell') {
      return response(400, { success: false, error: 'Action must be buy or sell' });
    }

    const maximumCapacity = Math.floor(
      RANKS[RANKS.length - 1].cargoCapacity
      * (1 + CREW_CONFIG.MEMBER_CAPACITY_BONUS + CREW_CONFIG.GABBAGOOL_CAPACITY_BONUS)
    );
    if (!Number.isInteger(request.quantity) || request.quantity < 1 || request.quantity > maximumCapacity) {
      return response(400, {
        success: false,
        error: `Quantity must be between 1 and ${maximumCapacity}`
      });
    }

    const player = await getPlayer(userId);
    if (!player) {
      return response(404, { success: false, error: 'Player not found' });
    }

    const blockedReason = getBlockedReason(player);
    if (blockedReason) {
      return response(400, { success: false, error: blockedReason });
    }

    const unitPrice = good.prices[player.city];
    if (unitPrice === undefined) {
      return response(400, { success: false, error: 'Player is in an unknown market' });
    }

    const inventory = normalizeInventory(player);
    const costBasis = normalizeCostBasis(player);
    const crew = player.crewId ? await getCrew(player.crewId) : null;
    const gabbagoolActive = Boolean(
      crew?.gabbagoolActiveUntil && Date.parse(crew.gabbagoolActiveUntil) > Date.now()
    );
    const usedCapacity = GOODS.reduce((total, item) => total + inventory[item.id], 0);
    const cargoCapacity = getGoodsCapacity(player.rank, crew ? player.crewRole : undefined, gabbagoolActive);
    const total = unitPrice * request.quantity;

    if (request.action === 'buy') {
      if (usedCapacity + request.quantity > cargoCapacity) {
        return response(400, {
          success: false,
          error: `Not enough cargo space. Your rank carries ${cargoCapacity} units.`
        });
      }
      if (player.money < total) {
        return response(400, { success: false, error: `You need $${total.toLocaleString()}` });
      }
    } else if (inventory[good.id] < request.quantity) {
      return response(400, { success: false, error: `You only have ${inventory[good.id]} ${good.name}` });
    }

    const updatedInventory: GoodsInventory = {
      ...inventory,
      [good.id]: inventory[good.id] + (request.action === 'buy' ? request.quantity : -request.quantity)
    };
    let profit = 0;
    let crewKickback = 0;
    const updatedCostBasis = { ...costBasis };
    if (request.action === 'buy') {
      updatedCostBasis[good.id] += total;
    } else {
      const heldBeforeSale = inventory[good.id];
      const allocatedCost = request.quantity === heldBeforeSale
        ? costBasis[good.id]
        : Math.floor(costBasis[good.id] * request.quantity / heldBeforeSale);
      updatedCostBasis[good.id] = Math.max(0, costBasis[good.id] - allocatedCost);
      profit = Math.max(0, total - allocatedCost);
      if (player.crewRole === 'member' && crew?.bossId && crew.bossId !== player.worldId) {
        crewKickback = Math.floor(profit * CREW_CONFIG.BOSS_KICKBACK_RATE);
      }
    }
    const updatedMoney = player.money + (request.action === 'buy' ? -total : total - crewKickback);
    const updatedPlayer = await persistTrade(
      player,
      updatedInventory,
      updatedCostBasis,
      updatedMoney,
      crewKickback,
      crew?.bossId
    );

    const result: GoodsTradeResponse = {
      success: true,
      player: updatedPlayer,
      message: `${request.action === 'buy' ? 'Bought' : 'Sold'} ${request.quantity} ${good.name} for $${total.toLocaleString()}${crewKickback ? ` · $${crewKickback.toLocaleString()} kicked back to your boss` : ''}`,
      trade: {
        goodId: good.id,
        action: request.action,
        quantity: request.quantity,
        unitPrice,
        total,
        profit,
        crewKickback
      }
    };

    await logger.info('Goods trade completed', {
      requestId,
      operation: 'trade-goods',
      userId,
      goodId: good.id,
      action: request.action,
      quantity: request.quantity,
      city: player.city
    });

    return response(200, result);
  } catch (error) {
    if (
      error instanceof Error
      && (error.name === 'ConditionalCheckFailedException' || error.name === 'TransactionCanceledException')
    ) {
      return response(409, { success: false, error: 'Your market state changed. Please try again.' });
    }

    await logger.error('Goods trade failed', {
      requestId,
      operation: 'trade-goods',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return response(500, { success: false, error: 'Internal server error' });
  }
};

async function getPlayer(userId: string): Promise<Player | null> {
  const result = await docClient.send(new GetCommand({
    TableName: PLAYERS_TABLE,
    Key: { worldId: userId }
  }));
  return result.Item as Player || null;
}

async function getWorldId(event: APIGatewayProxyEvent): Promise<string> {
  const header = event.headers.Authorization || event.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new Error('Authentication required');
  const payload = jwt.verify(header.slice(7), await getJWTSecret()) as { worldId?: string };
  if (!payload.worldId) throw new Error('Invalid authentication token');
  return payload.worldId;
}

async function getCrew(crewId: string): Promise<Crew | null> {
  const result = await docClient.send(new GetCommand({
    TableName: CREWS_TABLE,
    Key: { crewId }
  }));
  return result.Item as Crew || null;
}

function getBlockedReason(player: Player): string | null {
  const now = Date.now();
  if (player.travelUntil && new Date(player.travelUntil).getTime() > now) {
    return 'You cannot trade while travelling';
  }
  if (player.jailUntil && new Date(player.jailUntil).getTime() > now) {
    return 'You cannot trade while in jail';
  }
  if (player.hospitalUntil && new Date(player.hospitalUntil).getTime() > now) {
    return 'You cannot trade while in the hospital';
  }
  return null;
}

function normalizeInventory(player: Player): GoodsInventory {
  const goods = (player as Player & { goods?: Partial<GoodsInventory> }).goods;
  return {
    booze: Math.max(0, Math.floor(goods?.booze ?? 0)),
    prozac: Math.max(0, Math.floor(goods?.prozac ?? 0)),
    weed: Math.max(0, Math.floor(goods?.weed ?? 0)),
    crystal: Math.max(0, Math.floor(goods?.crystal ?? 0)),
    fashion: Math.max(0, Math.floor(goods?.fashion ?? 0))
  };
}

function normalizeCostBasis(player: Player): GoodsInventory {
  const basis = player.goodsCostBasis;
  return {
    booze: Math.max(0, Math.floor(basis?.booze ?? 0)),
    prozac: Math.max(0, Math.floor(basis?.prozac ?? 0)),
    weed: Math.max(0, Math.floor(basis?.weed ?? 0)),
    crystal: Math.max(0, Math.floor(basis?.crystal ?? 0)),
    fashion: Math.max(0, Math.floor(basis?.fashion ?? 0))
  };
}

async function persistTrade(
  player: Player,
  goods: GoodsInventory,
  goodsCostBasis: GoodsInventory,
  money: number,
  crewKickback: number,
  bossId?: string
): Promise<Player> {
  const existingGoods = (player as Player & { goods?: Partial<GoodsInventory> }).goods;
  const existingBasis = player.goodsCostBasis;
  const lastActive = new Date().toISOString();
  const expressionAttributeValues: Record<string, unknown> = {
    ':money': money,
    ':goods': goods,
    ':basis': goodsCostBasis,
    ':lastActive': lastActive,
    ':expectedMoney': player.money,
    ':expectedCity': player.city
  };
  let goodsCondition = 'attribute_not_exists(#goods)';
  let basisCondition = 'attribute_not_exists(#basis)';

  if (existingGoods) {
    goodsCondition = '#goods = :expectedGoods';
    expressionAttributeValues[':expectedGoods'] = existingGoods;
  }
  if (existingBasis) {
    basisCondition = '#basis = :expectedBasis';
    expressionAttributeValues[':expectedBasis'] = existingBasis;
  }

  const playerUpdate = {
    TableName: PLAYERS_TABLE,
    Key: { worldId: player.worldId },
    UpdateExpression: 'SET #money = :money, #goods = :goods, #basis = :basis, #lastActive = :lastActive',
    ConditionExpression: `#city = :expectedCity AND #money = :expectedMoney AND ${goodsCondition} AND ${basisCondition}`,
    ExpressionAttributeNames: {
      '#money': 'money', '#goods': 'goods', '#basis': 'goodsCostBasis',
      '#city': 'city', '#lastActive': 'lastActive'
    },
    ExpressionAttributeValues: expressionAttributeValues
  };

  if (crewKickback > 0 && bossId) {
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        { Update: playerUpdate },
        {
          Update: {
            TableName: PLAYERS_TABLE,
            Key: { worldId: bossId },
            UpdateExpression: 'ADD #money :kickback',
            ConditionExpression: 'attribute_exists(worldId)',
            ExpressionAttributeNames: { '#money': 'money' },
            ExpressionAttributeValues: { ':kickback': crewKickback }
          }
        }
      ]
    }));
    return { ...player, money, goods, goodsCostBasis, lastActive };
  }

  const result = await docClient.send(new UpdateCommand({
    ...playerUpdate,
    ReturnValues: 'ALL_NEW'
  }));

  return result.Attributes as Player;
}
