import { vi, describe, test, expect, beforeEach } from 'vitest';

const sendMock = vi.fn();
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { } }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
  GetCommand: class { constructor(p) { this.params = p; this.kind = 'Get'; } },
  UpdateCommand: class { constructor(p) { this.params = p; this.kind = 'Update'; } },
}));

const { handler: getHandler } = await import('../src/get.mjs');
const { handler: saveHandler } = await import('../src/save.mjs');

function makeEvent(alias, userId, body = null, headers = {}) {
  return {
    requestContext: { authorizer: { lambda: alias ? { alias } : {} } },
    pathParameters: { userId },
    headers: { origin: 'https://promo-track.harmony.a2z.com', ...headers },
    body: body === null ? null : (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

beforeEach(() => sendMock.mockReset());

describe('userdata GET handler', () => {
  test('returns data and version for matching alias', async () => {
    sendMock.mockResolvedValueOnce({ Item: { userId: 'alice', data: { foo: 'bar' }, version: 3, updatedAt: 123 } });
    const result = await getHandler(makeEvent('alice', 'alice'));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ data: { foo: 'bar' }, version: 3, updatedAt: 123 });
  });

  test('returns null data and version 0 for new user', async () => {
    sendMock.mockResolvedValueOnce({});
    const result = await getHandler(makeEvent('alice', 'alice'));
    expect(JSON.parse(result.body)).toEqual({ data: null, version: 0, updatedAt: null });
  });

  test('returns 403 if userId !== alias', async () => {
    const result = await getHandler(makeEvent('alice', 'bob'));
    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error).toContain('Forbidden');
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('returns 401 if no alias in context', async () => {
    const result = await getHandler(makeEvent(null, 'alice'));
    expect(result.statusCode).toBe(401);
  });

  test('does not leak internal error details', async () => {
    sendMock.mockRejectedValueOnce(new Error('ResourceNotFoundException: promo-track-users'));
    const result = await getHandler(makeEvent('alice', 'alice'));
    expect(result.statusCode).toBe(500);
    expect(result.body).not.toContain('promo-track-users');
  });
});

describe('userdata PUT handler', () => {
  test('saves data for matching alias and increments version', async () => {
    sendMock.mockResolvedValueOnce({ Attributes: { version: 1 } });
    const result = await saveHandler(makeEvent('alice', 'alice', { entries: [] }));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.version).toBe(1);
    const params = sendMock.mock.calls[0][0].params;
    expect(params.UpdateExpression).toContain('version = if_not_exists(version, :zero) + :one');
    expect(params.ConditionExpression).toBeUndefined();
  });

  test('applies If-Match as a condition', async () => {
    sendMock.mockResolvedValueOnce({ Attributes: { version: 5 } });
    const result = await saveHandler(makeEvent('alice', 'alice', { entries: [] }, { 'if-match': '4' }));
    expect(result.statusCode).toBe(200);
    const params = sendMock.mock.calls[0][0].params;
    expect(params.ConditionExpression).toBe('version = :expected');
    expect(params.ExpressionAttributeValues[':expected']).toBe(4);
  });

  test('If-Match 0 allows first write to a new record', async () => {
    sendMock.mockResolvedValueOnce({ Attributes: { version: 1 } });
    await saveHandler(makeEvent('alice', 'alice', { entries: [] }, { 'if-match': '0' }));
    expect(sendMock.mock.calls[0][0].params.ConditionExpression).toContain('attribute_not_exists(version)');
  });

  test('returns 409 when the stored version has moved on', async () => {
    const err = new Error('cond'); err.name = 'ConditionalCheckFailedException';
    sendMock.mockRejectedValueOnce(err);
    const result = await saveHandler(makeEvent('alice', 'alice', { entries: [] }, { 'if-match': '2' }));
    expect(result.statusCode).toBe(409);
  });

  test('rejects non-integer If-Match', async () => {
    const result = await saveHandler(makeEvent('alice', 'alice', { entries: [] }, { 'if-match': 'abc' }));
    expect(result.statusCode).toBe(400);
  });

  test('returns 403 if userId !== alias', async () => {
    const result = await saveHandler(makeEvent('alice', 'bob', { entries: [] }));
    expect(result.statusCode).toBe(403);
  });

  test('returns 413 if body exceeds 1 MB', async () => {
    const result = await saveHandler(makeEvent('alice', 'alice', 'x'.repeat(1024 * 1024 + 1)));
    expect(result.statusCode).toBe(413);
  });

  test('returns 400 for invalid JSON', async () => {
    const result = await saveHandler(makeEvent('alice', 'alice', 'not{json'));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toContain('Invalid JSON');
  });

  test('returns 400 for primitive body (not object/array)', async () => {
    const result = await saveHandler(makeEvent('alice', 'alice', '"just a string"'));
    expect(result.statusCode).toBe(400);
  });
});
