import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { AppState, STAREntry, Metric, UserProfile, ActivityLogEntry, DimensionAnalysis } from '../types';
import { loadState, saveState } from './storage';
import { saveUserData } from '../utils/userDataApi';

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
  | { type: 'SET_DIMENSION_ANALYSIS'; payload: DimensionAnalysis };

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
    default:
      return state;
  }

  return { ...next, activityLog: [...(next.activityLog || log), ...(entry ? [entry] : [])] };
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  userId: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, initialState, userId }: {
  children: ReactNode;
  initialState?: AppState;
  userId?: string | null;
}) {
  const [state, dispatch] = useReducer(reducer, initialState || loadState());
  const stateRef = useRef(state);
  stateRef.current = state;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Persist to localStorage on every state change (fallback)
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Debounced cloud save when userId is present
  useEffect(() => {
    if (!userId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveUserData(userId, stateRef.current).catch(() => {});
    }, 2000);
    return () => clearTimeout(saveTimerRef.current);
  }, [state, userId]);

  // Auto-save every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      saveState(stateRef.current);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, userId: userId || null }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
