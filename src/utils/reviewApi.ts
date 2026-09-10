import { apiFetch } from './apiFetch';
import { REVIEW_API_URL as REVIEW_API } from '../config';

export interface CreateReviewInput {
  entries: unknown[];
  employeeName: string;
  targetLevel: string;
  /** Aliases allowed to open the review. Empty/omitted = anyone with the link. */
  reviewerAliases?: string[];
}

export async function createReviewSession(data: CreateReviewInput): Promise<{ sessionId: string; reviewUrl: string }> {
  const res = await apiFetch(`${REVIEW_API}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create review session');
  return res.json();
}

/** Owner-only: invalidate a shared review link. Resolves true if it existed. */
export async function revokeReviewSession(sessionId: string): Promise<boolean> {
  const res = await apiFetch(`${REVIEW_API}/reviews/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Failed to revoke review link (${res.status})`);
  return true;
}

export async function getReview(sessionId: string) {
  const res = await apiFetch(`${REVIEW_API}/reviews/${sessionId}`);
  if (!res.ok) throw new Error('Review not found');
  return res.json();
}

export async function submitComments(sessionId: string, comments: Record<string, { text: string }>) {
  const res = await apiFetch(`${REVIEW_API}/reviews/${sessionId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comments }),
  });
  if (!res.ok) throw new Error('Failed to submit comments');
  return res.json();
}

export async function checkReviewStatus(sessionId: string) {
  const res = await apiFetch(`${REVIEW_API}/reviews/${sessionId}/status`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Review not found');
    throw new Error(`Review status check failed (${res.status})`);
  }
  return res.json();
}

export async function getReviewSession(sessionId: string) {
  const res = await apiFetch(`${REVIEW_API}/reviews/${sessionId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Review not found or expired');
    throw new Error(`Failed to fetch review session (${res.status})`);
  }
  return res.json();
}
