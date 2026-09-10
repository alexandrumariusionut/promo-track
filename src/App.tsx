import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AppProvider } from './store/AppContext';
import { ThemeModeProvider } from './store/ThemeContext';
import { OnboardingProvider } from './context/OnboardingContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import { AppState } from './types';
import { getHarmonyUser } from './utils/harmonyUser';
import { loadUserData } from './utils/userDataApi';
import { loadState, normalizeState, setStorageUserAlias } from './store/storage';
import { APP_NAME } from './config';

// Route-level code splitting: only the dashboard is in the main bundle.
const STARRPage = lazy(() => import('./pages/STARRPage'));
const MetricsPage = lazy(() => import('./pages/MetricsPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const GuidelinesPage = lazy(() => import('./pages/GuidelinesPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));

const HARMONY_TIMEOUT_MS = 3000;
const CLOUD_LOAD_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

function FullPageSpinner({ label }: { label: string }) {
  return (
    <Box role="status" aria-live="polite" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
      <CircularProgress />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/review/:sessionId" element={<Suspense fallback={<FullPageSpinner label="Loading…" />}><ReviewPage /></Suspense>} />
        {/* Layout renders its own Suspense around <Outlet /> so the shell and route guard mount immediately */}
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/star" element={<STARRPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

interface BootResult {
  userId: string | null;
  initialState: AppState;
  initialVersion: number;
}

/**
 * Resolve identity and initial data:
 *  1. Harmony user (3s timeout) → namespaces localStorage per alias
 *  2. Cloud record (5s timeout) → preferred when present
 *  3. localStorage fallback, pre-filled with the Harmony name/email
 */
async function boot(): Promise<BootResult> {
  let user: Awaited<ReturnType<typeof getHarmonyUser>> = null;
  try {
    user = await withTimeout(getHarmonyUser(), HARMONY_TIMEOUT_MS);
  } catch { /* no Harmony */ }

  if (!user) return { userId: null, initialState: loadState(), initialVersion: 0 };

  setStorageUserAlias(user.login);
  try {
    const record = await withTimeout(loadUserData(user.login), CLOUD_LOAD_TIMEOUT_MS);
    if (record?.data) {
      return { userId: user.login, initialState: normalizeState(record.data), initialVersion: record.version };
    }
    const local = loadState();
    if (local.profile.name === '' && user.firstName && user.lastName) local.profile.name = `${user.firstName} ${user.lastName}`;
    if (local.profile.email === '' && user.email) local.profile.email = user.email;
    return { userId: user.login, initialState: local, initialVersion: record?.version ?? 0 };
  } catch {
    return { userId: user.login, initialState: loadState(), initialVersion: 0 };
  }
}

export default function App() {
  const [result, setResult] = useState<BootResult | null>(null);

  useEffect(() => {
    document.title = APP_NAME;
    boot()
      .then(setResult)
      .catch(() => setResult({ userId: null, initialState: loadState(), initialVersion: 0 }));
  }, []);

  if (!result) return <FullPageSpinner label="Loading your portfolio..." />;

  return (
    <ErrorBoundary>
      <ThemeModeProvider>
        <AppProvider initialState={result.initialState} initialVersion={result.initialVersion} userId={result.userId}>
          <OnboardingProvider>
            <AppRoutes />
          </OnboardingProvider>
        </AppProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  );
}
