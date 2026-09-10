import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { matchComments, consumeReview, getUnmatchedComments, stashUnmatchedComments, clearUnmatchedComments } from '../reviewImport';
import type { STAREntry } from '../../types';

// Mock reviewApi
vi.mock('../reviewApi', () => ({
  checkReviewStatus: vi.fn(),
  getReviewSession: vi.fn(),
}));

import { checkReviewStatus, getReviewSession } from '../reviewApi';
const mockCheckStatus = vi.mocked(checkReviewStatus);
const mockGetSession = vi.mocked(getReviewSession);

function makeEntry(overrides: Partial<STAREntry> = {}): STAREntry {
  return {
    id: 'entry-1',
    title: 'Test Entry',
    situation: 'sit',
    task: 'task',
    action: 'act',
    results: 'res',
    principles: ['Ownership'],
    date: '2025-01-01',
    quarter: 'Q1 2025',
    impactLevel: 'Medium',
    evidenceLinks: [],
    ...overrides,
  };
}

describe('matchComments', () => {
  it('matches by id (primary)', () => {
    const entries = [makeEntry({ id: 'e1', title: 'Entry One' })];
    const comments = { e1: { text: 'Great work' } };
    const shared = [{ id: 'e1', title: 'Entry One' }];

    const result = matchComments(comments, entries, shared, 'session-1');

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].entryId).toBe('e1');
    expect(result.matched[0].comment.text).toBe('Great work');
    expect(result.matched[0].comment.source).toBe('manager');
    expect(result.unmatched).toHaveLength(0);
  });

  it('matches by exact title when id differs (fallback)', () => {
    const entries = [makeEntry({ id: 'new-uuid', title: 'Migrated Service' })];
    const comments = { 'old-uuid': { text: 'Needs more detail' } };
    const shared = [{ id: 'old-uuid', title: 'Migrated Service' }];

    const result = matchComments(comments, entries, shared, 'session-2');

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].entryId).toBe('new-uuid');
    expect(result.matched[0].comment.text).toBe('Needs more detail');
    expect(result.unmatched).toHaveLength(0);
  });

  it('skips ambiguous title matches (multiple entries with same title)', () => {
    const entries = [
      makeEntry({ id: 'e1', title: 'Same Title' }),
      makeEntry({ id: 'e2', title: 'Same Title' }),
    ];
    const comments = { 'old-id': { text: 'Ambiguous comment' } };
    const shared = [{ id: 'old-id', title: 'Same Title' }];

    const result = matchComments(comments, entries, shared, 'session-3');

    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].title).toBe('Same Title');
    expect(result.unmatched[0].text).toBe('Ambiguous comment');
  });

  it('reports unmatched when entry no longer exists', () => {
    const entries = [makeEntry({ id: 'e1', title: 'Different Entry' })];
    const comments = { 'gone-id': { text: 'Comment for deleted entry' } };
    const shared = [{ id: 'gone-id', title: 'Deleted Entry' }];

    const result = matchComments(comments, entries, shared, 'session-4');

    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].title).toBe('Deleted Entry');
  });

  it('skips comments with empty text', () => {
    const entries = [makeEntry({ id: 'e1' })];
    const comments = { e1: { text: '' } };
    const shared = [{ id: 'e1', title: 'Test' }];

    const result = matchComments(comments, entries, shared, 'session-5');

    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
  });

  it('deduplicates already-imported comments', () => {
    const entries = [makeEntry({
      id: 'e1',
      reviewComments: [{ id: 'review-session-6-e1', text: 'Already here', date: '2025-01-01', source: 'manager' }],
    })];
    const comments = { e1: { text: 'Already here' } };
    const shared = [{ id: 'e1', title: 'Test' }];

    const result = matchComments(comments, entries, shared, 'session-6');

    expect(result.matched).toHaveLength(0);
  });

  it('title matching is case-insensitive', () => {
    const entries = [makeEntry({ id: 'new-id', title: 'My Great Entry' })];
    const comments = { 'old-id': { text: 'Feedback' } };
    const shared = [{ id: 'old-id', title: 'my great entry' }];

    const result = matchComments(comments, entries, shared, 'session-7');

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].entryId).toBe('new-id');
  });
});

describe('consumeReview – decision logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('returns early when no pending review key', async () => {
    const outcome = await consumeReview([makeEntry()]);
    expect(outcome.action).toBe('error');
    expect(outcome.message).toBe('');
  });

  it('returns not-ready when state.star is empty', async () => {
    localStorage.setItem('promo-track-pending-review', 'session-1');
    const outcome = await consumeReview([]);
    expect(outcome.action).toBe('not-ready');
    // Key must NOT be removed
    expect(localStorage.getItem('promo-track-pending-review')).toBe('session-1');
  });

  it('returns pending when status is not reviewed', async () => {
    localStorage.setItem('promo-track-pending-review', 'session-1');
    mockCheckStatus.mockResolvedValue({ status: 'pending' });

    const outcome = await consumeReview([makeEntry()]);
    expect(outcome.action).toBe('pending');
    expect(localStorage.getItem('promo-track-pending-review')).toBe('session-1');
  });

  it('on transient error: keeps key and returns silent error', async () => {
    localStorage.setItem('promo-track-pending-review', 'session-1');
    mockCheckStatus.mockRejectedValue(new Error('Network timeout'));

    const outcome = await consumeReview([makeEntry()]);
    expect(outcome.action).toBe('error');
    expect(outcome.message).toBe('');
    // Key must NOT be removed
    expect(localStorage.getItem('promo-track-pending-review')).toBe('session-1');
  });

  it('on 404 error: removes key and reports expired', async () => {
    localStorage.setItem('promo-track-pending-review', 'session-1');
    mockCheckStatus.mockRejectedValue(new Error('Review not found'));

    const outcome = await consumeReview([makeEntry()]);
    expect(outcome.action).toBe('error');
    expect(outcome.message).toContain('expired');
    expect(localStorage.getItem('promo-track-pending-review')).toBeNull();
  });

  it('reviewed + no comments: removes key', async () => {
    localStorage.setItem('promo-track-pending-review', 'session-1');
    mockCheckStatus.mockResolvedValue({ status: 'reviewed', comments: {} });

    const outcome = await consumeReview([makeEntry()]);
    expect(outcome.action).toBe('no-comments');
    expect(localStorage.getItem('promo-track-pending-review')).toBeNull();
  });

  it('reviewed + matched comments: removes key, reports success', async () => {
    localStorage.setItem('promo-track-pending-review', 'session-1');
    const entry = makeEntry({ id: 'e1' });
    mockCheckStatus.mockResolvedValue({ status: 'reviewed', comments: { e1: { text: 'Good' } } });
    mockGetSession.mockResolvedValue({ entries: [{ id: 'e1', title: 'Test' }] });

    const outcome = await consumeReview([entry]);
    expect(outcome.action).toBe('applied');
    expect(outcome.importResult!.matched).toHaveLength(1);
    expect(localStorage.getItem('promo-track-pending-review')).toBeNull();
  });

  it('reviewed + unmatched: keeps key, increments retry counter', async () => {
    localStorage.setItem('promo-track-pending-review', 'session-1');
    const entry = makeEntry({ id: 'different-id', title: 'Different' });
    mockCheckStatus.mockResolvedValue({ status: 'reviewed', comments: { 'gone-id': { text: 'Comment' } } });
    mockGetSession.mockResolvedValue({ entries: [{ id: 'gone-id', title: 'Gone Entry' }] });

    const outcome = await consumeReview([entry]);
    expect(outcome.action).toBe('retry');
    expect(localStorage.getItem('promo-track-pending-review')).toBe('session-1');
    expect(localStorage.getItem('promo-track-review-retry-count')).toBe('1');
  });

  it('after 5 failed matches: caps, stashes, removes key', async () => {
    localStorage.setItem('promo-track-pending-review', 'session-1');
    localStorage.setItem('promo-track-review-retry-count', '4'); // next will be 5
    const entry = makeEntry({ id: 'different-id', title: 'Different' });
    mockCheckStatus.mockResolvedValue({ status: 'reviewed', comments: { 'gone-id': { text: 'Unmatched feedback' } } });
    mockGetSession.mockResolvedValue({ entries: [{ id: 'gone-id', title: 'Gone Entry' }] });

    const outcome = await consumeReview([entry]);
    expect(outcome.action).toBe('capped');
    expect(localStorage.getItem('promo-track-pending-review')).toBeNull();
    expect(localStorage.getItem('promo-track-review-retry-count')).toBeNull();
    // Unmatched should be stashed
    const stashed = getUnmatchedComments();
    expect(stashed).toHaveLength(1);
    expect(stashed[0].text).toBe('Unmatched feedback');
  });
});

describe('unmatched comments storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('stash and retrieve', () => {
    const data = [{ sharedEntryId: 'e1', title: 'T', text: 'Comment' }];
    stashUnmatchedComments(data);
    expect(getUnmatchedComments()).toEqual(data);
  });

  it('clear removes data', () => {
    stashUnmatchedComments([{ sharedEntryId: 'e1', title: 'T', text: 'C' }]);
    clearUnmatchedComments();
    expect(getUnmatchedComments()).toEqual([]);
  });
});
