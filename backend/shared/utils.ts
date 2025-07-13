import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});

interface SecretCache {
  [key: string]: {
    value: string;
    timestamp: number;
  };
}

const secretCache: SecretCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretArn: string): Promise<string> {
  // Check cache first
  const cached = secretCache[secretArn];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({
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
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw new Error(`Failed to retrieve secret: ${secretArn}`);
  }
}

export async function getJWTSecret(): Promise<string> {
  const jwtSecretArn = process.env.JWT_SECRET_ARN;
  if (!jwtSecretArn) {
    // Fallback to environment variable for local development
    return process.env.JWT_SECRET || 'mafioso-dev-secret';
  }
  return await getSecret(jwtSecretArn);
}

export async function getWorldIdApiKey(): Promise<string> {
  const worldIdSecretArn = process.env.WORLD_ID_SECRET_ARN;
  if (!worldIdSecretArn) {
    // Fallback to environment variable for local development
    return process.env.WORLD_ID_API_KEY || '';
  }
  return await getSecret(worldIdSecretArn);
}