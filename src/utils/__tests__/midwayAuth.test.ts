import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getIdToken, refreshOnUnauthorized, isTokenAvailable, decodeJwtPayload, _resetForTesting } from '../midwayAuth';

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'test-nonce-uuid' },
  writable: true,
});

describe('midwayAuth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _resetForTesting();
  });

  describe('decodeJwtPayload', () => {
    it('decodes a valid JWT payload', () => {
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '');
      const payload = btoa(JSON.stringify({ sub: 'testuser', exp: 9999999999 })).replace(/=/g, '');
      const token = `${header}.${payload}.fake-signature`;

      const result = decodeJwtPayload(token);
      expect(result).toEqual({ sub: 'testuser', exp: 9999999999 });
    });

    it('returns null for malformed token', () => {
      expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(decodeJwtPayload('')).toBeNull();
    });

    it('handles base64url padding correctly', () => {
      const payload = { sub: 'user-with-long-alias-name', exp: 1700000000 };
      const b64 = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const token = `header.${b64}.sig`;

      const result = decodeJwtPayload(token);
      expect(result?.sub).toBe('user-with-long-alias-name');
    });
  });

  describe('getIdToken on localhost', () => {
    it('returns null on localhost', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', host: 'localhost', origin: 'http://localhost:5173' },
        writable: true,
        configurable: true,
      });

      const token = await getIdToken();
      expect(token).toBeNull();
      expect(isTokenAvailable()).toBe(false);
    });
  });

  describe('getIdToken on non-localhost', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'promo-track.harmony.a2z.com',
          host: 'promo-track.harmony.a2z.com',
          origin: 'https://promo-track.harmony.a2z.com',
        },
        writable: true,
        configurable: true,
      });
    });

    it('fetches and caches token successfully', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ sub: 'testuser', exp: futureExp })).replace(/=/g, '');
      const fakeToken = `header.${payload}.sig`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => fakeToken,
      });
      vi.stubGlobal('fetch', mockFetch);

      const token = await getIdToken();
      expect(token).toBe(fakeToken);
      expect(isTokenAvailable()).toBe(true);

      // Second call uses cache (no additional fetch)
      const token2 = await getIdToken();
      expect(token2).toBe(fakeToken);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns null when fetch response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });
      vi.stubGlobal('fetch', mockFetch);

      const token = await getIdToken();
      expect(token).toBeNull();
      expect(isTokenAvailable()).toBe(false);
    });

    it('returns null when fetch throws a network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      const token = await getIdToken();
      expect(token).toBeNull();
      expect(isTokenAvailable()).toBe(false);
    });
  });

  describe('refreshOnUnauthorized', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'promo-track.harmony.a2z.com',
          host: 'promo-track.harmony.a2z.com',
          origin: 'https://promo-track.harmony.a2z.com',
        },
        writable: true,
        configurable: true,
      });
    });

    it('clears cache and fetches a new token', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ sub: 'testuser', exp: futureExp })).replace(/=/g, '');
      const newToken = `refreshed.${payload}.sig`;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => newToken,
      });
      vi.stubGlobal('fetch', mockFetch);

      const token = await refreshOnUnauthorized();
      expect(token).toBe(newToken);
    });
  });
});
