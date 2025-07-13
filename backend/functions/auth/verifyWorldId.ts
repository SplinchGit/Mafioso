import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
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

interface WorldIdVerifyRequest {
  nullifier_hash: string;
  merkle_root: string;
  proof: string;
  verification_level: 'orb' | 'device';
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('World ID verification request initiated', {
    requestId,
    operation: 'verify-worldid',
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

    const requestData: WorldIdVerifyRequest = JSON.parse(event.body);
    const { nullifier_hash, merkle_root, proof, verification_level } = requestData;

    // Get secrets from Secrets Manager
    const jwtSecret = await getJWTSecret();

    // Validate required fields
    if (!nullifier_hash || !merkle_root || !proof) {
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
          error: 'Missing required World ID verification fields'
        })
      };
    }

    // In production, verify the proof with World ID API
    // For now, we'll assume verification is successful
    const isProofValid = await verifyWorldIdProof({
      nullifier_hash,
      merkle_root,
      proof,
      verification_level
    });

    if (!isProofValid) {
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
          error: 'World ID verification failed'
        })
      };
    }

    // Check if this World ID has been used before
    const existingVerification = await getWorldIdVerification(nullifier_hash);
    
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
        nullifierHash: nullifier_hash,
        proof,
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
        data: {
          player,
          token
        }
      })
    };

  } catch (error) {
    await logger.error('World ID verification failed', {
      requestId: event.requestContext.requestId,
      operation: 'verify-worldid',
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

async function verifyWorldIdProof(_data: WorldIdVerifyRequest): Promise<boolean> {
  // In production, this would call the World ID API to verify the proof
  // For development, we'll return true
  
  // Example World ID verification call:
  // const response = await fetch('https://developer.worldcoin.org/api/v1/verify', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${process.env.WORLD_ID_API_KEY}`
  //   },
  //   body: JSON.stringify({
  //     nullifier_hash: data.nullifier_hash,
  //     merkle_root: data.merkle_root,
  //     proof: data.proof,
  //     verification_level: data.verification_level,
  //     action: 'mafioso-login',
  //     signal: ''
  //   })
  // });
  
  // return response.ok;
  
  return true; // For development
}

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
    nerve: GAME_CONFIG.STARTING_NERVE,
    rank: 0,
    city: 0, // Start in London
    lastActive: now,
    createdAt: now,
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