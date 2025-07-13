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
const utils_1 = require("../../shared/utils");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds
const handler = async (event) => {
    console.log('Token validation request');
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Missing or invalid authorization header'
                })
            };
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const jwtSecret = await (0, utils_1.getJWTSecret)();
        let payload;
        try {
            payload = jwt.verify(token, jwtSecret);
        }
        catch (error) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid or expired token'
                })
            };
        }
        // Get player from database
        const player = await getPlayerByWallet(payload.walletAddress);
        if (!player) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Player not found'
                })
            };
        }
        // Check for inactivity timeout (20 minutes)
        const lastActiveTime = new Date(player.lastActive).getTime();
        const now = Date.now();
        if (now - lastActiveTime > INACTIVITY_TIMEOUT) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Session expired due to inactivity',
                    code: 'INACTIVITY_TIMEOUT'
                })
            };
        }
        // Update last active time
        await updatePlayerLastActive(payload.walletAddress);
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
                player: {
                    ...player,
                    lastActive: new Date().toISOString() // Return updated timestamp
                }
            })
        };
    }
    catch (error) {
        console.error('Token validation error:', error);
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
exports.handler = handler;
async function getPlayerByWallet(walletAddress) {
    try {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: PLAYERS_TABLE,
            Key: { walletAddress }
        }));
        return result.Item || null;
    }
    catch (error) {
        console.error('Error getting player by wallet:', error);
        return null;
    }
}
async function updatePlayerLastActive(walletAddress) {
    try {
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: PLAYERS_TABLE,
            Key: { walletAddress },
            UpdateExpression: 'SET lastActive = :lastActive',
            ExpressionAttributeValues: {
                ':lastActive': new Date().toISOString()
            }
        }));
    }
    catch (error) {
        console.error('Error updating last active:', error);
    }
}
//# sourceMappingURL=validateToken.js.map