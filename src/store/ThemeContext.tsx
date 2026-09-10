import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { ThemeProvider, createTheme, CssBaseline, PaletteMode } from '@mui/material';

/**
 * Design tokens. Everything visual should reference these via the theme
 * (palette.*, shape.borderRadius, spacing) rather than hardcoded values.
 */
export const BRAND = {
  primary: '#1565c0',
  primaryDark: '#0d47a1',
  secondary: '#f57c00',
  outlook: '#0078d4',
  trophy: '#f9a825',
} as const;

const RADIUS = 10;
const THEME_KEY = 'promo-track-theme';

declare module '@mui/material/styles' {
  interface Palette {
    brand: { outlook: string; trophy: string; gradient: string };
    surface: { subtle: string; raised: string };
  }
  interface PaletteOptions {
    brand?: Palette['brand'];
    surface?: Palette['surface'];
  }
}

export function buildTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: { main: BRAND.primary, dark: BRAND.primaryDark },
      secondary: { main: BRAND.secondary },
      success: { main: isDark ? '#66bb6a' : '#2e7d32' },
      warning: { main: isDark ? '#ffb74d' : '#ed6c02' },
      error: { main: isDark ? '#ef5350' : '#c62828' },
      background: isDark
        ? { default: '#0f1419', paper: '#171d24' }
        : { default: '#f4f6f8', paper: '#ffffff' },
      divider: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
      brand: {
        outlook: BRAND.outlook,
        trophy: BRAND.trophy,
        gradient: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
      },
      surface: isDark
        ? { subtle: 'rgba(255,255,255,0.04)', raised: '#1f2731' }
        : { subtle: 'rgba(0,0,0,0.03)', raised: '#ffffff' },
    },
    shape: { borderRadius: RADIUS },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.01em' },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none',
          }),
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: isDark ? theme.palette.background.paper : BRAND.primary,
            borderBottom: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({ borderRight: `1px solid ${theme.palette.divider}` }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500 } },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: RADIUS + 4 } },
      },
      MuiCssBaseline: {
        styleOverrides: {
          // Respect the OS setting for people who are sensitive to motion.
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
          },
          ':focus-visible': { outline: `3px solid ${BRAND.secondary}`, outlineOffset: 2 },
        },
      },
    },
  });
}

const ThemeModeContext = createContext<{ toggle: () => void; mode: PaletteMode }>({ toggle: () => {}, mode: 'light' });

export function useThemeMode() { return useContext(ThemeModeContext); }

function initialMode(): PaletteMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  // First visit: follow the OS preference
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(initialMode);

  const toggle = () => {
    const next: PaletteMode = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    localStorage.setItem(THEME_KEY, next);
  };

  // Keep the browser UI (scrollbars, form controls) in step with the app theme
  useEffect(() => {
    document.documentElement.style.colorScheme = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#171d24' : BRAND.primary);
  }, [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ toggle, mode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
