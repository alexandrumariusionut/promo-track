import { DEV_USER } from '../config';

declare global {
  interface Window {
    harmony?: {
      user?: { lookup(): Promise<{ login: string; firstName: string; lastName: string; primaryEmail: string }> };
      api?: { getUserName(): string };
    };
  }
}

export async function getHarmonyUser(): Promise<{ login: string; firstName?: string; lastName?: string; email?: string } | null> {
  if (DEV_USER) return { login: DEV_USER, firstName: 'Dev', lastName: 'User', email: `${DEV_USER}@example.com` };
  try {
    if (window.harmony?.user?.lookup) {
      const u = await window.harmony.user.lookup();
      return { login: u.login, firstName: u.firstName, lastName: u.lastName, email: u.primaryEmail };
    }
    if (window.harmony?.api?.getUserName) {
      return { login: window.harmony.api.getUserName() };
    }
  } catch {
    // Harmony shell not available (local dev or non-Harmony host)
  }
  return null;
}
