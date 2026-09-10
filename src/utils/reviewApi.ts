import { apiFetch } from './apiFetch';
import { REVIEW_API_URL as REVIEW_API } from '../config';

export async function createReviewSession(data: { entries: unknown[], employeeName: string, targetLevel: string }): Promise<{ sessionId: string; reviewUrl: string }> {
  const res = await apiFetch(`${REVIEW_API}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create review session');
  return res.json();
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
