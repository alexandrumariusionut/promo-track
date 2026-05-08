import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler = async (event) => {
  try {
    const { entries, employeeName, targetLevel } = JSON.parse(event.body);
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
