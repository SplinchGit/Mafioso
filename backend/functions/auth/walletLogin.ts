import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verifySiweMessage, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player } from '../../../shared/types';
import { getJWTSecret } from '../../shared/utils';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const NONCES_TABLE = process.env.NONCES_TABLE || 'mafioso-nonces';

interface WalletLoginRequest {
  payload: MiniAppWalletAuthSuccessPayload;
  nonce: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Wallet login request:', event.body);

  try {
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

    const { payload, nonce }: WalletLoginRequest = JSON.parse(event.body);

    // Verify the nonce exists and hasn't been used
    const nonceRecord = await getNonce(nonce);
    if (!nonceRecord || nonceRecord.used) {
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
          error: 'Invalid or expired nonce'
        })
      };
    }

    // Verify the SIWE message
    const isValidSignature = await verifySiweMessage(payload, nonce);
    
    if (!isValidSignature) {
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
          error: 'Invalid signature'
        })
      };
    }

    // Mark nonce as used
    await markNonceAsUsed(nonce);

    // Check if wallet address has existing account
    const existingPlayer = await getPlayerByWallet(payload.address);
    
    if (existingPlayer) {
      // Existing account - update last active and return login data
      await updatePlayerLastActive(payload.address);
      
      const jwtSecret = await getJWTSecret();
      const token = jwt.sign(
        { 
          walletAddress: existingPlayer.walletAddress,
          username: existingPlayer.username 
        },
        jwtSecret,
        { expiresIn: '30d' }
      );

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          hasAccount: true,
          player: existingPlayer,
          token
        })
      };
    } else {
      // New wallet - needs account creation
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          hasAccount: false
        })
      };
    }

  } catch (error) {
    console.error('Wallet login error:', error);
    
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

async function getNonce(nonce: string): Promise<any> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: NONCES_TABLE,
      Key: { nonce }
    }));
    
    return result.Item || null;
  } catch (error) {
    console.error('Error getting nonce:', error);
    return null;
  }
}

async function markNonceAsUsed(nonce: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: NONCES_TABLE,
      Key: { nonce },
      UpdateExpression: 'SET #used = :used',
      ExpressionAttributeNames: {
        '#used': 'used'
      },
      ExpressionAttributeValues: {
        ':used': true
      }
    }));
  } catch (error) {
    console.error('Error marking nonce as used:', error);
  }
}

async function getPlayerByWallet(walletAddress: string): Promise<Player | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: PLAYERS_TABLE,
      Key: { walletAddress }
    }));
    
    return result.Item as Player || null;
  } catch (error) {
    console.error('Error getting player by wallet:', error);
    return null;
  }
}

async function updatePlayerLastActive(walletAddress: string): Promise<void> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: PLAYERS_TABLE,
      Key: { walletAddress },
      UpdateExpression: 'SET lastActive = :lastActive',
      ExpressionAttributeValues: {
        ':lastActive': new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error('Error updating last active:', error);
  }
}