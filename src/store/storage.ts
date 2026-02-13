import { AppState } from '../types';

const STORAGE_KEY = 'promo-track-data';

const defaultState: AppState = {
  profile: {
    id: '1', name: '', email: '', role: '', level: 'L3', targetLevel: 'L4',
    proposedTitle: '', manager: '', team: '', startDate: new Date().toISOString().split('T')[0],
    targetPromotionDate: '', effectiveQuarter: '', steamMember: '', steamDirect: '', promotionApprover: '',
  },
  starr: [],
  metrics: [],
  projects: [],
  feedback: [],
  goals: [],
  scopeOfRole: '',
  bestReasonsNotToPromote: '',
  additionalInfo: '',
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return migrateState({ ...defaultState, ...parsed, profile: { ...defaultState.profile, ...parsed.profile } });
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDefaultState(): AppState {
  return JSON.parse(JSON.stringify(defaultState));
}

function migrateState(state: AppState): AppState {
  // Migrate metrics without notes/channel fields
  state.metrics = state.metrics.map((m: any) => ({ notes: '', channel: '', ...m }));
  // Migrate feedback without new fields
  state.feedback = state.feedback.map((f: any) => ({
    fromTitle: '', reasonsNotToSupport: '', supportsPromotion: true, steamDirect: '', ...f,
  }));
  return state;
}
