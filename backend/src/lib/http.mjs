/**
 * Shared HTTP helpers for all Lambda handlers.
 *
 * CORS is handled by the HTTP API's CorsConfiguration in template.yaml, so
 * handlers only need to set Content-Type.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function respond(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export function error(statusCode, message, extra = {}) {
  return respond(statusCode, { error: message, ...extra });
}

/**
 * Log the real error server-side and return a generic 500 so internal details
 * (table names, SDK messages, stack fragments) never reach the client.
 */
export function serverError(err, context = {}) {
  console.error(JSON.stringify({ level: 'error', message: err?.message, name: err?.name, ...context }));
  return error(500, 'Internal server error');
}

/** Verified Midway alias injected by the Lambda authorizer. */
export function callerAlias(event) {
  return event.requestContext?.authorizer?.lambda?.alias || null;
}

export function parseJsonBody(event) {
  try {
    return { body: JSON.parse(event.body || '') };
  } catch {
    return { response: error(400, 'Invalid JSON body') };
  }
}

// ── userdata ────────────────────────────────────────────────────────────────

/**
 * Ensure the path userId belongs to the authenticated caller.
 * Returns a response to send when the check fails, otherwise null.
 */
export function assertOwner(event, alias) {
  const { userId } = event.pathParameters || {};
  if (!userId) return error(400, 'userId is required');
  if (userId !== alias) return error(403, 'Forbidden: userId does not match authenticated identity');
  return null;
}

// ── review ──────────────────────────────────────────────────────────────────

/**
 * Whether `alias` may access a review session.
 * If the owner restricted the session to named reviewers, only the owner and
 * those reviewers may read/comment; otherwise anyone with the link can.
 */
export function canAccessReview(item, alias) {
  if (!item) return false;
  if (item.ownerAlias && item.ownerAlias === alias) return true;
  const reviewers = Array.isArray(item.reviewerAliases) ? item.reviewerAliases : [];
  if (reviewers.length === 0) return true;
  return reviewers.includes(alias);
}

export function isExpired(item) {
  return typeof item?.expiresAt === 'number' && item.expiresAt < Math.floor(Date.now() / 1000);
}
