import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient(), {
  marshallOptions: { removeUndefinedValues: true },
});
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
    const { sessionId } = event.pathParameters;
    const { Item } = await ddb.send(new GetCommand({ TableName: process.env.TABLE_NAME, Key: { sessionId } }));
    if (!Item || Item.expiresAt < Math.floor(Date.now() / 1000)) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Review not found or expired' }) };
    }
    const { entries, employeeName, targetLevel, status, comments } = Item;
    return { statusCode: 200, headers, body: JSON.stringify({ entries, employeeName, targetLevel, status, comments }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
