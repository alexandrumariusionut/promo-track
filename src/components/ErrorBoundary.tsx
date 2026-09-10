import { Component, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Stack, Alert } from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import Download from '@mui/icons-material/Download';
import RestartAlt from '@mui/icons-material/RestartAlt';
import { loadState, getUserKey } from '../store/storage';
import { exportSession } from '../utils/session';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error; exported?: boolean }

/**
 * Last line of defence. Whatever broke, the user's portfolio is still in
 * localStorage, so offer to export it before they reload or reset.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Structured log for troubleshooting; never shown to the user verbatim
    console.error(JSON.stringify({ level: 'error', boundary: 'root', message: error.message, stack: info.componentStack?.slice(0, 2000) }));
  }

  private exportData = () => {
    try {
      exportSession(loadState());
      this.setState({ exported: true });
    } catch {
      // If even export fails, the raw JSON is still recoverable from devtools
    }
  };

  private resetLocal = () => {
    if (!window.confirm('This clears the locally cached copy of your portfolio on this browser. Your cloud copy (if signed in) is not affected. Continue?')) return;
    localStorage.removeItem(getUserKey('data'));
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box role="alert" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Paper sx={{ p: 4, maxWidth: 560 }}>
          <Typography variant="h5" component="h1" gutterBottom>Something went wrong</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            The page hit an unexpected error. Your portfolio data is safe — it is stored locally and, when you are
            signed in, in the cloud.
          </Typography>
          {this.state.exported && <Alert severity="success" sx={{ mb: 2 }}>Portfolio exported. Keep that file as a backup.</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<Refresh />} onClick={() => window.location.reload()}>Reload</Button>
            <Button variant="outlined" startIcon={<Download />} onClick={this.exportData}>Export my data</Button>
            <Button variant="text" color="error" startIcon={<RestartAlt />} onClick={this.resetLocal}>Reset local copy</Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" component="details">
            <summary>Technical details</summary>
            <Box component="code" sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error?.name}: {this.state.error?.message}
            </Box>
          </Typography>
        </Paper>
      </Box>
    );
  }
}
