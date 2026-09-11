/**
 * Runtime configuration.
 *
 * Endpoints are resolved at BUILD time from Vite environment variables so they
 * cannot be tampered with from the browser (a localStorage override would let
 * any script redirect authenticated requests, including the Midway Bearer
 * token, to an arbitrary host).
 *
 * Override locally with a `.env.local` file, e.g.
 *   VITE_REVIEW_API_URL=http://localhost:3001
 *   VITE_USERDATA_API_URL=http://localhost:3002
 *   VITE_AI_API_URL=/api/ai
 */

const env = import.meta.env;

export const REVIEW_API_URL: string =
  env.VITE_REVIEW_API_URL || 'https://zk0njdczql.execute-api.eu-west-1.amazonaws.com/prod';

export const USERDATA_API_URL: string =
  env.VITE_USERDATA_API_URL || 'https://zk0njdczql.execute-api.eu-west-1.amazonaws.com/prod';

/**
 * AI proxy. Lives on the same API as /reviews and /userdata (behind the Midway
 * authorizer) so the default is derived from USERDATA_API_URL. In dev,
 * VITE_AI_API_URL=/api/ai proxies to a local Ollama instead.
 */
export const AI_API_URL: string =
  env.VITE_AI_API_URL || `${USERDATA_API_URL}/ai`;

export const AI_DEFAULT_MODEL: string =
  env.VITE_AI_MODEL || 'eu.anthropic.claude-haiku-4-5-20251001-v1:0';

/**
 * Local-development identity. Only honoured by the Vite dev server (`import.meta.env.DEV`);
 * production builds ignore it entirely. Lets you exercise cloud sync and review sharing
 * against the local backend harness, which reads the alias from the X-Dev-Alias header.
 */
export const DEV_USER: string | null = env.DEV && env.VITE_DEV_USER ? String(env.VITE_DEV_USER) : null;

/** Product name used in titles and headings. */
export const APP_NAME = 'PromoTrack';
