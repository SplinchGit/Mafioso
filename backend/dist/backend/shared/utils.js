"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecret = getSecret;
exports.getJWTSecret = getJWTSecret;
exports.getWorldIdApiKey = getWorldIdApiKey;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const secretsClient = new client_secrets_manager_1.SecretsManagerClient({});
const secretCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
async function getSecret(secretArn) {
    // Check cache first
    const cached = secretCache[secretArn];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.value;
    }
    try {
        const command = new client_secrets_manager_1.GetSecretValueCommand({
            SecretId: secretArn,
        });
        const response = await secretsClient.send(command);
        const secretValue = response.SecretString;
        if (!secretValue) {
            throw new Error(`Secret value is empty for ARN: ${secretArn}`);
        }
        // Cache the secret
        secretCache[secretArn] = {
            value: secretValue,
            timestamp: Date.now(),
        };
        return secretValue;
    }
    catch (error) {
        console.error('Error retrieving secret:', error);
        throw new Error(`Failed to retrieve secret: ${secretArn}`);
    }
}
async function getJWTSecret() {
    const jwtSecretArn = process.env.JWT_SECRET_ARN;
    if (!jwtSecretArn) {
        // Fallback to environment variable for local development
        return process.env.JWT_SECRET || 'mafioso-dev-secret';
    }
    return await getSecret(jwtSecretArn);
}
async function getWorldIdApiKey() {
    const worldIdSecretArn = process.env.WORLD_ID_SECRET_ARN;
    if (!worldIdSecretArn) {
        // Fallback to environment variable for local development
        return process.env.WORLD_ID_API_KEY || '';
    }
    return await getSecret(worldIdSecretArn);
}
//# sourceMappingURL=utils.js.map