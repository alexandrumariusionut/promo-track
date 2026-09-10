import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
const ALLOWED_ORIGINS = ['https://promo-track.harmony.a2z.com', 'https://promo-track.beta.harmony.a2z.com', 'http://localhost:5173'];

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

    const { Item } = await ddb.send(new GetCommand({ TableName: process.env.TABLE_NAME, Key: { userId } }));
    return { statusCode: 200, headers, body: JSON.stringify({ data: Item?.data || null }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
