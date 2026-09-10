import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { respond, error, serverError, callerAlias, canAccessReview, isExpired } from '../lib/http.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient(), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event) => {
  try {
    const alias = callerAlias(event);
    if (!alias) return error(401, 'Unauthorized');

    const { sessionId } = event.pathParameters || {};
    if (!sessionId) return error(400, 'sessionId is required');

    const { Item } = await ddb.send(new GetCommand({ TableName: process.env.REVIEWS_TABLE, Key: { sessionId } }));
    if (!Item || isExpired(Item)) return error(404, 'Review not found or expired');
    // Return 404 (not 403) so unauthorised callers cannot probe for valid session ids
    if (!canAccessReview(Item, alias)) return error(404, 'Review not found or expired');

    const { entries, employeeName, targetLevel, status, comments, ownerAlias } = Item;
    return respond(200, {
      entries, employeeName, targetLevel, status, comments,
      isOwner: ownerAlias === alias,
    });
  } catch (e) {
    return serverError(e, { handler: 'get' });
  }
};
