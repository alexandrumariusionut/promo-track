/**
 * Authenticated fetch wrapper.
 * Attaches Midway id_token as Bearer when available; retries once on 401.
 * Falls through gracefully when no token is available (dev/localhost).
 */
import { getIdToken, refreshOnUnauthorized, isTokenAvailable } from './midwayAuth';
import { DEV_USER } from '../config';

// --- Error types ---

export class AuthUnavailableError extends Error {
  constructor(message = 'Authentication unavailable') {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

export class AuthDeniedError extends Error {
  constructor(message = 'Authentication denied after retry') {
    super(message);
    this.name = 'AuthDeniedError';
  }
}

/**
 * Fetch with automatic Bearer token attachment and 401 retry.
 * Throws AuthUnavailableError if token is needed but unavailable.
 * Throws AuthDeniedError if retry after refresh still gets 401.
 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getIdToken();

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (DEV_USER) {
    // Dev-only: the local backend harness derives identity from this header
    headers.set('X-Dev-Alias', DEV_USER);
  }

  const response = await fetch(url, { ...init, headers });

  // If 401 and we had a token, try refreshing once
  if (response.status === 401 && isTokenAvailable()) {
    const newToken = await refreshOnUnauthorized();
    if (!newToken) {
      throw new AuthDeniedError('Session expired and refresh failed');
    }

    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set('Authorization', `Bearer ${newToken}`);
    const retryResponse = await fetch(url, { ...init, headers: retryHeaders });

    if (retryResponse.status === 401) {
      throw new AuthDeniedError('Authentication denied after token refresh');
    }
    return retryResponse;
  }

  return response;
}
