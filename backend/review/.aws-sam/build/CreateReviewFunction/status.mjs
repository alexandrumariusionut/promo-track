import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler = async (event) => {
  try {
    const { sessionId } = event.pathParameters;
    const { Item } = await ddb.send(new GetCommand({
      TableName: process.env.TABLE_NAME, Key: { sessionId },
      ProjectionExpression: '#s, comments',
      ExpressionAttributeNames: { '#s': 'status' },
    }));
    if (!Item) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Review not found' }) };
    const result = { status: Item.status };
    if (Item.status === 'reviewed') result.comments = Item.comments;
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
