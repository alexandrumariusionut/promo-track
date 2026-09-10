import { apiFetch } from './apiFetch';
import { USERDATA_API_URL as USERDATA_API } from '../config';

export interface UserDataRecord {
  data: unknown | null;
  version: number;
  updatedAt: number | null;
}

export class ConflictError extends Error {
  constructor(message = 'Portfolio was modified elsewhere') {
    super(message);
    this.name = 'ConflictError';
  }
}

export async function loadUserData(userId: string): Promise<UserDataRecord> {
  const res = await apiFetch(`${USERDATA_API}/userdata/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to load user data');
  const body = await res.json();
  return {
    data: body.data ?? null,
    version: typeof body.version === 'number' ? body.version : 0,
    updatedAt: typeof body.updatedAt === 'number' ? body.updatedAt : null,
  };
}

/**
 * Save the portfolio. When `expectedVersion` is provided the server rejects the
 * write with 409 if someone else saved in between (another tab or device).
 * Resolves with the new version on success.
 */
export async function saveUserData(userId: string, data: unknown, expectedVersion?: number): Promise<number> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (expectedVersion !== undefined) headers['If-Match'] = String(expectedVersion);

  const res = await apiFetch(`${USERDATA_API}/userdata/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw new ConflictError();
  if (!res.ok) throw new Error(`Failed to save user data (${res.status})`);
  const body = await res.json();
  return typeof body.version === 'number' ? body.version : (expectedVersion ?? 0) + 1;
}
