import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Player, CarListing, CarMarketplaceResponse, PlayerCar } from '../../../shared/types';
import { CARS } from '../../../shared/constants';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const CAR_LISTINGS_TABLE = process.env.CAR_LISTINGS_TABLE || 'mafioso-car-listings';
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Authentication required' }) };
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { worldId?: string };
    if (!decoded.worldId || !event.body) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid request' }) };

    const { listingId, expectedPrice } = JSON.parse(event.body) as { listingId: string; expectedPrice: number };
    if (!listingId || !Number.isInteger(expectedPrice) || expectedPrice < 0) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Valid listing ID and expected price are required' }) };

    const [buyerResult, listingResult] = await Promise.all([
      docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: decoded.worldId } })),
      docClient.send(new GetCommand({ TableName: CAR_LISTINGS_TABLE, Key: { id: listingId } })),
    ]);
    const buyer = buyerResult.Item as Player | undefined;
    const listing = listingResult.Item as CarListing | undefined;
    if (!buyer) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Player not found' }) };
    if (!listing) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Listing not found' }) };
    if (!listing.active) return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'This listing is no longer available' }) };
    if (listing.price !== expectedPrice) return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Price has changed. Please refresh and try again.' }) };
    if (buyer.worldId === listing.sellerId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot buy your own car' }) };
    if (buyer.jailUntil && new Date(buyer.jailUntil) > new Date()) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot purchase cars while in jail' }) };
    if (buyer.hospitalUntil && new Date(buyer.hospitalUntil) > new Date()) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'You cannot purchase cars while in the hospital' }) };
    if (buyer.money < listing.price) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Insufficient funds. You need $${listing.price.toLocaleString()}` }) };

    const sellerResult = await docClient.send(new GetCommand({ TableName: PLAYERS_TABLE, Key: { worldId: listing.sellerId } }));
    const seller = sellerResult.Item as Player | undefined;
    if (!seller) return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Seller not found' }) };
    if (!seller.cars.some(car => car.id === listing.carId)) return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Seller no longer owns this car' }) };

    const now = new Date().toISOString();
    const newCar: PlayerCar = { id: crypto.randomUUID(), carType: listing.carType, damage: listing.damage, source: 'bought' };
    const buyerCars = [...buyer.cars, newCar];
    const sellerCars = seller.cars.filter(car => car.id !== listing.carId);
    const soldActiveCar = seller.activeCar === listing.carId;
    const nextActiveCar = soldActiveCar ? sellerCars[0]?.id : seller.activeCar;

    const sellerUpdate = nextActiveCar
      ? {
          UpdateExpression: 'ADD money :credit SET cars = :cars, activeCar = :activeCar, lastActive = :now',
          ExpressionAttributeValues: { ':credit': listing.price, ':cars': sellerCars, ':activeCar': nextActiveCar, ':now': now, ':expectedCars': seller.cars },
        }
      : {
          UpdateExpression: 'ADD money :credit SET cars = :cars, lastActive = :now REMOVE activeCar',
          ExpressionAttributeValues: { ':credit': listing.price, ':cars': sellerCars, ':now': now, ':expectedCars': seller.cars },
        };

    try {
      await docClient.send(new TransactWriteCommand({ TransactItems: [
        { Update: {
          TableName: PLAYERS_TABLE,
          Key: { worldId: buyer.worldId },
          UpdateExpression: 'ADD money :debit SET cars = :cars, lastActive = :now',
          ConditionExpression: 'money >= :price',
          ExpressionAttributeValues: { ':debit': -listing.price, ':price': listing.price, ':cars': buyerCars, ':now': now },
        }},
        { Update: {
          TableName: PLAYERS_TABLE,
          Key: { worldId: seller.worldId },
          ...sellerUpdate,
          ConditionExpression: 'cars = :expectedCars',
        }},
        { Update: {
          TableName: CAR_LISTINGS_TABLE,
          Key: { id: listing.id },
          UpdateExpression: 'SET active = :false',
          ConditionExpression: 'active = :true AND price = :price AND sellerId = :sellerId',
          ExpressionAttributeValues: { ':false': false, ':true': true, ':price': listing.price, ':sellerId': listing.sellerId },
        }},
      ] }));
    } catch (error: any) {
      if (error?.name === 'TransactionCanceledException') return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: 'Purchase could not settle. Check your funds and refresh the listing.' }) };
      throw error;
    }

    const updatedBuyer: Player = { ...buyer, money: buyer.money - listing.price, cars: buyerCars, lastActive: now };
    const response: CarMarketplaceResponse = { success: true, player: updatedBuyer, message: `Successfully purchased ${CARS[listing.carType]?.name || 'car'} for $${listing.price.toLocaleString()}!` };
    return { statusCode: 200, headers, body: JSON.stringify(response) };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid authentication token' }) };
    console.error('buyCar failed', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
