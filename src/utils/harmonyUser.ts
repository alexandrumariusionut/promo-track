declare global {
  interface Window {
    harmony?: {
      user?: { lookup(): Promise<{ login: string; firstName: string; lastName: string; primaryEmail: string }> };
      api?: { getUserName(): string };
    };
  }
}

export async function getHarmonyUser(): Promise<{ login: string; firstName?: string; lastName?: string; email?: string } | null> {
  try {
    if (window.harmony?.user?.lookup) {
      const u = await window.harmony.user.lookup();
      return { login: u.login, firstName: u.firstName, lastName: u.lastName, email: u.primaryEmail };
    }
    if (window.harmony?.api?.getUserName) {
      return { login: window.harmony.api.getUserName() };
    }
  } catch {}
  return null;
}
