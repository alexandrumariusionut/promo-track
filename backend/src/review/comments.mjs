import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { respond, error, serverError, callerAlias, parseJsonBody, canAccessReview, isExpired } from '../lib/http.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient(), {
  marshallOptions: { removeUndefinedValues: true },
});
const MAX_COMMENT_BYTES = 4 * 1024; // 4 KB per comment
const MAX_COMMENTS_PER_SESSION = 200;
const KEY_RE = /^[A-Za-z0-9._-]{1,100}$/;

export function validateComments(comments) {
  if (typeof comments !== 'object' || comments === null || Array.isArray(comments)) {
    return 'comments must be a non-null object (map of entryId to comment data)';
  }
  const entries = Object.entries(comments);
  if (entries.length === 0) return 'comments must contain at least one entry';
  if (entries.length > MAX_COMMENTS_PER_SESSION) {
    return `Too many comments (max ${MAX_COMMENTS_PER_SESSION})`;
  }
  for (const [key, value] of entries) {
    if (!KEY_RE.test(key)) {
      return 'Comment key must be a non-empty string (max 100 chars, alphanumeric . _ -)';
    }
    if (typeof value !== 'string' && (typeof value !== 'object' || value === null)) {
      return 'Comment value must be a string or object';
    }
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_COMMENT_BYTES) {
      return `Comment for "${key}" exceeds max size (4 KB)`;
    }
  }
  return null;
}

export const handler = async (event) => {
  try {
    const alias = callerAlias(event);
    if (!alias) return error(401, 'Unauthorized');

    const { sessionId } = event.pathParameters || {};
    if (!sessionId) return error(400, 'sessionId is required');

    const { body, response } = parseJsonBody(event);
    if (response) return response;

    const validationError = validateComments(body.comments);
    if (validationError) return error(400, validationError);

    // Access check before writing
    const { Item } = await ddb.send(new GetCommand({
      TableName: process.env.REVIEWS_TABLE,
      Key: { sessionId },
      ProjectionExpression: 'ownerAlias, reviewerAliases, expiresAt',
    }));
    if (!Item || isExpired(Item) || !canAccessReview(Item, alias)) {
      return error(404, 'Review not found or expired');
    }

    // Merge per entry so two reviewers do not overwrite each other
    const submittedAt = new Date().toISOString();
    const setClauses = ['#s = :s'];
    const names = { '#s': 'status', '#c': 'comments' };
    const values = { ':s': 'reviewed' };
    Object.entries(body.comments).forEach(([key, value], i) => {
      names[`#k${i}`] = key;
      values[`:v${i}`] = {
        text: typeof value === 'string' ? value : value.text || '',
        commenterAlias: alias,
        submittedAt,
      };
      setClauses.push(`#c.#k${i} = :v${i}`);
    });

    await ddb.send(new UpdateCommand({
      TableName: process.env.REVIEWS_TABLE,
      Key: { sessionId },
      UpdateExpression: `SET ${setClauses.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(sessionId)',
    }));
    return respond(200, { success: true });
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return error(404, 'Review not found');
    return serverError(e, { handler: 'comments' });
  }
};
