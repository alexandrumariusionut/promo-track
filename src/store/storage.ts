import { AppState, Metric, STAREntry } from '../types';
import {
  GUIDELINES,
  COMPETENCY_TO_GUIDELINE_MAP,
  RESPONSIBILITY_TO_GUIDELINE_MAP,
  RESPONSIBILITY_TO_THEME_MAP,
} from '../data/levelGuidelines';

// --- Key management ---

const BASE_PREFIX = 'promo-track';
const MIGRATION_DONE_KEY = 'promo-track-migration-done';

// Keys that should be per-user (contain user-specific data)
const USER_SCOPED_SUFFIXES = [
  'data',
  'pending-review',
  'review-retry-count',
  'unmatched-review',
  'dismissed-tips',
  'trophy-shown',
  'was-reset',
];

// Keys that remain device-level (unscoped)
// promo-track-ai-config, promo-track-onboarding, promo-track-theme,
// promo-track-review-api, promo-track-userdata-api

let currentUserAlias: string | null = null;

/**
 * Set the current user alias for localStorage namespacing.
 * Should be called once during app boot after Harmony returns the login.
 */
export function setStorageUserAlias(alias: string): void {
  currentUserAlias = alias;
  migrateUnscopedKeys(alias);
}

/** Get the storage key for a given suffix, namespaced to user when available. */
export function getUserKey(suffix: string): string {
  if (currentUserAlias) {
    return `${BASE_PREFIX}-${currentUserAlias}:${suffix}`;
  }
  return `${BASE_PREFIX}-${suffix}`;
}

/** Migrate legacy unscoped keys to user-namespaced keys (one-time per user). */
function migrateUnscopedKeys(alias: string): void {
  const migrationMarker = `${BASE_PREFIX}-${alias}:${MIGRATION_DONE_KEY}`;
  if (localStorage.getItem(migrationMarker)) return;

  for (const suffix of USER_SCOPED_SUFFIXES) {
    const oldKey = `${BASE_PREFIX}-${suffix}`;
    const newKey = `${BASE_PREFIX}-${alias}:${suffix}`;
    const value = localStorage.getItem(oldKey);
    if (value !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value);
    }
  }

  // Mark migration complete — legacy keys will be removed
  localStorage.setItem(migrationMarker, '1');

  // Remove legacy keys after successful migration
  for (const suffix of USER_SCOPED_SUFFIXES) {
    const oldKey = `${BASE_PREFIX}-${suffix}`;
    localStorage.removeItem(oldKey);
  }
  // Also clean up old encryption-era keys
  localStorage.removeItem('promo-track-encrypted');
  localStorage.removeItem('promo-track-pass-hash');
  localStorage.removeItem('promo-track-lock-ts');
}

// --- Storage key accessor for external modules ---

/** Get the correct key for pending-review session id. */
export function getPendingReviewKey(): string {
  return getUserKey('pending-review');
}

/** Get the correct key for review retry count. */
export function getRetryCountKey(): string {
  return getUserKey('review-retry-count');
}

/** Get the correct key for unmatched reviews. */
export function getUnmatchedReviewKey(): string {
  return getUserKey('unmatched-review');
}

/** Get the correct key for dismissed tips. */
export function getDismissedTipsKey(): string {
  return getUserKey('dismissed-tips');
}

/** Get the correct key for trophy shown flag. */
export function getTrophyShownKey(): string {
  return getUserKey('trophy-shown');
}

/** Set of all valid guideline ids across all levels */
const ALL_GUIDELINE_IDS = new Set(
  Object.values(GUIDELINES).flatMap(list => list.map(g => g.id))
);

const defaultState: AppState = {
  profile: {
    id: '1', name: '', email: '', role: '', level: 'L3', targetLevel: 'L4',
    proposedTitle: '', manager: '', team: '', startDate: new Date().toISOString().split('T')[0],
    targetPromotionDate: '', effectiveQuarter: '', steamMember: '', steamDirect: '', promotionApprover: '',
  },
  star: [],
  metrics: [],
  scopeOfRole: '',
  bestReasonsNotToPromote: '',
  additionalInfo: '',
};

export function loadState(): AppState {
  try {
    const resetKey = getUserKey('was-reset');
    if (localStorage.getItem(resetKey)) {
      localStorage.removeItem(resetKey);
      return { ...defaultState };
    }
    const storageKey = getUserKey('data');
    const raw = localStorage.getItem(storageKey);
    if (raw) return normalizeState(JSON.parse(raw));
    // If no plaintext data found, check for old encrypted data — can't decrypt, so return defaults
    return { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

/**
 * Fill in defaults and run migrations on state loaded from ANY source
 * (localStorage, cloud record, imported file). Never trust a persisted shape
 * to be complete: older clients or partial writes may omit arrays.
 */
export function normalizeState(input: unknown): AppState {
  const parsed = (typeof input === 'object' && input !== null ? input : {}) as Partial<AppState> & {
    profile?: Partial<AppState['profile']>;
    starr?: STAREntry[]; // legacy key
  };
  const star = Array.isArray(parsed.star) ? parsed.star : (Array.isArray(parsed.starr) ? parsed.starr : []);
  const { starr: _legacy, ...rest } = parsed;
  void _legacy;
  const merged: AppState = {
    ...defaultState,
    ...rest,
    profile: { ...defaultState.profile, ...(parsed.profile || {}) },
    star,
    metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
  };
  return migrateState(merged);
}

export function saveState(state: AppState): void {
  const storageKey = getUserKey('data');
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function getDefaultState(): AppState {
  return JSON.parse(JSON.stringify(defaultState));
}

export function clearAllData(): void {
  const storageKey = getUserKey('data');
  localStorage.removeItem(storageKey);
  localStorage.removeItem('promo-track-encrypted');
  localStorage.removeItem('promo-track-pass-hash');
  localStorage.removeItem('promo-track-lock-ts');
  const resetKey = getUserKey('was-reset');
  localStorage.setItem(resetKey, '1');
}

function migrateState(state: AppState): AppState {
  // Migrate old 'starr' key to 'star'
  const raw = state as unknown as Record<string, unknown>;
  if (!state.star && Array.isArray(raw.starr)) {
    state.star = raw.starr as STAREntry[];
    delete raw.starr;
  }
  state.metrics = state.metrics.map((m: Partial<Metric>) => ({ 
    id: m.id || '', 
    type: m.type || '', 
    value: m.value || 0, 
    target: m.target || 0, 
    date: m.date || '', 
    period: m.period || 'monthly', 
    notes: m.notes || '', 
    channel: m.channel || '' 
  }));
  // Migrate legacy levelDimension string → dimensions array
  state.star = state.star.map((entry) => {
    if (entry.levelDimension && (!entry.dimensions || entry.dimensions.length === 0)) {
      return { ...entry, dimensions: [entry.levelDimension] };
    }
    return entry;
  });
  // Migrate old competency ids AND responsibility ids → guideline ids
  state.star = migrateToGuidelineIds(state.star);
  return state;
}

/**
 * Maps old competency ids and responsibility ids to guideline ids on entries' dimensions arrays.
 * Also moves responsibility ids that map to themes (e.g. hiring-training-mentorship → mentoring-coaching)
 * into the entry's themes array.
 * Preserves ids that are already valid guideline ids. Deduplicates after mapping. Idempotent.
 */
export function migrateToGuidelineIds(entries: STAREntry[]): STAREntry[] {
  return entries.map((entry) => {
    if (!entry.dimensions || entry.dimensions.length === 0) return entry;

    const mappedDimensions = new Set<string>();
    const themes = new Set<string>(entry.themes || []);

    for (const dimId of entry.dimensions) {
      if (ALL_GUIDELINE_IDS.has(dimId)) {
        // Already a valid guideline id — keep it
        mappedDimensions.add(dimId);
      } else if (COMPETENCY_TO_GUIDELINE_MAP[dimId]) {
        // Old competency id → guideline id
        mappedDimensions.add(COMPETENCY_TO_GUIDELINE_MAP[dimId]);
      } else if (RESPONSIBILITY_TO_GUIDELINE_MAP[dimId]) {
        // Responsibility id → guideline id
        mappedDimensions.add(RESPONSIBILITY_TO_GUIDELINE_MAP[dimId]);
      } else if (RESPONSIBILITY_TO_THEME_MAP[dimId]) {
        // Responsibility id → bonus theme (not a guideline row)
        themes.add(RESPONSIBILITY_TO_THEME_MAP[dimId]);
      } else {
        // Unknown id — keep it (don't drop data we don't recognise)
        mappedDimensions.add(dimId);
      }
    }

    const updatedThemes = [...themes];
    return {
      ...entry,
      dimensions: [...mappedDimensions],
      ...(updatedThemes.length > 0 ? { themes: updatedThemes } : {}),
    };
  });
}
