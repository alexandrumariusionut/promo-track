import { describe, test, expect, vi, beforeEach } from 'vitest';
import { normalizeAlias } from '../alias';

vi.mock('../apiFetch', () => ({ apiFetch: vi.fn() }));
import { apiFetch } from '../apiFetch';
import { createReviewSession, revokeReviewSession } from '../reviewApi';

const mockFetch = apiFetch as unknown as ReturnType<typeof vi.fn>;

describe('normalizeAlias', () => {
  test.each([
    ['jdoe', 'jdoe'],
    ['JDoe@', 'jdoe'],
    ['j.doe@amazon.com', 'j.doe'],
    ['  jdoe  ', 'jdoe'],
  ])('%s -> %s', (input, expected) => expect(normalizeAlias(input)).toBe(expected));

  test.each(['', 'bad alias', 'x'.repeat(65), 'a;b', '@amazon.com'])('rejects %j', (input) => {
    expect(normalizeAlias(input)).toBeNull();
  });
});

describe('reviewApi', () => {
  beforeEach(() => mockFetch.mockReset());

  test('createReviewSession posts reviewerAliases', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 's1', reviewUrl: 'u' }) });
    await createReviewSession({ entries: [], employeeName: 'A', targetLevel: 'L5', reviewerAliases: ['bob'] });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/reviews$/);
    expect(JSON.parse(init.body).reviewerAliases).toEqual(['bob']);
  });

  test('revokeReviewSession issues DELETE and maps 404 to false', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    expect(await revokeReviewSession('s1')).toBe(true);
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    expect(await revokeReviewSession('s1')).toBe(false);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(revokeReviewSession('s1')).rejects.toThrow(/500/);
  });
});
