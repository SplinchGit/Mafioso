import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { CITIES, GAME_CONFIG, CARS } from '../../../shared/constants';

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

    const { cityId } = JSON.parse(event.body) as { cityId: number };
    if (!Number.isInteger(cityId) || cityId < 0 || cityId >= CITIES.length) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid city ID' }) };

    const result = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: decoded.worldId } }));
    const player = result.Item as Player | undefined;
    if (!player) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };

    const reason = validateTravel(player, cityId);
    if (reason) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: reason }) };

    const travelCost = GAME_CONFIG.TRAVEL_COST_BASE;
    const travelTimeSeconds = calculateTravelTime(player);
    const updatedCars = player.cars.map(car => car.id === player.activeCar ? { ...car, damage: Math.min(100, car.damage + GAME_CONFIG.CAR_DAMAGE_PER_TRAVEL) } : car);
    const now = new Date().toISOString();
    const travelUntil = new Date(Date.now() + travelTimeSeconds * 1000).toISOString();

    let update;
    try {
      update = await docClient.send(new UpdateCommand({
        TableName: PLAYERS_TABLE,
        Key: { worldId: player.worldId },
        UpdateExpression: 'ADD money :debit SET city = :city, cars = :cars, travelUntil = :travelUntil, lastActive = :now',
        ConditionExpression: 'money >= :cost AND city = :expectedCity AND cars = :expectedCars AND (attribute_not_exists(travelUntil) OR travelUntil <= :now)',
        ExpressionAttributeValues: { ':debit': -travelCost, ':cost': travelCost, ':city': cityId, ':expectedCity': player.city, ':cars': updatedCars, ':expectedCars': player.cars, ':travelUntil': travelUntil, ':now': now },
        ReturnValues: 'ALL_NEW',
      }));
    } catch (error: any) {
      if (error?.name === 'ConditionalCheckFailedException') return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Insufficient funds. Your balance changed before travel completed.' }) };
      throw error;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { player: update.Attributes as Player, travelTimeSeconds, message: `Journey to ${CITIES[cityId].name} started. Operations unlock in ${Math.ceil(travelTimeSeconds / 60)} minutes.` } }) };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    console.error('travel failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};

function validateTravel(player: Player, cityId: number): string | null {
  if (player.travelUntil && new Date(player.travelUntil) > new Date()) return 'You are already travelling';
  if (player.jailUntil && new Date(player.jailUntil) > new Date()) return 'You cannot travel while in jail';
  if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) return 'You cannot travel while in the hospital';
  if (player.city === cityId) return 'You are already in this city';
  const cost = GAME_CONFIG.TRAVEL_COST_BASE;
  if (player.money < cost) return `You need $${cost.toLocaleString()} to travel`;
  if (!player.activeCar || player.cars.length === 0) return 'You need a car to travel between cities';
  const activeCar = player.cars.find(car => car.id === player.activeCar);
  if (!activeCar) return 'Your active car was not found';
  if (activeCar.damage >= 100) return 'Your car is too damaged to travel. Repair or get a new car.';
  return null;
}

function calculateTravelTime(player: Player): number {
  const activeCar = player.cars.find(car => car.id === player.activeCar);
  if (!activeCar) return GAME_CONFIG.TRAVEL_TIME;
  const carData = CARS[activeCar.carType];
  if (!carData) return GAME_CONFIG.TRAVEL_TIME;
  return carData.travelTimeSeconds;
}
