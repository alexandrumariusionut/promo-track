import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import { AppState, STAREntry, Metric, UserProfile, ActivityLogEntry, DimensionAnalysis, AISuggestedDimension } from '../types';
import { loadState, saveState, normalizeState } from './storage';
import { saveUserData, loadUserData, ConflictError } from '../utils/userDataApi';
import { AuthUnavailableError, AuthDeniedError } from '../utils/apiFetch';
import { isTokenAvailable } from '../utils/midwayAuth';
import { showError } from '../components/ErrorSnackbar';

function logEntry(action: string, detail: string): ActivityLogEntry {
  return { timestamp: new Date().toISOString(), action, detail };
}

type Action =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'ADD_STAR'; payload: STAREntry }
  | { type: 'UPDATE_STAR'; payload: STAREntry }
  | { type: 'DELETE_STAR'; payload: string }
  | { type: 'ADD_METRIC'; payload: Metric }
  | { type: 'DELETE_METRIC'; payload: string }
  | { type: 'IMPORT_METRICS'; payload: Metric[] }
  | { type: 'SET_SCOPE_OF_ROLE'; payload: string }
  | { type: 'SET_BEST_REASONS'; payload: string }
  | { type: 'SET_ADDITIONAL_INFO'; payload: string }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'RESET_STATE'; payload: AppState }
  | { type: 'SET_DIMENSION_ANALYSIS'; payload: DimensionAnalysis }
  | { type: 'SET_ENTRY_AI_SUGGESTIONS'; payload: { entryId: string; suggestions: AISuggestedDimension[] } };

function reducer(state: AppState, action: Action): AppState {
  const log = state.activityLog || [];
  let next: AppState;
  let entry: ActivityLogEntry | null = null;

  switch (action.type) {
    case 'SET_PROFILE':
      entry = logEntry('Profile Updated', `Updated profile information`);
      next = { ...state, profile: action.payload };
      break;
    case 'ADD_STAR':
      entry = logEntry('STAR Added', `Added "${action.payload.title}"`);
      next = { ...state, star: [...state.star, action.payload] };
      break;
    case 'UPDATE_STAR': {
      const old = state.star.find(s => s.id === action.payload.id);
      const hasNewComments = (action.payload.reviewComments?.length || 0) > (old?.reviewComments?.length || 0);
      entry = logEntry(
        hasNewComments ? 'Review Comments Imported' : 'STAR Updated',
        hasNewComments ? `Imported comments for "${action.payload.title}"` : `Updated "${action.payload.title}"`
      );
      next = { ...state, star: state.star.map(s => s.id === action.payload.id ? action.payload : s) };
      break;
    }
    case 'DELETE_STAR': {
      const deleted = state.star.find(s => s.id === action.payload);
      entry = logEntry('STAR Deleted', `Deleted "${deleted?.title || 'entry'}"`);
      next = { ...state, star: state.star.filter(s => s.id !== action.payload) };
      break;
    }
    case 'ADD_METRIC':
      entry = logEntry('Metric Added', `Added ${action.payload.type} metric`);
      next = { ...state, metrics: [...state.metrics, action.payload] };
      break;
    case 'DELETE_METRIC':
      entry = logEntry('Metric Deleted', `Removed a metric`);
      next = { ...state, metrics: state.metrics.filter(m => m.id !== action.payload) };
      break;
    case 'IMPORT_METRICS':
      entry = logEntry('Metrics Imported', `Imported ${action.payload.length} metrics`);
      next = { ...state, metrics: [...state.metrics, ...action.payload] };
      break;
    case 'SET_SCOPE_OF_ROLE':
      entry = logEntry('Scope of Role Updated', `Updated scope of role narrative`);
      next = { ...state, scopeOfRole: action.payload };
      break;
    case 'SET_BEST_REASONS':
      entry = logEntry('Best Reasons Updated', `Updated best reasons not to promote`);
      next = { ...state, bestReasonsNotToPromote: action.payload };
      break;
    case 'SET_ADDITIONAL_INFO':
      entry = logEntry('Additional Info Updated', `Updated additional information`);
      next = { ...state, additionalInfo: action.payload };
      break;
    case 'LOAD_STATE':
      entry = logEntry('Portfolio Imported', `Loaded portfolio data`);
      next = action.payload;
      break;
    case 'RESET_STATE':
      return { ...action.payload, activityLog: [] };
    case 'SET_DIMENSION_ANALYSIS':
      next = { ...state, dimensionAnalysis: action.payload };
      break;
    case 'SET_ENTRY_AI_SUGGESTIONS': {
      const { entryId, suggestions } = action.payload;
      next = {
        ...state,
        star: state.star.map(s =>
          s.id === entryId
            ? { ...s, aiSuggestedDimensions: suggestions.length > 0 ? suggestions : undefined }
            : s,
        ),
      };
      break;
    }
    default:
      return state;
  }

  return { ...next, activityLog: [...(next.activityLog || log), ...(entry ? [entry] : [])] };
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  userId: string | null;
  /** True when the last cloud save was rejected because another device/tab saved first. */
  syncConflict: boolean;
  /** Discard local changes and reload the newer cloud copy. */
  reloadFromCloud: () => Promise<void>;
  /** Keep local changes and overwrite the cloud copy. */
  forceCloudSave: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const CLOUD_SAVE_DEBOUNCE_MS = 2000;
const LOCAL_AUTOSAVE_MS = 5 * 60 * 1000;

export function AppProvider({ children, initialState, initialVersion = 0, userId }: {
  children: ReactNode;
  initialState?: AppState;
  /** Version of the cloud record `initialState` came from (0 when none). */
  initialVersion?: number;
  userId?: string | null;
}) {
  const [state, dispatch] = useReducer(reducer, initialState || loadState());
  const [syncConflict, setSyncConflict] = useState(false);
  const stateRef = useRef(state);
  const versionRef = useRef(initialVersion);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep a ref to the latest state for timers (updated in an effect, not during render)
  useEffect(() => { stateRef.current = state; }, [state]);

  // Persist to localStorage on every state change (fallback)
  useEffect(() => {
    saveState(state);
  }, [state]);

  const pushToCloud = useCallback(async (force = false) => {
    if (!userId) return;
    try {
      const newVersion = await saveUserData(userId, stateRef.current, force ? undefined : versionRef.current);
      versionRef.current = newVersion;
      setSyncConflict(false);
    } catch (err) {
      if (err instanceof ConflictError) {
        // Do not clobber newer data; let the user decide.
        setSyncConflict(true);
      } else if (err instanceof AuthUnavailableError || err instanceof AuthDeniedError) {
        // Non-blocking: localStorage still works; show snackbar only on deployed hosts
        if (!isTokenAvailable()) {
          console.warn('[AppContext] Cloud save skipped — Midway token unavailable');
        } else {
          showError('Your Amazon session needs refreshing — please reload');
        }
      }
      // Other errors silently ignored (transient network issues); localStorage has the data
    }
  }, [userId]);

  // Debounced cloud save when userId is present
  useEffect(() => {
    if (!userId || syncConflict) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void pushToCloud(); }, CLOUD_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimerRef.current);
  }, [state, userId, syncConflict, pushToCloud]);

  // Auto-save to localStorage every 5 minutes as a belt-and-braces measure
  useEffect(() => {
    const interval = setInterval(() => saveState(stateRef.current), LOCAL_AUTOSAVE_MS);
    return () => clearInterval(interval);
  }, []);

  const reloadFromCloud = useCallback(async () => {
    if (!userId) return;
    const record = await loadUserData(userId);
    versionRef.current = record.version;
    if (record.data) dispatch({ type: 'RESET_STATE', payload: normalizeState(record.data) });
    setSyncConflict(false);
  }, [userId]);

  const forceCloudSave = useCallback(() => pushToCloud(true), [pushToCloud]);

  const value = useMemo<AppContextValue>(
    () => ({ state, dispatch, userId: userId || null, syncConflict, reloadFromCloud, forceCloudSave }),
    [state, userId, syncConflict, reloadFromCloud, forceCloudSave],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
