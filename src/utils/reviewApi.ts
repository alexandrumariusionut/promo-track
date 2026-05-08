const REVIEW_API = localStorage.getItem('promo-track-review-api') || 'https://1jvjxaiuig.execute-api.eu-west-1.amazonaws.com/prod';

export async function createReviewSession(data: { entries: any[], employeeName: string, targetLevel: string }): Promise<{ sessionId: string; reviewUrl: string }> {
  const res = await fetch(`${REVIEW_API}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create review session');
  return res.json();
}

export async function getReview(sessionId: string) {
  const res = await fetch(`${REVIEW_API}/reviews/${sessionId}`);
  if (!res.ok) throw new Error('Review not found');
  return res.json();
}

export async function submitComments(sessionId: string, comments: Record<string, { text: string }>) {
  const res = await fetch(`${REVIEW_API}/reviews/${sessionId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comments }),
  });
  if (!res.ok) throw new Error('Failed to submit comments');
  return res.json();
}

export async function checkReviewStatus(sessionId: string) {
  const res = await fetch(`${REVIEW_API}/reviews/${sessionId}/status`);
  if (!res.ok) throw new Error('Review not found');
  return res.json();
}
