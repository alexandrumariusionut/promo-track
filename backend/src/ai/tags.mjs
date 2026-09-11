/**
 * GET /ai/tags — Ollama-compatible model listing, used by the client's
 * "check connection" button. Returns the allowlisted Bedrock model ids.
 */
import { respond, error, callerAlias } from '../lib/http.mjs';

export const handler = async (event) => {
  if (!callerAlias(event)) return error(401, 'Unauthorized');
  const models = (process.env.ALLOWED_MODELS || process.env.DEFAULT_MODEL || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
  return respond(200, { models });
};
