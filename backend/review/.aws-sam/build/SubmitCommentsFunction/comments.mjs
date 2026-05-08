import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler = async (event) => {
  try {
    const { sessionId } = event.pathParameters;
    const { comments } = JSON.parse(event.body);
    await ddb.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { sessionId },
      UpdateExpression: 'SET comments = :c, #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':c': comments, ':s': 'reviewed' },
      ConditionExpression: 'attribute_exists(sessionId)',
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    const code = e.name === 'ConditionalCheckFailedException' ? 404 : 500;
    return { statusCode: code, headers, body: JSON.stringify({ error: code === 404 ? 'Review not found' : e.message }) };
  }
};
