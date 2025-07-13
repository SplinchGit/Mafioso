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
const utils_1 = require("../../shared/utils");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const NONCES_TABLE = process.env.NONCES_TABLE || 'mafioso-nonces';
const handler = async (event) => {
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
        const { payload, nonce } = JSON.parse(event.body);
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
        const isValidSignature = await (0, minikit_js_1.verifySiweMessage)(payload, nonce);
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
            const jwtSecret = await (0, utils_1.getJWTSecret)();
            const token = jwt.sign({
                walletAddress: existingPlayer.walletAddress,
                username: existingPlayer.username
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
                    hasAccount: true,
                    player: existingPlayer,
                    token
                })
            };
        }
        else {
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
    }
    catch (error) {
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
exports.handler = handler;
async function getNonce(nonce) {
    try {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: NONCES_TABLE,
            Key: { nonce }
        }));
        return result.Item || null;
    }
    catch (error) {
        console.error('Error getting nonce:', error);
        return null;
    }
}
async function markNonceAsUsed(nonce) {
    try {
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
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
    }
    catch (error) {
        console.error('Error marking nonce as used:', error);
    }
}
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
//# sourceMappingURL=walletLogin.js.map