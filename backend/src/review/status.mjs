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

    const { Item } = await ddb.send(new GetCommand({
      TableName: process.env.REVIEWS_TABLE, Key: { sessionId },
      ProjectionExpression: '#s, comments, ownerAlias, reviewerAliases, expiresAt',
      ExpressionAttributeNames: { '#s': 'status' },
    }));
    if (!Item || isExpired(Item) || !canAccessReview(Item, alias)) return error(404, 'Review not found');

    const result = { status: Item.status };
    if (Item.status === 'reviewed') result.comments = Item.comments;
    return respond(200, result);
  } catch (e) {
    return serverError(e, { handler: 'status' });
  }
};
