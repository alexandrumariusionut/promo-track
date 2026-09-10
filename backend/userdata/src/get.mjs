import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { respond, error, serverError, callerAlias, assertOwner } from './lib/http.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

export const handler = async (event) => {
  try {
    const alias = callerAlias(event);
    if (!alias) return error(401, 'Unauthorized');

    const denied = assertOwner(event, alias);
    if (denied) return denied;

    const { userId } = event.pathParameters;
    const { Item } = await ddb.send(new GetCommand({ TableName: process.env.TABLE_NAME, Key: { userId } }));

    // `version` lets the client send back what it last saw so a stale tab or
    // device cannot silently overwrite newer data (see save.mjs).
    return respond(200, {
      data: Item?.data || null,
      version: Item?.version ?? 0,
      updatedAt: Item?.updatedAt ?? null,
    });
  } catch (e) {
    return serverError(e, { handler: 'get' });
  }
};
