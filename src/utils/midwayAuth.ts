/**
 * Midway authentication client.
 * Fetches an id_token from midway-auth silently (cookie-based SSO).
 * In-memory cache only — tokens are never persisted to localStorage.
 * On localhost or when Midway is unreachable, returns null gracefully.
 */

// --- Types ---
interface JwtPayload {
  exp: number;
  sub: string;
  [key: string]: unknown;
}

// --- State ---
let cachedToken: string | null = null;
let cachedExpiry = 0; // Unix seconds
let tokenAvailable = true; // optimistic until proven otherwise

// --- Helpers ---

/** Decode a JWT payload without verification (server verifies). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → base64 → decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

// --- Core ---

async function fetchToken(): Promise<string | null> {
  if (isLocalhost()) {
    tokenAvailable = false;
    return null;
  }

  const url =
    'https://midway-auth.amazon.com/SSO?response_type=id_token&client_id=' +
    encodeURIComponent(window.location.host) +
    '&redirect_uri=' +
    encodeURIComponent(window.location.origin) +
    '&scope=openid&nonce=' +
    crypto.randomUUID();

  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      console.warn('[midwayAuth] Token fetch failed:', res.status);
      tokenAvailable = false;
      return null;
    }
    const body = await res.text();
    const token = body.trim();
    if (!token) {
      tokenAvailable = false;
      return null;
    }

    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) {
      tokenAvailable = false;
      return null;
    }

    cachedToken = token;
    cachedExpiry = payload.exp;
    tokenAvailable = true;
    return token;
  } catch (err) {
    console.warn('[midwayAuth] Token fetch error:', err);
    tokenAvailable = false;
    return null;
  }
}

/**
 * Returns a valid id_token or null if unavailable.
 * Uses in-memory cache; refreshes 60s before expiry.
 */
export async function getIdToken(): Promise<string | null> {
  if (!tokenAvailable && isLocalhost()) return null;

  const now = Math.floor(Date.now() / 1000);
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedExpiry - now > 60) {
    return cachedToken;
  }

  return fetchToken();
}

/**
 * Force-refresh the token. Called by apiFetch on 401 response.
 * Returns the new token or null.
 */
export async function refreshOnUnauthorized(): Promise<string | null> {
  cachedToken = null;
  cachedExpiry = 0;
  return fetchToken();
}

/** Whether a token is (or was recently) available. */
export function isTokenAvailable(): boolean {
  return tokenAvailable;
}

/** Reset internal state — for testing only. */
export function _resetForTesting(): void {
  cachedToken = null;
  cachedExpiry = 0;
  tokenAvailable = true;
}
