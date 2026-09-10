import { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, IconButton, useMediaQuery, useTheme, Button, Snackbar, Alert, Chip,
  Tooltip, Divider, CircularProgress,
} from '@mui/material';
import {
  Dashboard, Star, BarChart, Description,
  Person, Menu as MenuIcon, Article, HelpOutline, Save, Cloud,
  DarkMode, LightMode, MenuBook, LockOutlined,
} from '@mui/icons-material';
import { useApp } from '../../store/AppContext';
import { getPendingReviewKey } from '../../store/storage';
import { useThemeMode } from '../../store/ThemeContext';
import { UndoSnackbar } from '../UndoSnackbar';
import { ErrorSnackbar } from '../ErrorSnackbar';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingProgress from '../onboarding/OnboardingProgress';
import CelebrationOverlay from '../onboarding/CelebrationOverlay';
import TrophyModal from '../onboarding/TrophyModal';
import { consumeReview } from '../../utils/reviewImport';
import { APP_NAME } from '../../config';

const NAV = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/' },
  { label: 'STAR Entries', icon: <Star />, path: '/star' },
  { label: 'Metrics', icon: <BarChart />, path: '/metrics' },
  { label: 'Documents', icon: <Description />, path: '/documents' },
  { label: 'Profile', icon: <Person />, path: '/profile' },
  { label: 'Guidelines', icon: <MenuBook />, path: '/guidelines' },
  { label: 'FAQ & Help', icon: <HelpOutline />, path: '/faq' },
];

const DRAWER_WIDTH = 240;

function timeSince(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const lastSavedRef = useRef<Date>(new Date());
  const [lastSavedText, setLastSavedText] = useState('just now');
  const [reviewNotification, setReviewNotification] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state, dispatch, userId, syncConflict, reloadFromCloud, forceCloudSave } = useApp();
  const { toggle, mode } = useThemeMode();
  const { isTabUnlocked, getUnlockHint } = useOnboarding();

  // Global review polling — runs on every page
  useEffect(() => {
    const sid = localStorage.getItem(getPendingReviewKey());
    if (!sid) return;
    const poll = async () => {
      const outcome = await consumeReview(state.star);
      if (outcome.action === 'not-ready' || outcome.action === 'pending') return;
      if (outcome.action === 'error' && !outcome.message) return; // transient — silent retry

      // Apply matched comments via dispatch
      if (outcome.importResult?.matched.length) {
        for (const { entryId, comment } of outcome.importResult.matched) {
          const entry = state.star.find(e => e.id === entryId);
          if (entry) {
            dispatch({ type: 'UPDATE_STAR', payload: { ...entry, reviewComments: [...(entry.reviewComments || []), comment] } });
          }
        }
      }

      if (outcome.message) {
        setReviewNotification(outcome.message);
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [state.star, dispatch]);

  // Record the last save time when state changes; the interval below renders it
  useEffect(() => { lastSavedRef.current = new Date(); }, [state]);

  // Tick the "ago" text every 15s
  useEffect(() => {
    const interval = setInterval(() => setLastSavedText(timeSince(lastSavedRef.current)), 15000);
    return () => clearInterval(interval);
  }, []);

  // Route guard: redirect locked routes to home
  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/guidelines' && !isTabUnlocked(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, isTabUnlocked, navigate]);

  const handleGenerate = async () => {
    try {
      // Loaded on demand: the docx library is ~340 KB and only needed here
      const { generateDocx } = await import('../../utils/docExport');
      await generateDocx(state);
      setSnack({ msg: 'Word document generated!', severity: 'success' });
    } catch (err) {
      setSnack({ msg: `Generation failed: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`, severity: 'error' });
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" component="p" sx={{ fontWeight: 700, color: 'primary.main' }}>{APP_NAME}</Typography>
      </Toolbar>
      <List component="nav" aria-label="Main navigation">
        {NAV.map(({ label, icon, path }) => {
          const unlocked = isTabUnlocked(path);
          const button = (
            <ListItemButton key={path} selected={unlocked && location.pathname === path}
              onClick={unlocked ? () => { navigate(path); setMobileOpen(false); } : undefined}
              sx={unlocked ? undefined : { opacity: 0.45, cursor: 'default' }}>
              <ListItemIcon>{unlocked ? icon : <LockOutlined />}</ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          );
          return unlocked ? button : (
            <Tooltip key={path} title={getUnlockHint(path)} arrow placement="right">
              <span>{button}</span>
            </Tooltip>
          );
        })}
      </List>
      <Divider sx={{ my: 1 }} />
      <OnboardingProgress />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <Box component="a" href="#main-content" sx={{
        position: 'absolute', left: -9999, top: 8, zIndex: theme.zIndex.tooltip, px: 2, py: 1,
        bgcolor: 'background.paper', color: 'primary.main', borderRadius: 1, boxShadow: 3,
        '&:focus': { left: 8 },
      }}>Skip to main content</Box>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2 }}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileOpen}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="h1" noWrap sx={{ fontWeight: 700, flexGrow: 1 }}>{APP_NAME}</Typography>
          <Chip icon={userId ? <Cloud /> : <Save />} label={`${userId ? 'Synced' : 'Saved'} ${lastSavedText}`} size="small" variant="outlined"
            sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.3)', mr: 1, '& .MuiChip-icon': { color: 'rgba(255,255,255,0.7)' } }} />
          <IconButton color="inherit" onClick={toggle} size="small" sx={{ mr: 1 }}
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
          <Button color="inherit" variant="outlined" startIcon={<Article />} onClick={handleGenerate} size="small"
            sx={{ borderColor: 'rgba(255,255,255,0.5)' }}>Generate Doc</Button>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isMobile ? (
          <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>{drawer}</Drawer>
        ) : (
          <Drawer variant="permanent" sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }} open>{drawer}</Drawer>
        )}
      </Box>

      <Box component="main" id="main-content" tabIndex={-1} sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, outline: 'none' }}>
        <Toolbar />
        {syncConflict && (
          <Alert severity="warning" sx={{ mb: 2 }} role="alert"
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button color="inherit" size="small" onClick={() => reloadFromCloud().catch(() => setSnack({ msg: 'Could not reload from cloud', severity: 'error' }))}>
                  Load newer copy
                </Button>
                <Button color="inherit" size="small" onClick={() => forceCloudSave()}>
                  Keep mine
                </Button>
              </Box>
            }>
            This portfolio was changed on another device or tab. Choose which copy to keep — cloud sync is paused until you do.
          </Alert>
        )}
        <Suspense fallback={<Box role="status" aria-live="polite" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}>
          <Outlet />
        </Suspense>
      </Box>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack?.severity} onClose={() => setSnack(null)} variant="filled">{snack?.msg}</Alert>
      </Snackbar>
      <Snackbar open={!!reviewNotification} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setReviewNotification(null)} variant="filled" sx={{ width: '100%', fontSize: '0.95rem' }}>
          {reviewNotification}
        </Alert>
      </Snackbar>
      <UndoSnackbar />
      <ErrorSnackbar />
      <CelebrationOverlay />
      <TrophyModal />
    </Box>
  );
}
