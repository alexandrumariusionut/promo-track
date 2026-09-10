const ALIAS_RE = /^[a-z0-9._-]{1,64}$/i;

/** Accepts "alias", "alias@", "alias@amazon.com" and returns the bare lowercase alias, or null if invalid. */
export function normalizeAlias(input: string): string | null {
  const alias = input.trim().toLowerCase().split('@')[0];
  return ALIAS_RE.test(alias) ? alias : null;
}
