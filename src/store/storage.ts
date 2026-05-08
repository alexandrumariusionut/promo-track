import { AppState, Metric } from '../types';

const STORAGE_KEY = 'promo-track-data';
const RESET_FLAG_KEY = 'promo-track-was-reset';

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
    if (localStorage.getItem(RESET_FLAG_KEY)) {
      localStorage.removeItem(RESET_FLAG_KEY);
      return { ...defaultState };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateState({ ...defaultState, ...parsed, profile: { ...defaultState.profile, ...parsed.profile } });
    }
    // If no plaintext data found, check for old encrypted data — can't decrypt, so return defaults
    return { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDefaultState(): AppState {
  return JSON.parse(JSON.stringify(defaultState));
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('promo-track-encrypted');
  localStorage.removeItem('promo-track-pass-hash');
  localStorage.removeItem('promo-track-lock-ts');
  localStorage.setItem(RESET_FLAG_KEY, '1');
}

function migrateState(state: AppState): AppState {
  // Migrate old 'starr' key to 'star'
  if (!state.star && Array.isArray((state as any).starr)) {
    state.star = (state as any).starr;
    delete (state as any).starr;
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
  return state;
}
