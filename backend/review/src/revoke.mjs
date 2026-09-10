import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { respond, error, serverError, callerAlias } from './lib/http.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient(), {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * DELETE /reviews/{sessionId} — only the owner may revoke a review session.
 * The ownership check is done atomically in the ConditionExpression.
 */
export const handler = async (event) => {
  try {
    const alias = callerAlias(event);
    if (!alias) return error(401, 'Unauthorized');

    const { sessionId } = event.pathParameters || {};
    if (!sessionId) return error(400, 'sessionId is required');

    await ddb.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: { sessionId },
      ConditionExpression: 'attribute_exists(sessionId) AND ownerAlias = :alias',
      ExpressionAttributeValues: { ':alias': alias },
    }));
    return respond(200, { success: true });
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return error(404, 'Review not found');
    return serverError(e, { handler: 'revoke' });
  }
};
