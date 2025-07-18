import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Check username request initiated', {
    requestId,
    operation: 'check-username',
    username: event.queryStringParameters?.username
  });

  try {
    const username = event.queryStringParameters?.username;

    if (!username) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Username parameter is required'
        })
      };
    }

    // Validate username format
    if (!isValidUsername(username)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid username format'
        })
      };
    }

    // Check if username exists
    const exists = await checkUsernameExists(username);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        available: !exists
      })
    };

  } catch (error) {
    await logger.error('Check username error', {
      requestId,
      operation: 'check-username',
      username: event.queryStringParameters?.username,
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

function isValidUsername(username: string): boolean {
  // 3-20 characters, alphanumeric + underscore only
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    // Query the GSI for username to check if it exists
    const result = await docClient.send(new QueryCommand({
      TableName: PLAYERS_TABLE,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username
      },
      Limit: 1
    }));
    
    return !!(result.Items && result.Items.length > 0);
  } catch (error) {
    logger.errorSync('Error checking username', {
      operation: 'check-username-exists',
      username,
      error: error instanceof Error ? error.message : String(error)
    });
    return true; // Assume taken on error to be safe
  }
}