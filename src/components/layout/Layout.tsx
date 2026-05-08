import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, IconButton, useMediaQuery, useTheme, Button, Snackbar, Alert, Chip,
  Tooltip, Divider,
} from '@mui/material';
import {
  Dashboard, Star, BarChart, Description,
  Person, Menu as MenuIcon, Article, HelpOutline, Save, Cloud,
  DarkMode, LightMode, MenuBook, LockOutlined,
} from '@mui/icons-material';
import { useApp } from '../../store/AppContext';
import { useThemeMode } from '../../store/ThemeContext';
import { generateDocx } from '../../utils/docExport';
import { UndoSnackbar } from '../UndoSnackbar';
import { ErrorSnackbar } from '../ErrorSnackbar';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingProgress from '../onboarding/OnboardingProgress';
import CelebrationOverlay from '../onboarding/CelebrationOverlay';
import TrophyModal from '../onboarding/TrophyModal';
import { ReviewComment } from '../../types';
import { checkReviewStatus } from '../../utils/reviewApi';

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
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [lastSavedText, setLastSavedText] = useState('just now');
  const [reviewNotification, setReviewNotification] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state, dispatch, userId } = useApp();
  const { toggle, mode } = useThemeMode();
  const { isTabUnlocked, getUnlockHint } = useOnboarding();

  // Global review polling — runs on every page
  const importComments = useCallback((sid: string, comments: Record<string, { text: string; date?: string }>) => {
    let matched = 0;
    state.star.forEach(entry => {
      const c = comments[entry.id];
      if (c?.text) {
        const newComment: ReviewComment = {
          id: `review-${sid}-${entry.id}`, text: c.text,
          date: c.date || new Date().toISOString(), source: 'manager',
        };
        const existing = entry.reviewComments || [];
        if (!existing.some(ec => ec.id === newComment.id)) {
          dispatch({ type: 'UPDATE_STAR', payload: { ...entry, reviewComments: [...existing, newComment] } });
          matched++;
        }
      }
    });
    return matched;
  }, [state.star, dispatch]);

  useEffect(() => {
    const sid = localStorage.getItem('promo-track-pending-review');
    if (!sid) return;
    const poll = async () => {
      try {
        const result = await checkReviewStatus(sid);
        if (result.status === 'reviewed') {
          const matched = importComments(sid, result.comments || {});
          localStorage.removeItem('promo-track-pending-review');
          setReviewNotification(matched > 0 ? `Manager review received! Imported comments for ${matched} entries.` : 'Manager completed review (no comments).');
        }
      } catch {
        localStorage.removeItem('promo-track-pending-review');
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [importComments]);

  // Update last saved timestamp when state changes
  useEffect(() => { setLastSaved(new Date()); }, [state]);

  // Tick the "ago" text every 15s
  useEffect(() => {
    const interval = setInterval(() => setLastSavedText(timeSince(lastSaved)), 15000);
    setLastSavedText(timeSince(lastSaved));
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Route guard: redirect locked routes to home
  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/guidelines' && !isTabUnlocked(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, isTabUnlocked, navigate]);

  const handleGenerate = async () => {
    try {
      await generateDocx(state);
      setSnack({ msg: 'Word document generated!', severity: 'success' });
    } catch (err) {
      setSnack({ msg: `Generation failed: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`, severity: 'error' });
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>Promo Tracker</Typography>
      </Toolbar>
      <List>
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
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, flexGrow: 1 }}>Promo Tracker</Typography>
          <Chip icon={userId ? <Cloud /> : <Save />} label={`${userId ? 'Synced' : 'Saved'} ${lastSavedText}`} size="small" variant="outlined"
            sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.3)', mr: 1, '& .MuiChip-icon': { color: 'rgba(255,255,255,0.7)' } }} />
          <IconButton color="inherit" onClick={toggle} size="small" sx={{ mr: 1 }}>
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

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Outlet />
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
