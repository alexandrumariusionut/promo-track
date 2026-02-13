import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeModeContext = createContext<{ toggle: () => void; mode: 'light' | 'dark' }>({ toggle: () => {}, mode: 'light' });

export function useThemeMode() { return useContext(ThemeModeContext); }

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => (localStorage.getItem('promo-track-theme') as any) || 'light');

  const toggle = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    localStorage.setItem('promo-track-theme', next);
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#1565c0' },
      secondary: { main: '#f57c00' },
      ...(mode === 'light' ? { background: { default: '#f5f5f5' } } : {}),
    },
    typography: { fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={{ toggle, mode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
