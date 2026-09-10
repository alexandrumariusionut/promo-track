import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
const ALLOWED_ORIGINS = ['https://promo-track.harmony.a2z.com', 'https://promo-track.beta.harmony.a2z.com', 'http://localhost:5173'];
const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

function corsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  };
}

export const handler = async (event) => {
  const headers = corsHeaders(event);
  try {
    const alias = event.requestContext?.authorizer?.lambda?.alias;
    if (!alias) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { userId } = event.pathParameters;
    // Enforce ownership: userId in path must match the verified alias
    if (userId !== alias) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden: userId does not match authenticated identity' }) };
    }

    // Body size check
    const rawBody = event.body || '';
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return { statusCode: 413, headers, body: JSON.stringify({ error: 'Payload too large (max 1 MB)' }) };
    }

    // Parse and validate JSON
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    // Basic type validation: data should be an object or array (not a primitive)
    if (data === null || typeof data !== 'object') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body must be a JSON object or array' }) };
    }

    await ddb.send(new PutCommand({ TableName: process.env.TABLE_NAME, Item: { userId, data, updatedAt: Date.now() } }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
