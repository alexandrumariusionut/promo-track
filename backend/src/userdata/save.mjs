import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { respond, error, serverError, callerAlias, assertOwner } from '../lib/http.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * PUT /userdata/{userId}
 *
 * Body: the portfolio state (object). The client may send the version it last
 * read in the `If-Match` header. When provided, the write only succeeds if the
 * stored version still matches; otherwise 409 is returned with the current
 * version so the client can reload and merge instead of clobbering newer data.
 * Requests without `If-Match` behave as before (last writer wins) so older
 * clients keep working.
 */
export const handler = async (event) => {
  try {
    const alias = callerAlias(event);
    if (!alias) return error(401, 'Unauthorized');

    const denied = assertOwner(event, alias);
    if (denied) return denied;
    const { userId } = event.pathParameters;

    const rawBody = event.body || '';
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return error(413, 'Payload too large (max 1 MB)');
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return error(400, 'Invalid JSON body');
    }
    if (data === null || typeof data !== 'object') {
      return error(400, 'Body must be a JSON object or array');
    }

    const ifMatch = event.headers?.['if-match'] ?? event.headers?.['If-Match'];
    let expectedVersion = null;
    if (ifMatch !== undefined) {
      expectedVersion = Number(ifMatch);
      if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
        return error(400, 'If-Match must be a non-negative integer version');
      }
    }

    const now = Date.now();
    const params = {
      TableName: process.env.USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET #d = :data, updatedAt = :now, version = if_not_exists(version, :zero) + :one',
      ExpressionAttributeNames: { '#d': 'data' },
      ExpressionAttributeValues: { ':data': data, ':now': now, ':zero': 0, ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    };
    if (expectedVersion !== null) {
      params.ExpressionAttributeValues[':expected'] = expectedVersion;
      params.ConditionExpression = expectedVersion === 0
        ? 'attribute_not_exists(version) OR version = :expected'
        : 'version = :expected';
    }

    const { Attributes } = await ddb.send(new UpdateCommand(params));
    return respond(200, { success: true, version: Attributes?.version ?? null, updatedAt: now });
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') {
      return error(409, 'Conflict: the portfolio was modified elsewhere. Reload before saving.');
    }
    return serverError(e, { handler: 'save' });
  }
};
