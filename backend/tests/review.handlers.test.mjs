import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock DynamoDB
const sendMock = vi.fn();
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class { } }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
  GetCommand: class { constructor(p) { this.params = p; this.kind = 'Get'; } },
  PutCommand: class { constructor(p) { this.params = p; this.kind = 'Put'; } },
  UpdateCommand: class { constructor(p) { this.params = p; this.kind = 'Update'; } },
  DeleteCommand: class { constructor(p) { this.params = p; this.kind = 'Delete'; } },
}));

const { handler: createHandler } = await import('../src/review/create.mjs');
const { handler: getHandler } = await import('../src/review/get.mjs');
const { handler: commentsHandler } = await import('../src/review/comments.mjs');
const { handler: statusHandler } = await import('../src/review/status.mjs');
const { handler: revokeHandler } = await import('../src/review/revoke.mjs');

const future = Math.floor(Date.now() / 1000) + 3600;

function makeEvent(alias, sessionId, body) {
  return {
    requestContext: { authorizer: { lambda: alias ? { alias } : {} } },
    pathParameters: sessionId ? { sessionId } : {},
    headers: { origin: 'https://promo-track.harmony.a2z.com' },
    body: body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

beforeEach(() => sendMock.mockReset());

describe('create handler', () => {
  test('stores owner alias and normalised reviewer allowlist', async () => {
    sendMock.mockResolvedValueOnce({});
    const res = await createHandler(makeEvent('alice', null, {
      entries: [{ id: 'e1', title: 'T', secretField: 'strip me' }],
      employeeName: 'Alice', targetLevel: 'L5', reviewerAliases: ['Bob', 'bob', 'carol'],
    }));
    expect(res.statusCode).toBe(201);
    const item = sendMock.mock.calls[0][0].params.Item;
    expect(item.ownerAlias).toBe('alice');
    expect(item.reviewerAliases).toEqual(['bob', 'carol']);
    expect(item.entries[0].secretField).toBeUndefined();
    expect(JSON.parse(res.body).reviewUrl).toContain(`/review/${item.sessionId}`);
  });

  test('rejects invalid reviewer aliases', async () => {
    const res = await createHandler(makeEvent('alice', null, {
      entries: [{ id: 'e1' }], employeeName: 'A', targetLevel: 'L5', reviewerAliases: ['bad alias!'],
    }));
    expect(res.statusCode).toBe(400);
  });

  test('returns 401 without alias', async () => {
    const res = await createHandler(makeEvent(null, null, { entries: [{}], employeeName: 'A', targetLevel: 'L5' }));
    expect(res.statusCode).toBe(401);
  });

  test('does not leak internal errors', async () => {
    sendMock.mockRejectedValueOnce(new Error('table promo-track-reviews exploded'));
    const res = await createHandler(makeEvent('alice', null, { entries: [{}], employeeName: 'A', targetLevel: 'L5' }));
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('promo-track-reviews');
  });
});

describe('get handler access control', () => {
  const item = { sessionId: 's1', ownerAlias: 'alice', reviewerAliases: ['bob'], entries: [], employeeName: 'A', targetLevel: 'L5', status: 'pending', comments: {}, expiresAt: future };

  test('owner can read', async () => {
    sendMock.mockResolvedValueOnce({ Item: item });
    const res = await getHandler(makeEvent('alice', 's1'));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).isOwner).toBe(true);
  });

  test('named reviewer can read', async () => {
    sendMock.mockResolvedValueOnce({ Item: item });
    const res = await getHandler(makeEvent('bob', 's1'));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).isOwner).toBe(false);
  });

  test('stranger gets 404 when allowlist is set', async () => {
    sendMock.mockResolvedValueOnce({ Item: item });
    const res = await getHandler(makeEvent('mallory', 's1'));
    expect(res.statusCode).toBe(404);
  });

  test('anyone with link can read when no allowlist', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...item, reviewerAliases: [] } });
    const res = await getHandler(makeEvent('mallory', 's1'));
    expect(res.statusCode).toBe(200);
  });

  test('expired session is 404', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...item, expiresAt: 1 } });
    const res = await getHandler(makeEvent('alice', 's1'));
    expect(res.statusCode).toBe(404);
  });
});

describe('comments handler', () => {
  const access = { ownerAlias: 'alice', reviewerAliases: [], expiresAt: future };

  test('merges comments per entry with attribution', async () => {
    sendMock.mockResolvedValueOnce({ Item: access }).mockResolvedValueOnce({});
    const res = await commentsHandler(makeEvent('reviewer1', 's1', { comments: { 'entry-1': 'Good STAR story' } }));
    expect(res.statusCode).toBe(200);
    const update = sendMock.mock.calls[1][0];
    expect(update.kind).toBe('Update');
    expect(update.params.UpdateExpression).toContain('#c.#k0 = :v0');
    expect(update.params.ExpressionAttributeNames['#k0']).toBe('entry-1');
    const v = update.params.ExpressionAttributeValues[':v0'];
    expect(v.commenterAlias).toBe('reviewer1');
    expect(v.text).toBe('Good STAR story');
    expect(v.submittedAt).toBeDefined();
  });

  test('denies reviewer not on allowlist', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...access, reviewerAliases: ['bob'] } });
    const res = await commentsHandler(makeEvent('mallory', 's1', { comments: { 'entry-1': 'x' } }));
    expect(res.statusCode).toBe(404);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  test('returns 401 without alias', async () => {
    const res = await commentsHandler(makeEvent(null, 's1', { comments: {} }));
    expect(res.statusCode).toBe(401);
  });

  test('returns 400 for invalid JSON body', async () => {
    const res = await commentsHandler(makeEvent('r', 's1', 'not json'));
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 if comments is not an object', async () => {
    const res = await commentsHandler(makeEvent('r', 's1', { comments: 'not an object' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('must be a non-null object');
  });

  test('returns 400 if single comment exceeds 4 KB', async () => {
    const res = await commentsHandler(makeEvent('r', 's1', { comments: { 'entry-1': 'x'.repeat(5000) } }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('exceeds max size');
  });

  test('returns 400 if too many comments (>200)', async () => {
    const tooMany = {};
    for (let i = 0; i < 201; i++) tooMany[`entry-${i}`] = 'comment';
    const res = await commentsHandler(makeEvent('r', 's1', { comments: tooMany }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('Too many comments');
  });
});

describe('status handler', () => {
  test('hides comments until reviewed and enforces access', async () => {
    sendMock.mockResolvedValueOnce({ Item: { status: 'pending', comments: { a: 1 }, ownerAlias: 'alice', reviewerAliases: [], expiresAt: future } });
    const res = await statusHandler(makeEvent('alice', 's1'));
    expect(JSON.parse(res.body)).toEqual({ status: 'pending' });

    sendMock.mockResolvedValueOnce({ Item: { status: 'reviewed', comments: {}, ownerAlias: 'alice', reviewerAliases: ['bob'], expiresAt: future } });
    const denied = await statusHandler(makeEvent('mallory', 's1'));
    expect(denied.statusCode).toBe(404);
  });
});

describe('revoke handler', () => {
  test('deletes with owner condition', async () => {
    sendMock.mockResolvedValueOnce({});
    const res = await revokeHandler(makeEvent('alice', 's1'));
    expect(res.statusCode).toBe(200);
    const del = sendMock.mock.calls[0][0];
    expect(del.kind).toBe('Delete');
    expect(del.params.ConditionExpression).toContain('ownerAlias = :alias');
    expect(del.params.ExpressionAttributeValues[':alias']).toBe('alice');
  });

  test('non-owner gets 404', async () => {
    const err = new Error('nope'); err.name = 'ConditionalCheckFailedException';
    sendMock.mockRejectedValueOnce(err);
    const res = await revokeHandler(makeEvent('mallory', 's1'));
    expect(res.statusCode).toBe(404);
  });
});
