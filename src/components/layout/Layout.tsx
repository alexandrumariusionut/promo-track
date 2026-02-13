import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, IconButton, useMediaQuery, useTheme, Button, Snackbar, Alert, Chip,
} from '@mui/material';
import {
  Dashboard, Star, BarChart, Feedback, Description,
  Person, Menu as MenuIcon, FileUpload, FileDownload, Article, HelpOutline, Save,
  DarkMode, LightMode,
} from '@mui/icons-material';
import { useApp } from '../../store/AppContext';
import { useThemeMode } from '../../store/ThemeContext';
import { exportSession, importSession } from '../../utils/session';
import { generateDocx } from '../../utils/docExport';
import { UndoSnackbar } from '../UndoSnackbar';

const NAV = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/' },
  { label: 'STARR Entries', icon: <Star />, path: '/starr' },
  { label: 'Metrics', icon: <BarChart />, path: '/metrics' },
  { label: 'Feedback', icon: <Feedback />, path: '/feedback' },
  { label: 'Documents', icon: <Description />, path: '/documents' },
  { label: 'Profile', icon: <Person />, path: '/profile' },
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
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { state, dispatch } = useApp();
  const { toggle, mode } = useThemeMode();
  const fileRef = useRef<HTMLInputElement>(null);

  // Update last saved timestamp when state changes
  useEffect(() => { setLastSaved(new Date()); }, [state]);

  // Tick the "ago" text every 15s
  useEffect(() => {
    const interval = setInterval(() => setLastSavedText(timeSince(lastSaved)), 15000);
    setLastSavedText(timeSince(lastSaved));
    return () => clearInterval(interval);
  }, [lastSaved]);

  const handleExport = () => {
    exportSession(state);
    setSnack({ msg: 'Portfolio exported successfully!', severity: 'success' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importSession(file);
      dispatch({ type: 'LOAD_STATE', payload: imported });
      setSnack({ msg: 'Portfolio imported successfully!', severity: 'success' });
    } catch (err: any) {
      setSnack({ msg: err.message, severity: 'error' });
    }
    e.target.value = '';
  };

  const handleGenerate = async () => {
    try {
      await generateDocx(state);
      setSnack({ msg: 'Word document generated!', severity: 'success' });
    } catch (err: any) {
      setSnack({ msg: `Generation failed: ${err.message}`, severity: 'error' });
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>PromoTrack</Typography>
      </Toolbar>
      <List>
        {NAV.map(({ label, icon, path }) => (
          <ListItemButton key={path} selected={location.pathname === path}
            onClick={() => { navigate(path); setMobileOpen(false); }}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
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
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, flexGrow: 1 }}>PromoTrack</Typography>
          <Chip icon={<Save />} label={`Saved ${lastSavedText}`} size="small" variant="outlined"
            sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.3)', mr: 1, '& .MuiChip-icon': { color: 'rgba(255,255,255,0.7)' } }} />
          <IconButton color="inherit" onClick={toggle} size="small" sx={{ mr: 1 }}>
            {mode === 'dark' ? <LightMode /> : <DarkMode />}
          </IconButton>
          <input ref={fileRef} type="file" accept=".portfolio,.json" hidden onChange={handleImport} />
          <Button color="inherit" startIcon={<FileUpload />} onClick={() => fileRef.current?.click()} size="small" sx={{ mr: 1 }}>Import</Button>
          <Button color="inherit" startIcon={<FileDownload />} onClick={handleExport} size="small" sx={{ mr: 1 }}>Export</Button>
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
      <UndoSnackbar />
    </Box>
  );
}
