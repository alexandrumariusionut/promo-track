import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, STARREntry, Metric, Project, FeedbackEntry, Goal, UserProfile } from '../types';
import { loadState, saveState } from './storage';

type Action =
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'ADD_STARR'; payload: STARREntry }
  | { type: 'UPDATE_STARR'; payload: STARREntry }
  | { type: 'DELETE_STARR'; payload: string }
  | { type: 'ADD_METRIC'; payload: Metric }
  | { type: 'DELETE_METRIC'; payload: string }
  | { type: 'IMPORT_METRICS'; payload: Metric[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_FEEDBACK'; payload: FeedbackEntry }
  | { type: 'DELETE_FEEDBACK'; payload: string }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'SET_SCOPE_OF_ROLE'; payload: string }
  | { type: 'SET_BEST_REASONS'; payload: string }
  | { type: 'SET_ADDITIONAL_INFO'; payload: string }
  | { type: 'LOAD_STATE'; payload: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROFILE': return { ...state, profile: action.payload };
    case 'ADD_STARR': return { ...state, starr: [...state.starr, action.payload] };
    case 'UPDATE_STARR': return { ...state, starr: state.starr.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_STARR': return { ...state, starr: state.starr.filter(s => s.id !== action.payload) };
    case 'ADD_METRIC': return { ...state, metrics: [...state.metrics, action.payload] };
    case 'DELETE_METRIC': return { ...state, metrics: state.metrics.filter(m => m.id !== action.payload) };
    case 'IMPORT_METRICS': return { ...state, metrics: [...state.metrics, ...action.payload] };
    case 'ADD_PROJECT': return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT': return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROJECT': return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };
    case 'ADD_FEEDBACK': return { ...state, feedback: [...state.feedback, action.payload] };
    case 'DELETE_FEEDBACK': return { ...state, feedback: state.feedback.filter(f => f.id !== action.payload) };
    case 'ADD_GOAL': return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL': return { ...state, goals: state.goals.map(g => g.id === action.payload.id ? action.payload : g) };
    case 'DELETE_GOAL': return { ...state, goals: state.goals.filter(g => g.id !== action.payload) };
    case 'SET_SCOPE_OF_ROLE': return { ...state, scopeOfRole: action.payload };
    case 'SET_BEST_REASONS': return { ...state, bestReasonsNotToPromote: action.payload };
    case 'SET_ADDITIONAL_INFO': return { ...state, additionalInfo: action.payload };
    case 'LOAD_STATE': return action.payload;
    default: return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, loadState());

  useEffect(() => { saveState(state); }, [state]);

  // Auto-save reminder every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => { saveState(state); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
