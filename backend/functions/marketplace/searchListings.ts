import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { CarListing, CarMarketplaceResponse } from '../../../shared/types';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const CAR_LISTINGS_TABLE = process.env.CAR_LISTINGS_TABLE || 'mafioso-car-listings';

interface SearchListingsRequest {
  carType?: number;     // Filter by car type (0-10)
  sortBy?: 'price_asc' | 'price_desc' | 'damage_asc' | 'damage_desc';
  limit?: number;       // Pagination limit
  offset?: number;      // Pagination offset
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Search listings request initiated', {
    requestId,
    operation: 'search-listings'
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
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Authentication required'
        })
      };
    }

    const token = authHeader.substring(7);
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid authentication token'
        })
      };
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const searchParams: SearchListingsRequest = {
      carType: queryParams.carType ? parseInt(queryParams.carType) : undefined,
      sortBy: queryParams.sortBy as any || 'price_asc',
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
      offset: queryParams.offset ? parseInt(queryParams.offset) : 0
    };

    // Get active listings
    const listings = await getActiveListings(searchParams);

    const response: CarMarketplaceResponse = {
      success: true,
      listings,
      message: `Found ${listings.length} listings`
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    await logger.error('Search listings error', {
      requestId,
      operation: 'search-listings',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

async function getActiveListings(params: SearchListingsRequest): Promise<CarListing[]> {
  try {
    // Build filter expression
    let filterExpression = 'active = :active';
    const expressionAttributeValues: any = {
      ':active': true
    };

    // Add car type filter if specified
    if (params.carType !== undefined) {
      filterExpression += ' AND carType = :carType';
      expressionAttributeValues[':carType'] = params.carType;
    }

    const result = await docClient.send(new ScanCommand({
      TableName: CAR_LISTINGS_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    let listings = (result.Items as CarListing[]) || [];

    // Sort listings
    listings = sortListings(listings, params.sortBy || 'price_asc');

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    listings = listings.slice(offset, offset + limit);

    return listings;
  } catch (error) {
    logger.errorSync('Error getting active listings', {
      operation: 'get-active-listings',
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

function sortListings(listings: CarListing[], sortBy: string): CarListing[] {
  switch (sortBy) {
    case 'price_asc':
      return listings.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return listings.sort((a, b) => b.price - a.price);
    case 'damage_asc':
      return listings.sort((a, b) => a.damage - b.damage);
    case 'damage_desc':
      return listings.sort((a, b) => b.damage - a.damage);
    default:
      return listings.sort((a, b) => a.price - b.price);
  }
}