import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import { Player, CrimeResult, CrimeAttempt, PlayerCooldown } from '../../../shared/types';
import { CRIMES, RANKS, CRIME_OUTCOMES, GAME_CONFIG } from '../../../shared/constants';
import logger from '../../shared/logger';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const COOLDOWNS_TABLE = process.env.COOLDOWNS_TABLE || 'mafioso-cooldowns';
const CRIME_HISTORY_TABLE = process.env.CRIME_HISTORY_TABLE || 'mafioso-crime-history';

interface CommitCrimeRequest {
  crimeId: number;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;
  await logger.info('Commit crime request initiated', {
    requestId,
    operation: 'commit-crime',
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

    const { crimeId }: CommitCrimeRequest = JSON.parse(event.body);

    // Validate crime ID
    if (typeof crimeId !== 'number' || crimeId < 0 || crimeId >= CRIMES.length) {
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
          error: 'Invalid crime ID'
        })
      };
    }

    // Get player data
    const player = await getPlayer(decoded.worldId);
    if (!player) {
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

    const crime = CRIMES[crimeId];

    // Validate player can commit this crime
    const validationResult = validateCrimeAttempt(player, crime);
    if (!validationResult.canCommit) {
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

    // Check cooldown
    const cooldownCheck = await checkCrimeCooldown(player.worldId, crimeId);
    if (!cooldownCheck.canCommit) {
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
          error: `Crime is on cooldown. Try again in ${Math.ceil(cooldownCheck.timeRemaining / 1000)} seconds.`
        })
      };
    }

    // Commit the crime
    const crimeResult = calculateCrimeResult(player, crime);
    const updatedPlayer = await processCrimeResult(player, crime, crimeResult);

    // Set cooldown
    await setCrimeCooldown(player.worldId, crimeId, crime.cooldown);

    // Log crime attempt
    await logCrimeAttempt({
      playerId: player.worldId,
      crimeId,
      timestamp: new Date().toISOString(),
      result: crimeResult
    });

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
          result: crimeResult,
          player: updatedPlayer,
          cooldownUntil: new Date(Date.now() + crime.cooldown * 1000).toISOString()
        }
      })
    };

  } catch (error) {
    await logger.error('Commit crime error', {
      requestId,
      operation: 'commit-crime',
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

function validateCrimeAttempt(player: Player, crime: typeof CRIMES[number]): { canCommit: boolean; reason?: string } {
  // Check if player is in jail or hospital
  if (player.jailUntil && new Date(player.jailUntil) > new Date()) {
    return { canCommit: false, reason: 'You are currently in jail' };
  }
  
  if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) {
    return { canCommit: false, reason: 'You are currently in the hospital' };
  }

  // Check rank requirement
  if (player.rank < crime.requiredRank) {
    const requiredRank = RANKS[crime.requiredRank];
    return { canCommit: false, reason: `Requires ${requiredRank.name} rank` };
  }


  return { canCommit: true };
}

async function checkCrimeCooldown(playerId: string, crimeId: number): Promise<{ canCommit: boolean; timeRemaining: number }> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: COOLDOWNS_TABLE,
      Key: { 
        playerId,
        crimeId: crimeId.toString()
      }
    }));

    if (!result.Item) {
      return { canCommit: true, timeRemaining: 0 };
    }

    const cooldown = result.Item as PlayerCooldown;
    const expiresAt = new Date(cooldown.expiresAt);
    const now = new Date();

    if (expiresAt <= now) {
      return { canCommit: true, timeRemaining: 0 };
    }

    return { 
      canCommit: false, 
      timeRemaining: expiresAt.getTime() - now.getTime() 
    };
  } catch (error) {
    logger.errorSync('Error checking cooldown', {
      operation: 'check-cooldown',
      playerId,
      crimeId,
      error: error instanceof Error ? error.message : String(error)
    });
    return { canCommit: true, timeRemaining: 0 };
  }
}

function calculateCrimeResult(player: Player, crime: typeof CRIMES[number]): CrimeResult {
  // Use fixed success rate from crime definition
  const roll = Math.random() * 100;
  const isSuccess = roll < crime.baseSuccess;

  if (isSuccess) {
    // Check if this is Grand Theft Auto (special car reward)
    if (crime.name === "Grand Theft Auto") {
      // Award random car instead of money
      const CARS = [
        { id: 0, name: "Fiat 500" },
        { id: 1, name: "Ford Focus" },
        { id: 2, name: "Honda Civic" },
        { id: 3, name: "BMW 3 Series" },
        { id: 4, name: "Audi A4" },
        { id: 5, name: "Mercedes C-Class" },
        { id: 6, name: "Porsche 911" },
        { id: 7, name: "Ferrari 458" },
        { id: 8, name: "Lamborghini Huracán" },
        { id: 9, name: "Bugatti Veyron" },
        { id: 10, name: "Ferrari LaFerrari" }
      ];
      const randomCar = CARS[Math.floor(Math.random() * CARS.length)];
      
      return {
        success: true,
        outcome: CRIME_OUTCOMES.SUCCESS,
        respectGained: crime.baseRespect,
        message: `Successfully stole a ${randomCar.name}! It's now in your garage.`,
        carAwarded: randomCar.id
      };
    } else {
      // Successful crime with money payout
      const moneyGained = Math.floor(
        Math.random() * (crime.basePayout.max - crime.basePayout.min + 1) + crime.basePayout.min
      );
      const respectGained = crime.baseRespect;

      return {
        success: true,
        outcome: CRIME_OUTCOMES.SUCCESS,
        moneyGained,
        respectGained,
        message: `Successfully committed ${crime.name}! You made off with the loot.`
      };
    }
  } else {
    // Failed crime - all failures result in jail time
    const jailTime = (crime as any).jailTime || 60; // Default to 60 seconds if not specified
    
    return {
      success: false,
      outcome: CRIME_OUTCOMES.JAIL,
      message: `You were caught committing ${crime.name} and thrown in jail!`,
      jailTime: jailTime
    };
  }
}

async function processCrimeResult(player: Player, crime: typeof CRIMES[number], result: CrimeResult): Promise<Player> {
  const now = new Date().toISOString();
  
  const updates: Partial<Player> = {
    lastActive: now,
    stats: {
      ...player.stats,
      crimesCommitted: player.stats.crimesCommitted + 1,
      crimesSuccessful: result.success ? player.stats.crimesSuccessful + 1 : player.stats.crimesSuccessful,
      crimesFailed: !result.success ? player.stats.crimesFailed + 1 : player.stats.crimesFailed
    }
  };

  if (result.success) {
    // Handle car reward for Grand Theft Auto
    if ((result as any).carAwarded !== undefined) {
      updates.carId = (result as any).carAwarded;
    }
    
    updates.money = player.money + (result.moneyGained || 0);
    
    // Only award respect if not at max rank (Infamous Mafioso)
    const maxRank = RANKS.length - 1;
    if (player.rank < maxRank) {
      updates.respect = player.respect + (result.respectGained || 0);
    } else {
      updates.respect = player.respect; // Keep existing respect, no more gains
    }
    
    if (updates.stats) {
      updates.stats.totalMoneyEarned = player.stats.totalMoneyEarned + (result.moneyGained || 0);
      updates.stats.totalRespectEarned = player.stats.totalRespectEarned + (result.respectGained || 0);
    }

    // Check for rank up
    const newRank = calculateNewRank(updates.respect || player.respect);
    if (newRank > player.rank) {
      updates.rank = newRank;
      if (updates.stats) {
        updates.stats.rankUps = player.stats.rankUps + 1;
      }
    }
  } else {
    // Handle jail time (no more hospital outcomes)
    if (result.jailTime) {
      updates.jailUntil = new Date(Date.now() + result.jailTime * 1000).toISOString();
      if (updates.stats) {
        updates.stats.timesJailed = player.stats.timesJailed + 1;
      }
    }
  }

  // Update player in database
  await updatePlayer(player.worldId, updates);

  return { ...player, ...updates };
}

function calculateNewRank(respect: number): number {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (respect >= RANKS[i].requiredRespect) {
      return i;
    }
  }
  return 0;
}

async function updatePlayer(worldId: string, updates: Partial<Player>): Promise<void> {
  // Build update expression
  const updateExpressions: string[] = [];
  const expressionAttributeNames: { [key: string]: string } = {};
  const expressionAttributeValues: { [key: string]: any } = {};

  Object.entries(updates).forEach(([key, value], index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    
    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = value;
  });

  await docClient.send(new UpdateCommand({
    TableName: PLAYERS_TABLE,
    Key: { worldId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));
}

async function setCrimeCooldown(playerId: string, crimeId: number, cooldownSeconds: number): Promise<void> {
  const expiresAt = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
  
  await docClient.send(new PutCommand({
    TableName: COOLDOWNS_TABLE,
    Item: {
      playerId,
      crimeId: crimeId.toString(),
      expiresAt
    }
  }));
}

async function logCrimeAttempt(attempt: CrimeAttempt): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: CRIME_HISTORY_TABLE,
    Item: {
      ...attempt,
      id: `${attempt.playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }));
}