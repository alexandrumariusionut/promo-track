import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const { Item } = await ddb.send(new GetCommand({ TableName: process.env.TABLE_NAME, Key: { userId } }));
    return { statusCode: 200, headers, body: JSON.stringify({ data: Item?.data || null }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
