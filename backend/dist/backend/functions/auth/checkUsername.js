"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const PLAYERS_TABLE = process.env.PLAYERS_TABLE || 'mafioso-players';
const handler = async (event) => {
    console.log('Check username request:', event.queryStringParameters);
    try {
        const username = event.queryStringParameters?.username;
        if (!username) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Username parameter is required'
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
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid username format'
                })
            };
        }
        // Check if username exists
        const exists = await checkUsernameExists(username);
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
                available: !exists
            })
        };
    }
    catch (error) {
        console.error('Check username error:', error);
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
//# sourceMappingURL=checkUsername.js.map