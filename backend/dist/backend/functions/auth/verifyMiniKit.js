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
const minikit_js_1 = require("@worldcoin/minikit-js");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const jwt = __importStar(require("jsonwebtoken"));
const crypto = __importStar(require("crypto"));
const constants_1 = require("../../../shared/constants");
const utils_1 = require("../../shared/utils");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const WORLD_ID_TABLE = process.env.WORLD_ID_TABLE || 'mafioso-worldid';
const handler = async (event) => {
    console.log('MiniKit verification request:', event.body);
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
        const payload = JSON.parse(event.body);
        // Get secrets from Secrets Manager
        const jwtSecret = await (0, utils_1.getJWTSecret)();
        // Verify the proof with World ID cloud service
        const app_id = process.env.WORLD_ID_APP_ID || 'app_bc75ea0f4623eb64e1814126df474de3';
        const verifyRes = await (0, minikit_js_1.verifyCloudProof)(payload, app_id, 'login', '');
        if (!verifyRes.success) {
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
        const existingVerification = await getWorldIdVerification(payload.nullifier_hash);
        let player;
        if (existingVerification) {
            // Existing player - load their data
            player = await getPlayerByWorldId(existingVerification.worldId);
            if (!player) {
                throw new Error('Player data not found for existing World ID');
            }
        }
        else {
            // New player - create account
            const worldId = generateWorldId();
            const username = generateUsername();
            player = await createNewPlayer('', worldId, username);
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
        const token = jwt.sign({
            worldId: player.worldId,
            username: player.username
        }, jwtSecret, { expiresIn: '30d' });
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
    }
    catch (error) {
        console.error('MiniKit verification error:', error);
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
async function getWorldIdVerification(nullifierHash) {
    try {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: WORLD_ID_TABLE,
            Key: { nullifierHash }
        }));
        return result.Item || null;
    }
    catch (error) {
        console.error('Error getting World ID verification:', error);
        return null;
    }
}
async function getPlayerByWorldId(worldId) {
    const result = await docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: PLAYERS_TABLE,
        Key: { worldId }
    }));
    if (!result.Item) {
        throw new Error('Player not found');
    }
    return result.Item;
}
async function createNewPlayer(walletAddress, worldId, username) {
    const now = new Date().toISOString();
    const newPlayer = {
        walletAddress,
        worldId,
        username,
        money: constants_1.GAME_CONFIG.STARTING_MONEY,
        respect: constants_1.GAME_CONFIG.STARTING_RESPECT,
        nerve: constants_1.GAME_CONFIG.STARTING_NERVE,
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
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: PLAYERS_TABLE,
        Item: newPlayer
    }));
    return newPlayer;
}
async function storeWorldIdVerification(verification) {
    await docClient.send(new lib_dynamodb_1.PutCommand({
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
async function updatePlayerLastActive(_worldId) {
    // This would use UpdateCommand to update lastActive timestamp
    // Simplified for this example
}
function generateWorldId() {
    return `mafioso_${crypto.randomBytes(16).toString('hex')}`;
}
function generateUsername() {
    const adjectives = ['Silent', 'Shadow', 'Iron', 'Golden', 'Silver', 'Dark', 'Swift', 'Cold'];
    const nouns = ['Wolf', 'Eagle', 'Viper', 'Tiger', 'Falcon', 'Shark', 'Panther', 'Bear'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${adjective}${noun}${number}`;
}
//# sourceMappingURL=verifyMiniKit.js.map