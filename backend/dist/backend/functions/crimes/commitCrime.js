"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const jwt = __importStar(require("jsonwebtoken"));
const constants_1 = require("../../../shared/constants");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const JWT_SECRET = process.env.JWT_SECRET || 'mafioso-dev-secret';
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const COOLDOWNS_TABLE = process.env.COOLDOWNS_TABLE || 'mafioso-cooldowns';
const CRIME_HISTORY_TABLE = process.env.CRIME_HISTORY_TABLE || 'mafioso-crime-history';
const handler = async (event) => {
    console.log('Commit crime request:', event.body);
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
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        }
        catch (error) {
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
        const { crimeId } = JSON.parse(event.body);
        // Validate crime ID
        if (typeof crimeId !== 'number' || crimeId < 0 || crimeId >= constants_1.CRIMES.length) {
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
        const crime = constants_1.CRIMES[crimeId];
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
    }
    catch (error) {
        console.error('Commit crime error:', error);
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
exports.handler = handler;
async function getPlayer(worldId) {
    try {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: PLAYERS_TABLE,
            Key: { worldId }
        }));
        return result.Item || null;
    }
    catch (error) {
        console.error('Error getting player:', error);
        return null;
    }
}
function validateCrimeAttempt(player, crime) {
    // Check if player is in jail or hospital
    if (player.jailUntil && new Date(player.jailUntil) > new Date()) {
        return { canCommit: false, reason: 'You are currently in jail' };
    }
    if (player.hospitalUntil && new Date(player.hospitalUntil) > new Date()) {
        return { canCommit: false, reason: 'You are currently in the hospital' };
    }
    // Check rank requirement
    if (player.rank < crime.requiredRank) {
        const requiredRank = constants_1.RANKS[crime.requiredRank];
        return { canCommit: false, reason: `Requires ${requiredRank.name} rank` };
    }
    // Check nerve requirement
    if (player.nerve < crime.nerve) {
        return { canCommit: false, reason: `Requires ${crime.nerve} nerve (you have ${player.nerve})` };
    }
    return { canCommit: true };
}
async function checkCrimeCooldown(playerId, crimeId) {
    try {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: COOLDOWNS_TABLE,
            Key: {
                playerId,
                crimeId: crimeId.toString()
            }
        }));
        if (!result.Item) {
            return { canCommit: true, timeRemaining: 0 };
        }
        const cooldown = result.Item;
        const expiresAt = new Date(cooldown.expiresAt);
        const now = new Date();
        if (expiresAt <= now) {
            return { canCommit: true, timeRemaining: 0 };
        }
        return {
            canCommit: false,
            timeRemaining: expiresAt.getTime() - now.getTime()
        };
    }
    catch (error) {
        console.error('Error checking cooldown:', error);
        return { canCommit: true, timeRemaining: 0 };
    }
}
function calculateCrimeResult(player, crime) {
    // Calculate success chance
    const baseSuccess = crime.baseSuccess;
    const rankBonus = Math.min(player.rank * 2, 20); // Max 20% bonus from rank
    const nerveBonus = Math.min((player.nerve / 100) * 10, 10); // Max 10% bonus from nerve
    const successChance = Math.min(95, baseSuccess + rankBonus + nerveBonus);
    const roll = Math.random() * 100;
    const isSuccess = roll <= successChance;
    if (isSuccess) {
        // Successful crime
        const moneyGained = Math.floor(Math.random() * (crime.basePayout.max - crime.basePayout.min) + crime.basePayout.min);
        const respectGained = crime.baseRespect;
        return {
            success: true,
            outcome: constants_1.CRIME_OUTCOMES.SUCCESS,
            moneyGained,
            respectGained,
            message: `Successfully committed ${crime.name}! You made off with the loot.`
        };
    }
    else {
        // Failed crime - determine consequence
        const consequenceRoll = Math.random() * 100;
        if (consequenceRoll < 30) {
            // Jail
            const jailTime = constants_1.GAME_CONFIG.JAIL_TIME_BASE + Math.random() * constants_1.GAME_CONFIG.JAIL_TIME_BASE;
            return {
                success: false,
                outcome: constants_1.CRIME_OUTCOMES.JAIL,
                message: `You were caught committing ${crime.name} and thrown in jail!`,
                jailTime: jailTime
            };
        }
        else if (consequenceRoll < 50) {
            // Hospital
            const hospitalTime = constants_1.GAME_CONFIG.HOSPITAL_TIME_BASE + Math.random() * constants_1.GAME_CONFIG.HOSPITAL_TIME_BASE;
            return {
                success: false,
                outcome: constants_1.CRIME_OUTCOMES.HOSPITAL,
                message: `You were injured during ${crime.name} and hospitalized!`,
                hospitalTime: hospitalTime
            };
        }
        else {
            // Simple failure
            return {
                success: false,
                outcome: constants_1.CRIME_OUTCOMES.FAILURE,
                message: `You failed to commit ${crime.name}. Better luck next time.`
            };
        }
    }
}
async function processCrimeResult(player, crime, result) {
    const now = new Date().toISOString();
    const updates = {
        nerve: Math.max(0, player.nerve - crime.nerve),
        lastActive: now,
        stats: {
            ...player.stats,
            crimesCommitted: player.stats.crimesCommitted + 1,
            crimesSuccessful: result.success ? player.stats.crimesSuccessful + 1 : player.stats.crimesSuccessful,
            crimesFailed: !result.success ? player.stats.crimesFailed + 1 : player.stats.crimesFailed
        }
    };
    if (result.success) {
        updates.money = player.money + (result.moneyGained || 0);
        updates.respect = player.respect + (result.respectGained || 0);
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
    }
    else {
        // Handle consequences
        if (result.jailTime) {
            updates.jailUntil = new Date(Date.now() + result.jailTime * 1000).toISOString();
            if (updates.stats) {
                updates.stats.timesJailed = player.stats.timesJailed + 1;
            }
        }
        if (result.hospitalTime) {
            updates.hospitalUntil = new Date(Date.now() + result.hospitalTime * 1000).toISOString();
            if (updates.stats) {
                updates.stats.timesHospitalized = player.stats.timesHospitalized + 1;
            }
        }
    }
    // Update player in database
    await updatePlayer(player.worldId, updates);
    return { ...player, ...updates };
}
function calculateNewRank(respect) {
    for (let i = constants_1.RANKS.length - 1; i >= 0; i--) {
        if (respect >= constants_1.RANKS[i].requiredRespect) {
            return i;
        }
    }
    return 0;
}
async function updatePlayer(worldId, updates) {
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    Object.entries(updates).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
    });
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: PLAYERS_TABLE,
        Key: { worldId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    }));
}
async function setCrimeCooldown(playerId, crimeId, cooldownSeconds) {
    const expiresAt = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: COOLDOWNS_TABLE,
        Item: {
            playerId,
            crimeId: crimeId.toString(),
            expiresAt
        }
    }));
}
async function logCrimeAttempt(attempt) {
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: CRIME_HISTORY_TABLE,
        Item: {
            ...attempt,
            id: `${attempt.playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
    }));
}
//# sourceMappingURL=commitCrime.js.map