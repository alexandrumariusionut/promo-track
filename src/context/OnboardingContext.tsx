import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useApp } from '../store/AppContext';
import { getTrophyShownKey } from '../store/storage';

/**
 * Feature flag: set to `true` to re-enable the progressive tab unlock system.
 * When `false`, all tabs are immediately accessible (bypass mode).
 */
const PROGRESSIVE_UNLOCK_ENABLED = false;

const STORAGE_KEY = 'promo-track-onboarding';

type Stage = 0 | 1 | 2 | 3;

interface OnboardingState {
  currentStage: Stage;
  guidelinesRead: boolean;
  celebrationQueue: number[];
  completedAt?: string;
}

const TAB_STAGE_MAP: Record<string, number> = {
  '/': -1,
  '/guidelines': -1,
  '/profile': 1,
  '/faq': 1,
  '/star': 2,
  '/metrics': 3,
  '/documents': 3,
};

export const CELEBRATION_MESSAGES: Record<number, string> = {
  1: '📖 Guidelines complete! Profile & FAQ unlocked!',
  2: '✅ Profile complete! STAR Entries unlocked!',
  3: '⭐ All tabs unlocked! You\'re all set! 🏆',
};

const UNLOCK_HINTS: Record<string, string> = {
  '/profile': 'Read through the Guidelines to unlock',
  '/faq': 'Read through the Guidelines to unlock',
  '/star': 'Complete your Profile to unlock',
  '/metrics': 'Add your first STAR entry to unlock',
  '/documents': 'Add your first STAR entry to unlock',
};

interface OnboardingContextValue {
  stage: Stage;
  guidelinesRead: boolean;
  markGuidelinesRead: () => void;
  isTabUnlocked: (path: string) => boolean;
  getUnlockHint: (path: string) => string;
  pendingCelebration: number | null;
  dismissCelebration: () => void;
  isComplete: boolean;
  resetOnboarding: () => void;
  stageProgress: { current: number; total: 3; percentage: number };
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function loadFromStorage(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

function saveToStorage(state: OnboardingState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function computeStageFromAppState(
  profile: { name: string; email: string; role: string; manager: string; team: string },
  scopeOfRole: string,
  starCount: number,
): Stage {
  if (starCount >= 1) return 3;
  if (
    profile.name && profile.email && profile.role && profile.manager && profile.team &&
    scopeOfRole
  ) return 2;
  return 0;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { state: appState } = useApp();
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => {
    const saved = loadFromStorage();
    if (saved) return saved;

    // Auto-detect stage for existing users — no celebrations
    const detected = computeStageFromAppState(appState.profile, appState.scopeOfRole, appState.star.length);
    const initial: OnboardingState = {
      currentStage: detected,
      guidelinesRead: detected >= 1,
      celebrationQueue: [],
    };
    if (detected === 3) initial.completedAt = new Date().toISOString();
    saveToStorage(initial);
    return initial;
  });

  const onboardingRef = useRef(onboarding);
  useEffect(() => { onboardingRef.current = onboarding; }, [onboarding]);

  // Persist on every state change
  useEffect(() => {
    saveToStorage(onboarding);
  }, [onboarding]);

  // Reactive stage advancement based on AppState changes
  const profileName = appState.profile.name;
  const profileEmail = appState.profile.email;
  const profileRole = appState.profile.role;
  const profileManager = appState.profile.manager;
  const profileTeam = appState.profile.team;
  const scopeOfRole = appState.scopeOfRole;
  const starCount = appState.star.length;

  useEffect(() => {
    const current = onboardingRef.current;
    let newStage = current.currentStage;
    const celebrations: number[] = [];

    // Stage 2: profile complete + scopeOfRole
    if (
      newStage < 2 &&
      current.guidelinesRead &&
      profileName && profileEmail && profileRole && profileManager && profileTeam &&
      scopeOfRole
    ) {
      newStage = 2;
      celebrations.push(2);
    }

    // Stage 3: at least one STAR entry (final stage — unlocks Metrics + Documents)
    if (newStage < 3 && newStage >= 2 && starCount >= 1) {
      newStage = 3;
      celebrations.push(3);
    }

    if (newStage > current.currentStage) {
      setOnboarding(prev => ({
        ...prev,
        currentStage: newStage as Stage,
        celebrationQueue: [...prev.celebrationQueue, ...celebrations],
        completedAt: newStage === 3 ? new Date().toISOString() : prev.completedAt,
      }));
    }
  }, [profileName, profileEmail, profileRole, profileManager, profileTeam, scopeOfRole, starCount]);

  const markGuidelinesRead = useCallback(() => {
    setOnboarding(prev => {
      if (prev.guidelinesRead) return prev;
      const newStage: Stage = prev.currentStage < 1 ? 1 : prev.currentStage;
      const celebrations = newStage > prev.currentStage ? [1] : [];
      return {
        ...prev,
        guidelinesRead: true,
        currentStage: newStage,
        celebrationQueue: [...prev.celebrationQueue, ...celebrations],
      };
    });
  }, []);

  const isTabUnlocked = useCallback((path: string): boolean => {
    if (!PROGRESSIVE_UNLOCK_ENABLED) return true;
    const required = TAB_STAGE_MAP[path];
    if (required === undefined) return true;
    if (required === -1) return true;
    return onboarding.currentStage >= required;
  }, [onboarding.currentStage]);

  const getUnlockHint = useCallback((path: string): string => {
    return UNLOCK_HINTS[path] ?? '';
  }, []);

  // The pending celebration is simply the head of the queue; dismissing pops it.
  const pendingCelebration = onboarding.celebrationQueue.length > 0 ? onboarding.celebrationQueue[0] : null;

  const dismissCelebration = useCallback(() => {
    setOnboarding(prev => ({ ...prev, celebrationQueue: prev.celebrationQueue.slice(1) }));
  }, []);

  const resetOnboarding = useCallback(() => {
    const reset: OnboardingState = {
      currentStage: 0,
      guidelinesRead: false,
      celebrationQueue: [],
    };
    setOnboarding(reset);
    localStorage.removeItem(getTrophyShownKey());
  }, []);

  const value: OnboardingContextValue = {
    stage: onboarding.currentStage,
    guidelinesRead: onboarding.guidelinesRead,
    markGuidelinesRead,
    isTabUnlocked,
    getUnlockHint,
    pendingCelebration,
    dismissCelebration,
    isComplete: onboarding.currentStage === 3,
    resetOnboarding,
    stageProgress: {
      current: onboarding.currentStage,
      total: 3,
      percentage: (onboarding.currentStage / 3) * 100,
    },
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
