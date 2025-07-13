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
const crypto = __importStar(require("crypto"));
const constants_1 = require("../../../shared/constants");
const utils_1 = require("../../shared/utils");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const handler = async (event) => {
    console.log('Create account request:', event.body);
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
        const { walletAddress, username } = JSON.parse(event.body);
        // Validate required fields
        if (!walletAddress || !username) {
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
                    error: 'Wallet address and username are required'
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
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid username format'
                })
            };
        }
        // Check if username is already taken
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
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
                    error: 'Username is already taken'
                })
            };
        }
        // Create new player
        const worldId = generateWorldId();
        const player = await createNewPlayer(walletAddress, username, worldId);
        // Generate JWT token
        const jwtSecret = await (0, utils_1.getJWTSecret)();
        const token = jwt.sign({
            walletAddress: player.walletAddress,
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
        console.error('Create account error:', error);
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
function isValidUsername(username) {
    // 3-20 characters, alphanumeric + underscore only
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}
async function checkUsernameExists(username) {
    try {
        // Query the GSI for username to check if it exists
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: PLAYERS_TABLE,
            IndexName: 'username-index',
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
                ':username': username
            },
            Limit: 1
        }));
        return !!(result.Items && result.Items.length > 0);
    }
    catch (error) {
        console.error('Error checking username:', error);
        return true; // Assume taken on error to be safe
    }
}
async function createNewPlayer(walletAddress, username, worldId) {
    const now = new Date().toISOString();
    const newPlayer = {
        walletAddress, // Primary key
        worldId, // Internal game ID
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
        Item: newPlayer,
        ConditionExpression: 'attribute_not_exists(walletAddress)' // Ensure no duplicate wallet
    }));
    return newPlayer;
}
function generateWorldId() {
    return `mafioso_${crypto.randomBytes(16).toString('hex')}`;
}
//# sourceMappingURL=createAccount.js.map