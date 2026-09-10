import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

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
    // Parse and validate body
    let body;
    try {
      body = JSON.parse(event.body || '');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { entries, employeeName, targetLevel } = body;
    if (!Array.isArray(entries) || typeof employeeName !== 'string' || typeof targetLevel !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'entries must be array, employeeName and targetLevel must be strings' }) };
    }

    // Strip entries to only review-relevant fields
    const reviewEntries = entries.map(({ id, title, situation, task, action, results, principles, reviewComments }) =>
      ({ id, title, situation, task, action, results, principles, reviewComments: reviewComments || [] }));
    const sessionId = randomUUID();
    const now = Date.now();
    await ddb.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        sessionId, entries: reviewEntries, employeeName, targetLevel,
        status: 'pending', comments: {}, createdAt: now,
        expiresAt: Math.floor(now / 1000) + 7 * 86400,
      },
    }));
    const origin = event.headers?.origin || event.headers?.Origin || '';
    return { statusCode: 201, headers, body: JSON.stringify({ sessionId, reviewUrl: `${origin}/review/${sessionId}` }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
