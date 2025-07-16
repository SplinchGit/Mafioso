import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Player, CarListing, CarMarketplaceResponse, PlayerCar } from '../../../shared/types';
import { CARS } from '../../../shared/constants';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const CAR_LISTINGS_TABLE = process.env.CAR_LISTINGS_TABLE || 'mafioso-car-listings';

interface BuyCarRequest {
  listingId: string;
  expectedPrice: number; // Price lock to prevent exploit
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Buy car request initiated', {
    requestId,
    operation: 'buy-car',
    hasBody: !!event.body
  });

  try {
    // Verify authentication
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Authentication required'
        })
      };
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid authentication token'
        })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Request body is required'
        })
      };
    }

    const { listingId, expectedPrice }: BuyCarRequest = JSON.parse(event.body);

    // Validate input
    if (!listingId || typeof expectedPrice !== 'number') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Valid listing ID and expected price are required'
        })
      };
    }

    // Get buyer and listing data
    const [buyer, listing] = await Promise.all([
      getPlayer(decoded.worldId),
      getListing(listingId)
    ]);

    if (!buyer) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Player not found'
        })
      };
    }

    if (!listing) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Listing not found'
        })
      };
    }

    // Validate purchase
    const validationResult = validateCarPurchase(buyer, listing, expectedPrice);
    if (!validationResult.canPurchase) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: validationResult.reason
        })
      };
    }

    // Get seller data
    const seller = await getPlayer(listing.sellerId);
    if (!seller) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Seller not found'
        })
      };
    }

    // Execute purchase transaction
    const { updatedBuyer } = await executePurchase(buyer, seller, listing);

    const carName = CARS[listing.carType]?.name || 'Unknown Car';
    const response: CarMarketplaceResponse = {
      success: true,
      player: updatedBuyer,
      message: `Successfully purchased ${carName} for $${listing.price.toLocaleString()}!`
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    await logger.error('Buy car error', {
      requestId,
      operation: 'buy-car',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

async function getPlayer(worldId: string): Promise<Player | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: PLAYERS_TABLE,
      Key: { worldId }
    }));
    
    return result.Item as Player || null;
  } catch (error) {
    logger.errorSync('Error getting player', {
      operation: 'get-player',
      worldId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function getListing(listingId: string): Promise<CarListing | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: CAR_LISTINGS_TABLE,
      Key: { id: listingId }
    }));
    
    return result.Item as CarListing || null;
  } catch (error) {
    logger.errorSync('Error getting listing', {
      operation: 'get-listing',
      listingId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function validateCarPurchase(buyer: Player, listing: CarListing, expectedPrice: number): { canPurchase: boolean; reason?: string } {
  // Check if listing is active
  if (!listing.active) {
    return { canPurchase: false, reason: 'This listing is no longer available' };
  }

  // Price lock check - prevent bait and switch
  if (listing.price !== expectedPrice) {
    return { canPurchase: false, reason: 'Price has changed. Please refresh and try again.' };
  }

  // Check if buyer has enough money
  if (buyer.money < listing.price) {
    return { canPurchase: false, reason: `Insufficient funds. You need $${listing.price.toLocaleString()}` };
  }

  // Check if buyer is trying to buy their own car
  if (buyer.worldId === listing.sellerId) {
    return { canPurchase: false, reason: 'You cannot buy your own car' };
  }

  // Check if player is in jail or hospital
  if (buyer.jailUntil && new Date(buyer.jailUntil) > new Date()) {
    return { canPurchase: false, reason: 'You cannot purchase cars while in jail' };
  }
  
  if (buyer.hospitalUntil && new Date(buyer.hospitalUntil) > new Date()) {
    return { canPurchase: false, reason: 'You cannot purchase cars while in the hospital' };
  }

  return { canPurchase: true };
}

async function executePurchase(buyer: Player, seller: Player, listing: CarListing): Promise<{
  updatedBuyer: Player;
  updatedSeller: Player;
}> {
  const now = new Date().toISOString();

  // Create new car for buyer (keeping same damage)
  const newCarId = crypto.randomUUID();
  const newCar: PlayerCar = {
    id: newCarId,
    carType: listing.carType,
    damage: listing.damage,
    source: 'bought'
  };

  // Remove car from seller's inventory
  const updatedSellerCars = seller.cars.filter(car => car.id !== listing.carId);
  
  // Add car to buyer's inventory
  const updatedBuyerCars = [...buyer.cars, newCar];

  // Update active car if seller's active car was sold
  let updatedSellerActiveCar = seller.activeCar;
  if (seller.activeCar === listing.carId) {
    updatedSellerActiveCar = updatedSellerCars.length > 0 ? updatedSellerCars[0].id : undefined;
  }

  // Execute transaction using DynamoDB transactions for atomicity
  await docClient.send(new TransactWriteCommand({
    TransactItems: [
      // Update buyer
      {
        Update: {
          TableName: PLAYERS_TABLE,
          Key: { worldId: buyer.worldId },
          UpdateExpression: 'SET money = :money, cars = :cars, lastActive = :lastActive',
          ExpressionAttributeValues: {
            ':money': buyer.money - listing.price,
            ':cars': updatedBuyerCars,
            ':lastActive': now
          }
        }
      },
      // Update seller
      {
        Update: {
          TableName: PLAYERS_TABLE,
          Key: { worldId: seller.worldId },
          UpdateExpression: 'SET money = :money, cars = :cars, activeCar = :activeCar, lastActive = :lastActive',
          ExpressionAttributeValues: {
            ':money': seller.money + listing.price,
            ':cars': updatedSellerCars,
            ':activeCar': updatedSellerActiveCar,
            ':lastActive': now
          }
        }
      },
      // Deactivate listing
      {
        Update: {
          TableName: CAR_LISTINGS_TABLE,
          Key: { id: listing.id },
          UpdateExpression: 'SET active = :active',
          ExpressionAttributeValues: {
            ':active': false
          }
        }
      }
    ]
  }));

  const updatedBuyer: Player = {
    ...buyer,
    money: buyer.money - listing.price,
    cars: updatedBuyerCars,
    lastActive: now
  };

  const updatedSeller: Player = {
    ...seller,
    money: seller.money + listing.price,
    cars: updatedSellerCars,
    activeCar: updatedSellerActiveCar,
    lastActive: now
  };

  return { updatedBuyer, updatedSeller };
}