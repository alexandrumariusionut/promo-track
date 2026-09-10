/**
 * Shared HTTP helpers for userdata Lambda handlers.
 * CORS is handled by the HTTP API's CorsConfiguration in template.yaml.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function respond(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export function error(statusCode, message, extra = {}) {
  return respond(statusCode, { error: message, ...extra });
}

export function serverError(err, context = {}) {
  console.error(JSON.stringify({ level: 'error', message: err?.message, name: err?.name, ...context }));
  return error(500, 'Internal server error');
}

export function callerAlias(event) {
  return event.requestContext?.authorizer?.lambda?.alias || null;
}

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
