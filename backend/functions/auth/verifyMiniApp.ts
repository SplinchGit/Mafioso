import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Player, WorldIdVerification } from '../../../shared/types';
import { GAME_CONFIG } from '../../../shared/constants';
import { getJWTSecret } from '../../shared/utils';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const WORLD_ID_TABLE = process.env.WORLD_ID_TABLE || 'mafioso-worldid';
const APP_ID = process.env.WORLD_APP_ID || 'app_bc75ea0f4623eb64e1814126df474de3';

interface MiniAppVerifyRequest {
  payload: ISuccessResult;
  action: string;
  signal?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('MiniApp verification request initiated', {
    requestId,
    operation: 'verify-miniapp',
    hasBody: !!event.body
  });

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

    const requestData: MiniAppVerifyRequest = JSON.parse(event.body);
    const { payload, action, signal } = requestData;

    // Get secrets from Secrets Manager
    const jwtSecret = await getJWTSecret();

    // Validate required fields
    if (!payload || !action) {
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
          error: 'Missing required verification payload or action'
        })
      };
    }

    // Verify the proof with World ID using MiniKit
    await logger.info('Attempting World ID verification', {
      requestId,
      appId: APP_ID,
      action,
      signal,
      payloadExists: !!payload,
      nullifierHash: payload?.nullifier_hash?.substring(0, 10) + '...'
    });

    const verifyRes = await verifyCloudProof(
      payload,
      APP_ID as `app_${string}`,
      action,
      signal
    ) as IVerifyResponse;

    await logger.info('World ID verification result', {
      requestId,
      success: verifyRes.success,
      details: verifyRes
    });

    if (!verifyRes.success) {
      await logger.error('World ID verification failed', {
        requestId,
        verificationResult: verifyRes,
        appId: APP_ID,
        action,
        signal
      });

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
          error: 'World ID verification failed',
          details: verifyRes
        })
      };
    }

    // Check if this World ID has been used before
    const existingVerification = await getWorldIdVerification(payload.nullifier_hash);
    
    let player: Player;
    
    if (existingVerification) {
      // Existing player - load their data
      player = await getPlayerByWorldId(existingVerification.worldId);
      if (!player) {
        throw new Error('Player data not found for existing World ID');
      }
    } else {
      // New player - create account
      const worldId = generateWorldId();
      const username = generateUsername();
      
      player = await createNewPlayer(worldId, username);
      
      // Store World ID verification
      await storeWorldIdVerification({
        worldId,
        nullifierHash: payload.nullifier_hash,
        proof: payload.proof,
        verified: true,
        timestamp: new Date().toISOString()
      });
    }

    // Update last active timestamp
    await updatePlayerLastActive(player.worldId);

    // Generate JWT token
    const token = jwt.sign(
      { 
        worldId: player.worldId,
        username: player.username 
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
        player,
        token
      })
    };

  } catch (error) {
    await logger.error('MiniApp verification failed', {
      requestId: event.requestContext.requestId,
      operation: 'verify-miniapp',
      error: error instanceof Error ? error.message : 'Unknown error',
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

async function getWorldIdVerification(nullifierHash: string): Promise<WorldIdVerification | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: WORLD_ID_TABLE,
      Key: { nullifierHash }
    }));
    
    return result.Item as WorldIdVerification || null;
  } catch (error) {
    logger.errorSync('Failed to get World ID verification from database', {
      operation: 'getWorldIdVerification',
      nullifierHash,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

async function getPlayerByWorldId(worldId: string): Promise<Player> {
  const result = await docClient.send(new GetCommand({
    TableName: PLAYERS_TABLE,
    Key: { worldId }
  }));
  
  if (!result.Item) {
    throw new Error('Player not found');
  }
  
  return result.Item as Player;
}

async function createNewPlayer(worldId: string, username: string): Promise<Player> {
  const now = new Date().toISOString();
  
  const newPlayer: Player = {
    walletAddress: '', // Empty for World ID only verification
    worldId,
    username,
    money: GAME_CONFIG.STARTING_MONEY,
    respect: GAME_CONFIG.STARTING_RESPECT,
    rank: 0,
    city: 0, // Start in London
    lastActive: now,
    createdAt: now,
    bullets: GAME_CONFIG.STARTING_BULLETS,
    kills: 0,
    deaths: 0,
    swissBank: GAME_CONFIG.STARTING_SWISS_BANK,
    cars: [],
    stats: {
      crimesCommitted: 0,
      crimesSuccessful: 0,
      crimesFailed: 0,
      timesJailed: 0,
      timesHospitalized: 0,
      totalMoneyEarned: 0,
      totalRespectEarned: 0,
      rankUps: 0
    }
  };

  await docClient.send(new PutCommand({
    TableName: PLAYERS_TABLE,
    Item: newPlayer
  }));

  return newPlayer;
}

async function storeWorldIdVerification(verification: {
  worldId: string;
  nullifierHash: string;
  proof: string;
  verified: boolean;
  timestamp: string;
}): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: WORLD_ID_TABLE,
    Item: {
      nullifierHash: verification.nullifierHash,
      worldId: verification.worldId,
      proof: verification.proof,
      verified: verification.verified,
      timestamp: verification.timestamp
    }
  }));
}

async function updatePlayerLastActive(_worldId: string): Promise<void> {
  // This would use UpdateCommand to update lastActive timestamp
  // Simplified for this example
}

function generateWorldId(): string {
  return `mafioso_${crypto.randomBytes(16).toString('hex')}`;
}

function generateUsername(): string {
  const adjectives = ['Silent', 'Shadow', 'Iron', 'Golden', 'Silver', 'Dark', 'Swift', 'Cold'];
  const nouns = ['Wolf', 'Eagle', 'Viper', 'Tiger', 'Falcon', 'Shark', 'Panther', 'Bear'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  
  return `${adjective}${noun}${number}`;
}