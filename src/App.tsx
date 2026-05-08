import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AppProvider } from './store/AppContext';
import { ThemeModeProvider } from './store/ThemeContext';
import { OnboardingProvider } from './context/OnboardingContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import STARRPage from './pages/STARRPage';
import MetricsPage from './pages/MetricsPage';
import DocumentsPage from './pages/DocumentsPage';
import ProfilePage from './pages/ProfilePage';
import FAQPage from './pages/FAQPage';
import GuidelinesPage from './pages/GuidelinesPage';
import ReviewPage from './pages/ReviewPage';
import { AppState } from './types';
import { getHarmonyUser } from './utils/harmonyUser';
import { loadUserData } from './utils/userDataApi';
import { loadState } from './store/storage';

const basename = '/';

function AppRoutes() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/review/:sessionId" element={<ReviewPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/star" element={<STARRPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [initialState, setInitialState] = useState<AppState | undefined>();

  useEffect(() => {
    (async () => {
      try {
        // Try Harmony user with a 3s timeout
        let user = null;
        try {
          user = await Promise.race([
            getHarmonyUser(),
            new Promise<null>(r => setTimeout(() => r(null), 3000)),
          ]);
        } catch { /* no Harmony */ }

        if (user) {
          setUserId(user.login);
          try {
            const cloudData = await Promise.race([
              loadUserData(user.login),
              new Promise<null>(r => setTimeout(() => r(null), 5000)),
            ]);
            if (cloudData) {
              setInitialState(cloudData);
            } else {
              const def = loadState(); // try localStorage first (may have existing data)
              if (def.profile.name === '' && user.firstName && user.lastName) def.profile.name = `${user.firstName} ${user.lastName}`;
              if (def.profile.email === '' && user.email) def.profile.email = user.email;
              setInitialState(def);
            }
          } catch {
            setInitialState(loadState());
          }
        } else {
          setInitialState(loadState());
        }
      } catch {
        setInitialState(loadState());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading your portfolio...</Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeModeProvider>
        <AppProvider initialState={initialState} userId={userId}>
          <OnboardingProvider>
            <AppRoutes />
          </OnboardingProvider>
        </AppProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  );
}
