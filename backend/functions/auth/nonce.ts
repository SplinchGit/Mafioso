import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const NONCES_TABLE = process.env.NONCES_TABLE || 'mafioso-nonces';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  console.log('Nonce function started', { requestId, timestamp: new Date().toISOString() });
  console.log('Nonce generation request', {
    requestId,
    operation: 'generate-nonce'
  });

  try {
    // Generate a cryptographically secure nonce (min 8 alphanumeric chars)
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + (5 * 60); // 5 minutes from now

    // Store nonce in DynamoDB with TTL
    await docClient.send(new PutCommand({
      TableName: NONCES_TABLE,
      Item: {
        nonce,
        createdAt: new Date().toISOString(),
        expiresAt,
        used: false
      }
    }));

    console.log('Nonce generated successfully', { requestId, nonce });
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
        nonce
      })
    };

  } catch (error) {
    console.error('Nonce generation error', {
      requestId,
      operation: 'generate-nonce',
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
        error: 'Failed to generate nonce'
      })
    };
  }
};