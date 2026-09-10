import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient(), {
  marshallOptions: { removeUndefinedValues: true },
});
const ALLOWED_ORIGINS = ['https://promo-track.harmony.a2z.com', 'https://promo-track.beta.harmony.a2z.com', 'http://localhost:5173'];
const MAX_COMMENT_BYTES = 4 * 1024; // 4 KB per comment
const MAX_COMMENTS_PER_SESSION = 200;

function corsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  };
}

function validateComments(comments) {
  if (typeof comments !== 'object' || comments === null || Array.isArray(comments)) {
    return 'comments must be a non-null object (map of entryId to comment data)';
  }
  const entries = Object.entries(comments);
  if (entries.length > MAX_COMMENTS_PER_SESSION) {
    return `Too many comments (max ${MAX_COMMENTS_PER_SESSION})`;
  }
  for (const [key, value] of entries) {
    if (typeof key !== 'string' || key.length === 0 || key.length > 100) {
      return 'Comment key must be a non-empty string (max 100 chars)';
    }
    if (typeof value !== 'string' && typeof value !== 'object') {
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
  const headers = corsHeaders(event);
  try {
    const alias = event.requestContext?.authorizer?.lambda?.alias;
    if (!alias) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { sessionId } = event.pathParameters;

    // Parse and validate body
    let body;
    try {
      body = JSON.parse(event.body || '');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { comments } = body;
    const validationError = validateComments(comments);
    if (validationError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: validationError }) };
    }

    // Enrich comments with commenter attribution
    const attributedComments = {};
    for (const [key, value] of Object.entries(comments)) {
      attributedComments[key] = {
        text: typeof value === 'string' ? value : value.text || '',
        commenterAlias: alias,
        submittedAt: new Date().toISOString(),
      };
    }

    await ddb.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { sessionId },
      UpdateExpression: 'SET comments = :c, #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':c': attributedComments, ':s': 'reviewed' },
      ConditionExpression: 'attribute_exists(sessionId)',
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    const code = e.name === 'ConditionalCheckFailedException' ? 404 : 500;
    return { statusCode: code, headers, body: JSON.stringify({ error: code === 404 ? 'Review not found' : e.message }) };
  }
};
