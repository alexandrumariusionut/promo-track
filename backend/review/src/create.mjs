import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { respond, error, serverError, callerAlias, parseJsonBody } from './lib/http.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient(), {
  marshallOptions: { removeUndefinedValues: true },
});

const MAX_ENTRIES = 100;
const MAX_BODY_BYTES = 512 * 1024; // 512 KB
const MAX_REVIEWERS = 10;
const ALIAS_RE = /^[a-z0-9._-]{1,64}$/i;
const SESSION_TTL_SECONDS = 7 * 86400;

export const handler = async (event) => {
  try {
    const alias = callerAlias(event);
    if (!alias) return error(401, 'Unauthorized');

    if (Buffer.byteLength(event.body || '', 'utf8') > MAX_BODY_BYTES) {
      return error(413, 'Payload too large (max 512 KB)');
    }

    const { body, response } = parseJsonBody(event);
    if (response) return response;

    const { entries, employeeName, targetLevel, reviewerAliases } = body;
    if (!Array.isArray(entries) || typeof employeeName !== 'string' || typeof targetLevel !== 'string') {
      return error(400, 'entries must be array, employeeName and targetLevel must be strings');
    }
    if (entries.length === 0 || entries.length > MAX_ENTRIES) {
      return error(400, `entries must contain between 1 and ${MAX_ENTRIES} items`);
    }

    let reviewers = [];
    if (reviewerAliases !== undefined) {
      if (!Array.isArray(reviewerAliases) || reviewerAliases.length > MAX_REVIEWERS
        || !reviewerAliases.every((r) => typeof r === 'string' && ALIAS_RE.test(r))) {
        return error(400, `reviewerAliases must be an array of up to ${MAX_REVIEWERS} aliases`);
      }
      reviewers = [...new Set(reviewerAliases.map((r) => r.toLowerCase()))];
    }

    // Strip entries to only review-relevant fields
    const reviewEntries = entries.map(({ id, title, situation, task, action, results, principles, reviewComments }) =>
      ({ id, title, situation, task, action, results, principles, reviewComments: reviewComments || [] }));

    const sessionId = randomUUID();
    const now = Date.now();
    await ddb.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        sessionId,
        ownerAlias: alias,
        reviewerAliases: reviewers,
        entries: reviewEntries,
        employeeName,
        targetLevel,
        status: 'pending',
        comments: {},
        createdAt: now,
        expiresAt: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
      },
    }));

    // Build the share URL from the request origin (already restricted by CORS allowlist)
    const origin = event.headers?.origin || event.headers?.Origin || '';
    return respond(201, { sessionId, reviewUrl: `${origin}/review/${sessionId}` });
  } catch (e) {
    return serverError(e, { handler: 'create' });
  }
};
