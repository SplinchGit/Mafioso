import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomBytes, randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { CREW_CONFIG } from '../../../shared/constants';
import { Crew, CrewMemberSummary, CrewStatusResponse, Player } from '../../../shared/types';
import { getJWTSecret } from '../../shared/utils';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const CREWS_TABLE = process.env.CREWS_TABLE || 'mafioso-crews';
const headers = {
  'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

type CrewAction = 'create' | 'join' | 'leave' | 'disband' | 'buy-gabbagool';
interface CrewRequest { action: CrewAction; name?: string; crewId?: string; joinCode?: string; }
const response = (statusCode: number, body: object): APIGatewayProxyResult => ({ statusCode, headers, body: JSON.stringify(body) });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const player = await getPlayer(await getWorldId(event));
    if (!player) return response(404, { success: false, error: 'Player not found' });
    if (event.httpMethod === 'GET') return response(200, await buildStatus(player));
    if (!event.body) return response(400, { success: false, error: 'Request body is required' });
    const request = JSON.parse(event.body) as CrewRequest;
    let updatedPlayer: Player;
    switch (request.action) {
      case 'create': updatedPlayer = await createCrew(player, request.name); break;
      case 'join': updatedPlayer = await joinCrew(player, request.crewId, request.joinCode); break;
      case 'leave': updatedPlayer = await leaveCrew(player); break;
      case 'disband': updatedPlayer = await disbandCrew(player); break;
      case 'buy-gabbagool': updatedPlayer = await buyGabbagool(player); break;
      default: return response(400, { success: false, error: 'Unknown crew action' });
    }
    return response(200, await buildStatus(updatedPlayer));
  } catch (error) {
    const conflict = error instanceof Error && error.name === 'TransactionCanceledException';
    return response(conflict ? 409 : 400, {
      success: false,
      error: conflict ? 'Crew state changed. Please refresh and try again.' : error instanceof Error ? error.message : 'Crew action failed'
    });
  }
};

async function getPlayer(userId: string): Promise<Player | null> {
  const result = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: userId } }));
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
  const result = await docClient.send(new GetCommand({ TableName: CREWS_TABLE, Key: { crewId } }));
  return result.Item as Crew || null;
}

async function buildStatus(player: Player): Promise<CrewStatusResponse> {
  if (!player.crewId) return { success: true, crew: null, members: [], gabbagoolActive: false, player };
  const crew = await getCrew(player.crewId);
  if (!crew) return { success: true, crew: null, members: [], gabbagoolActive: false, player };
  const result = await docClient.send(new BatchGetCommand({
    RequestItems: { [PLAYERS_TABLE]: { Keys: crew.memberIds.map((worldId) => ({ worldId })) } }
  }));
  const rows = (result.Responses?.[PLAYERS_TABLE] || []) as Player[];
  const members: CrewMemberSummary[] = crew.memberIds.map((userId) => {
    const row = rows.find((candidate) => candidate.worldId === userId);
    return { userId, username: row?.username || 'Unknown member', role: userId === crew.bossId ? 'boss' : 'member', rank: row?.rank ?? 0 };
  });
  return {
    success: true,
    crew: player.worldId === crew.bossId ? crew : { ...crew, joinCode: '' },
    members,
    gabbagoolActive: Boolean(crew.gabbagoolActiveUntil && Date.parse(crew.gabbagoolActiveUntil) > Date.now()),
    player
  };
}

async function createCrew(player: Player, requestedName?: string): Promise<Player> {
  if (player.crewId) throw new Error('You are already in a crew');
  const name = String(requestedName || '').trim();
  if (!/^[a-zA-Z0-9 _'-]{3,24}$/.test(name)) throw new Error('Crew name must be 3-24 valid characters');
  const crewId = randomUUID(), now = new Date().toISOString();
  const crew: Crew = { crewId, name, bossId: player.worldId, joinCode: randomBytes(3).toString('hex').toUpperCase(), memberIds: [player.worldId], createdAt: now };
  await docClient.send(new TransactWriteCommand({ TransactItems: [
    { Put: { TableName: CREWS_TABLE, Item: crew, ConditionExpression: 'attribute_not_exists(crewId)' } },
    { Update: { TableName: PLAYERS_TABLE, Key: { worldId: player.worldId }, UpdateExpression: 'SET crewId = :id, crewRole = :role', ConditionExpression: 'attribute_not_exists(crewId)', ExpressionAttributeValues: { ':id': crewId, ':role': 'boss' } } }
  ] }));
  return { ...player, crewId, crewRole: 'boss' };
}

async function joinCrew(player: Player, requestedCrewId?: string, requestedCode?: string): Promise<Player> {
  if (player.crewId) throw new Error('You are already in a crew');
  const crewId = String(requestedCrewId || '').trim(), code = String(requestedCode || '').trim().toUpperCase();
  const crew = await getCrew(crewId);
  if (!crew || crew.joinCode !== code) throw new Error('Crew ID or join code is incorrect');
  if (crew.memberIds.length >= CREW_CONFIG.MAX_MEMBERS) throw new Error('This crew is full');
  const next = [...crew.memberIds, player.worldId];
  await docClient.send(new TransactWriteCommand({ TransactItems: [
    { Update: { TableName: CREWS_TABLE, Key: { crewId }, UpdateExpression: 'SET memberIds = :next', ConditionExpression: 'memberIds = :current', ExpressionAttributeValues: { ':next': next, ':current': crew.memberIds } } },
    { Update: { TableName: PLAYERS_TABLE, Key: { worldId: player.worldId }, UpdateExpression: 'SET crewId = :id, crewRole = :role', ConditionExpression: 'attribute_not_exists(crewId)', ExpressionAttributeValues: { ':id': crewId, ':role': 'member' } } }
  ] }));
  return { ...player, crewId, crewRole: 'member' };
}

async function leaveCrew(player: Player): Promise<Player> {
  if (!player.crewId) throw new Error('You are not in a crew');
  if (player.crewRole === 'boss') throw new Error('The boss must disband the crew instead');
  const crew = await getCrew(player.crewId); if (!crew) throw new Error('Crew not found');
  const next = crew.memberIds.filter((id) => id !== player.worldId);
  await docClient.send(new TransactWriteCommand({ TransactItems: [
    { Update: { TableName: CREWS_TABLE, Key: { crewId: crew.crewId }, UpdateExpression: 'SET memberIds = :next', ConditionExpression: 'memberIds = :current', ExpressionAttributeValues: { ':next': next, ':current': crew.memberIds } } },
    { Update: { TableName: PLAYERS_TABLE, Key: { worldId: player.worldId }, UpdateExpression: 'REMOVE crewId, crewRole', ConditionExpression: 'crewId = :id', ExpressionAttributeValues: { ':id': crew.crewId } } }
  ] }));
  const updated = { ...player }; delete updated.crewId; delete updated.crewRole; return updated;
}

async function disbandCrew(player: Player): Promise<Player> {
  if (!player.crewId || player.crewRole !== 'boss') throw new Error('Only a crew boss can disband a crew');
  const crew = await getCrew(player.crewId); if (!crew || crew.bossId !== player.worldId) throw new Error('Crew not found');
  await docClient.send(new TransactWriteCommand({ TransactItems: [
    { Delete: { TableName: CREWS_TABLE, Key: { crewId: crew.crewId }, ConditionExpression: 'bossId = :boss', ExpressionAttributeValues: { ':boss': player.worldId } } },
    ...crew.memberIds.map((worldId) => ({ Update: { TableName: PLAYERS_TABLE, Key: { worldId }, UpdateExpression: 'REMOVE crewId, crewRole', ConditionExpression: 'crewId = :id', ExpressionAttributeValues: { ':id': crew.crewId } } }))
  ] }));
  const updated = { ...player }; delete updated.crewId; delete updated.crewRole; return updated;
}

async function buyGabbagool(player: Player): Promise<Player> {
  if (!player.crewId || player.crewRole !== 'boss') throw new Error('Only a crew boss can buy Gabbagool');
  if (player.money < CREW_CONFIG.GABBAGOOL_PRICE) throw new Error(`You need $${CREW_CONFIG.GABBAGOOL_PRICE.toLocaleString()}`);
  const crew = await getCrew(player.crewId); if (!crew || crew.bossId !== player.worldId) throw new Error('Crew not found');
  const now = Date.now(), last = crew.gabbagoolLastPurchasedAt ? Date.parse(crew.gabbagoolLastPurchasedAt) : 0;
  if (now - last < CREW_CONFIG.GABBAGOOL_COOLDOWN_SECONDS * 1000) throw new Error('Gabbagool can only be purchased once every 24 hours');
  const purchasedAt = new Date(now).toISOString(), activeUntil = new Date(now + CREW_CONFIG.GABBAGOOL_DURATION_SECONDS * 1000).toISOString();
  const priorPurchaseCondition = crew.gabbagoolLastPurchasedAt ? 'gabbagoolLastPurchasedAt = :last' : 'attribute_not_exists(gabbagoolLastPurchasedAt)';
  const condition = `bossId = :boss AND ${priorPurchaseCondition}`;
  const crewValues: Record<string, unknown> = { ':active': activeUntil, ':purchased': purchasedAt, ':boss': player.worldId };
  if (crew.gabbagoolLastPurchasedAt) crewValues[':last'] = crew.gabbagoolLastPurchasedAt;
  await docClient.send(new TransactWriteCommand({ TransactItems: [
    { Update: { TableName: CREWS_TABLE, Key: { crewId: crew.crewId }, UpdateExpression: 'SET gabbagoolActiveUntil = :active, gabbagoolLastPurchasedAt = :purchased', ConditionExpression: condition, ExpressionAttributeValues: crewValues } },
    { Update: { TableName: PLAYERS_TABLE, Key: { worldId: player.worldId }, UpdateExpression: 'SET money = money - :price', ConditionExpression: 'money >= :price', ExpressionAttributeValues: { ':price': CREW_CONFIG.GABBAGOOL_PRICE } } }
  ] }));
  return { ...player, money: player.money - CREW_CONFIG.GABBAGOOL_PRICE };
}
