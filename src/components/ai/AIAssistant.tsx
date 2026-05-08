import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, TextField, CircularProgress, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, IconButton, Tooltip,
} from '@mui/material';
import { AutoAwesome, Settings, ContentCopy } from '@mui/icons-material';
import { chat, checkConnection, getAIConfig, saveAIConfig, AIProvider } from '../../utils/ai';
import { PROMPTS } from '../../utils/aiPrompts';
import { useApp } from '../../store/AppContext';

export default function AIAssistant() {
  const { state } = useApp();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [config, setConfig] = useState(getAIConfig());

  useEffect(() => {
    checkConnection().then(({ ok, models }) => { setConnected(ok); setModels(models); });
  }, []);

  const run = async (action: 'gapAnalysis' | 'draftScope') => {
    setLoading(true); setResult(''); setError('');
    try {
      const prompt = PROMPTS[action](state);
      await chat(prompt.system, prompt.user, (text) => setResult(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    }
    setLoading(false);
  };

  const handleSaveSettings = () => {
    saveAIConfig(config);
    setSettingsOpen(false);
    checkConnection().then(({ ok, models }) => { setConnected(ok); setModels(models); });
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome color="primary" />
          <Typography variant="h6">AI Assistant</Typography>
          {connected === true && <Chip label="Connected" size="small" color="success" variant="outlined" />}
          {connected === false && <Chip label="Offline" size="small" color="error" variant="outlined" />}
          {connected === null && <Chip label="Checking..." size="small" variant="outlined" />}
        </Box>
        <Tooltip title="AI Settings">
          <IconButton size="small" onClick={() => setSettingsOpen(true)}><Settings fontSize="small" /></IconButton>
        </Tooltip>
      </Box>

      {connected === false && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Start Ollama to enable AI features: <code>ollama serve</code> then <code>ollama pull {config.model}</code>
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button variant="outlined" size="small" startIcon={<AutoAwesome />}
          disabled={!connected || loading} onClick={() => run('gapAnalysis')}>
          Portfolio Gap Analysis
        </Button>
        <Button variant="outlined" size="small" startIcon={<AutoAwesome />}
          disabled={!connected || loading} onClick={() => run('draftScope')}>
          Draft Scope of Role
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Thinking...</Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Box sx={{ position: 'relative' }}>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>
            {result}
          </Paper>
          <Tooltip title="Copy to clipboard">
            <IconButton size="small" sx={{ position: 'absolute', top: 8, right: 8 }}
              onClick={() => navigator.clipboard.writeText(result)}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>AI Settings</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Provider" select value={config.provider}
            onChange={e => setConfig({ ...config, provider: e.target.value as AIProvider })}>
            <MenuItem value="ollama">Ollama (local)</MenuItem>
            <MenuItem value="remote">Remote Ollama</MenuItem>
            <MenuItem value="bedrock">Amazon Bedrock</MenuItem>
          </TextField>
          <TextField label="Model" value={config.model}
            onChange={e => setConfig({ ...config, model: e.target.value })}
            helperText={models.length ? `Available: ${models.join(', ')}` : 'Start Ollama to see available models'} />
          <TextField label="Endpoint" value={config.endpoint}
            onChange={e => setConfig({ ...config, endpoint: e.target.value })}
            helperText="Default: /api/ai (proxied to localhost:11434)" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSettings}>Save</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
