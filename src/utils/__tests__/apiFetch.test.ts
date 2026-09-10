import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the midwayAuth module
vi.mock('../midwayAuth', () => ({
  getIdToken: vi.fn(),
  refreshOnUnauthorized: vi.fn(),
  isTokenAvailable: vi.fn(),
}));

import { apiFetch, AuthDeniedError } from '../apiFetch';
import { getIdToken, refreshOnUnauthorized, isTokenAvailable } from '../midwayAuth';

const mockGetIdToken = vi.mocked(getIdToken);
const mockRefreshOnUnauthorized = vi.mocked(refreshOnUnauthorized);
const mockIsTokenAvailable = vi.mocked(isTokenAvailable);

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('test-token');
    mockIsTokenAvailable.mockReturnValue(true);
  });

  it('attaches Authorization header when token is available', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('https://api.example.com/data');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/data');
    const headers = opts.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('makes request without auth header when token is null', async () => {
    mockGetIdToken.mockResolvedValue(null);
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('https://api.example.com/data');

    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('retries on 401 with refreshed token', async () => {
    mockRefreshOnUnauthorized.mockResolvedValue('refreshed-token');
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const res = await apiFetch('https://api.example.com/data');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockRefreshOnUnauthorized).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);

    // Verify retry used refreshed token
    const [, retryOpts] = mockFetch.mock.calls[1];
    const retryHeaders = retryOpts.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer refreshed-token');
  });

  it('throws AuthDeniedError when refresh returns null', async () => {
    mockRefreshOnUnauthorized.mockResolvedValue(null);
    mockIsTokenAvailable.mockReturnValue(true);
    const mockFetch = vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('https://api.example.com/data')).rejects.toThrow(AuthDeniedError);
    expect(mockRefreshOnUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('throws AuthDeniedError when retry also returns 401', async () => {
    mockRefreshOnUnauthorized.mockResolvedValue('refreshed-token');
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response('Still unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('https://api.example.com/data')).rejects.toThrow(AuthDeniedError);
  });

  it('does not retry on 401 when token was not available', async () => {
    mockIsTokenAvailable.mockReturnValue(false);
    mockGetIdToken.mockResolvedValue(null);
    const mockFetch = vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', mockFetch);

    const res = await apiFetch('https://api.example.com/data');

    expect(res.status).toBe(401);
    expect(mockRefreshOnUnauthorized).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('preserves existing headers from init', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    await apiFetch('https://api.example.com/data', {
      headers: { 'Content-Type': 'application/json' },
    });

    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });
});
