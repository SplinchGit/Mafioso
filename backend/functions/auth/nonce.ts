import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const NONCES_TABLE = process.env.NONCES_TABLE || 'mafioso-nonces';

export const handler = async (
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Nonce generation request');

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
    console.error('Nonce generation error:', error);
    
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