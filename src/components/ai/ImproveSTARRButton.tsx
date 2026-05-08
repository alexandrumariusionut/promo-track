import { useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Typography, Box, Paper, IconButton, Tooltip, Divider, TextField, Checkbox,
  FormControlLabel, Chip,
} from '@mui/material';
import { AutoAwesome, ContentCopy, Check, Send } from '@mui/icons-material';
import { chat, checkConnection } from '../../utils/ai';
import { PROMPTS } from '../../utils/aiPrompts';
import { useApp } from '../../store/AppContext';
import { STAREntry } from '../../types';

const FIELDS = ['situation', 'task', 'action', 'results'] as const;
type Field = typeof FIELDS[number];

interface Message { role: 'user' | 'assistant'; content: string }

function parseSTARResponse(text: string): Record<Field, string> | null {
  const sections: Partial<Record<Field, string>> = {};

  // Strategy 1: Headers on their own line
  let parts = text.split(/^(Situation|Task|Action|Results)\s*$/m);
  if (parts.length >= 3) {
    for (let i = 1; i < parts.length; i += 2) {
      const key = parts[i]?.trim().toLowerCase() as Field;
      const val = parts[i + 1]?.trim();
      if (key && val && FIELDS.includes(key)) sections[key] = val;
    }
  }

  // Strategy 2: "Situation:" or "**Situation**:" inline — extract text after colon
  if (Object.keys(sections).length < 3) {
    for (const field of FIELDS) {
      const re = new RegExp(`(?:^|\\n)\\*{0,2}${field}\\*{0,2}[:\\s]\\s*([\\s\\S]*?)(?=(?:\\n\\*{0,2}(?:Situation|Task|Action|Results)\\*{0,2}[:\\s])|$)`, 'i');
      const m = text.match(re);
      if (m?.[1]?.trim()) sections[field] = m[1].trim();
    }
  }

  return Object.keys(sections).length >= 3 ? sections as Record<Field, string> : null;
}

function buildSTARText(parsed: Record<Field, string>): string {
  return FIELDS.map(f => `${f.charAt(0).toUpperCase() + f.slice(1)}\n${parsed[f] || ''}`).join('\n\n');
}

export default function ImproveSTARRButton({ entry, onApply }: { entry: STAREntry; onApply?: (fields: Partial<STAREntry>) => void }) {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Record<Field, string> | null>(null);
  const [rawResult, setRawResult] = useState('');
  const [history, setHistory] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [selected, setSelected] = useState<Set<Field>>(new Set(FIELDS));
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');
  const [instructions, setInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const handleImprove = async () => {
    setShowInstructions(false); setLoading(true); setError(''); setApplied(false);
    setParsed(null); setRawResult(''); setHistory([]); setSelected(new Set(FIELDS));
    const { ok } = await checkConnection();
    if (!ok) { setError('Ollama is not running. Start it with: ollama serve'); setLoading(false); return; }
    try {
      const prompt = PROMPTS.improveStar(state, entry);
      const userPrompt = instructions.trim() ? `${prompt.user}\n\nAdditional instructions: ${instructions}` : prompt.user;
      let full = '';
      await chat(prompt.system, userPrompt, (text) => { full = text; setRawResult(text); });
      const p = parseSTARResponse(full);
      if (p) setParsed(p);
      setHistory([{ role: 'assistant', content: full }]);
    } catch (e) { setError(e instanceof Error ? e.message : 'An unexpected error occurred'); }
    setLoading(false);
  };

  const handleFollowUp = async () => {
    if (!userInput.trim() || loading) return;
    const msg = userInput.trim();
    setUserInput(''); setLoading(true); setError(''); setApplied(false);
    const newHistory: Message[] = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);
    try {
      const basePrompt = PROMPTS.improveStar(state, entry);
      const currentText = parsed ? buildSTARText(parsed) : rawResult;
      // Always ask for the full updated STAR back
      const followUpSystem = basePrompt.system + `\n\nThe user will give you feedback on the current formatted text. Apply their feedback and return the COMPLETE updated STAR entry in the SAME format with all four headers (Situation, Task, Action, Results) each on their own line. Even if only one section changes, return ALL four sections.`;
      const messages = [
        { role: 'system' as const, content: followUpSystem },
        { role: 'user' as const, content: `Here is the current formatted STAR entry:\n\n${currentText}` },
        { role: 'assistant' as const, content: 'I have the current entry. What changes would you like?' },
        { role: 'user' as const, content: msg },
      ];
      const config = (await import('../../utils/ai')).getAIConfig();
      const res = await fetch(`${config.endpoint}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.model, messages, stream: false }),
      });
      const data = await res.json();
      const reply = data.message?.content || '';
      setHistory([...newHistory, { role: 'assistant', content: reply }]);
      const p = parseSTARResponse(reply);
      if (p) {
        setParsed(p);
        setRawResult(reply);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'An unexpected error occurred'); }
    setLoading(false);
  };

  const toggleField = (f: Field) => {
    const next = new Set(selected);
    next.has(f) ? next.delete(f) : next.add(f);
    setSelected(next);
  };

  const handleApply = () => {
    if (!parsed) return;
    const updates: Partial<STAREntry> = {
      ...(selected.has('situation') && parsed.situation ? { situation: parsed.situation } : {}),
      ...(selected.has('task') && parsed.task ? { task: parsed.task } : {}),
      ...(selected.has('action') && parsed.action ? { action: parsed.action } : {}),
      ...(selected.has('results') && parsed.results ? { results: parsed.results } : {}),
    };
    if (onApply) {
      onApply(updates);
    } else {
      dispatch({ type: 'UPDATE_STAR', payload: { ...entry, ...updates } });
    }
    setApplied(true);
    setOpen(false);
  };

  return (
    <>
      <Button size="small" variant="contained" startIcon={<AutoAwesome />} onClick={() => { setShowInstructions(true); setOpen(true); }}
        sx={{ background: 'linear-gradient(135deg, #7B2D8E 0%, #1768c9 100%)', color: '#fff', fontWeight: 600,
          '&:hover': { background: 'linear-gradient(135deg, #6a2579 0%, #1256a8 100%)' } }}>
        Format with AI
      </Button>
      <Dialog open={open} onClose={() => { setOpen(false); setInstructions(''); setShowInstructions(false); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome color="primary" fontSize="small" />
          AI-Formatted STAR Entry
        </DialogTitle>
        <DialogContent>
          {/* Pre-format instructions step */}
          {showInstructions && !loading && !rawResult && (
            <Box sx={{ py: 1 }}>
              <TextField
                fullWidth multiline rows={2} size="small"
                label="Instructions for AI (optional)"
                placeholder="e.g., Focus on metrics, keep it brief, emphasize the leadership aspect"
                value={instructions} onChange={e => setInstructions(e.target.value)}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button variant="contained" size="small" onClick={handleImprove}>Format</Button>
                <Button variant="text" size="small" onClick={() => { setInstructions(''); handleImprove(); }}>Skip &amp; Format</Button>
              </Box>
            </Box>
          )}

          {/* Formatted STAR sections with checkboxes */}
          {parsed && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Select which sections to apply:
              </Typography>
              {FIELDS.map((field) => (
                <Box key={field} sx={{ mb: 1.5 }}>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={selected.has(field)} onChange={() => toggleField(field)} />}
                    label={
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'capitalize' }}>
                        {field}
                      </Typography>
                    }
                  />
                  <Paper variant="outlined" sx={{
                    p: 1.5, ml: 4, bgcolor: selected.has(field) ? 'action.hover' : 'transparent',
                    opacity: selected.has(field) ? 1 : 0.5, transition: 'all 0.2s',
                  }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                      {parsed[field] || <em>Not generated</em>}
                    </Typography>
                  </Paper>
                  {field !== FIELDS[FIELDS.length - 1] && <Divider sx={{ mt: 1.5 }} />}
                </Box>
              ))}
            </Box>
          )}

          {/* Raw result fallback */}
          {rawResult && !parsed && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7 }}>
              {rawResult}
            </Paper>
          )}

          {/* Chat history (follow-up messages only) */}
          {history.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Divider sx={{ mb: 1.5 }}><Chip label="Conversation" size="small" /></Divider>
              {history.slice(1).map((msg, i) => (
                <Box key={i} sx={{
                  display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', mb: 1,
                }}>
                  <Paper sx={{
                    p: 1.5, maxWidth: '85%', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'action.hover',
                    color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}>
                    {msg.content}
                  </Paper>
                </Box>
              ))}
            </Box>
          )}

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2, justifyContent: 'center' }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {history.length === 0 ? 'Formatting your entry...' : 'Thinking...'}
              </Typography>
            </Box>
          )}

          {error && <Typography color="error" sx={{ py: 1 }}>{error}</Typography>}

          {/* Follow-up input — show whenever we have any result */}
          {(parsed || rawResult) && !loading && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                fullWidth size="small" placeholder="Give feedback... e.g. 'Make the Action section shorter' or 'Add more metrics to Results'"
                value={userInput} onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFollowUp(); } }}
              />
              <Button variant="contained" onClick={handleFollowUp} disabled={!userInput.trim()}>
                <Send fontSize="small" />
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {rawResult && (
            <Tooltip title="Copy full text">
              <IconButton onClick={() => navigator.clipboard.writeText(parsed ? buildSTARText(parsed) : rawResult)}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Button onClick={() => { setOpen(false); setInstructions(''); setShowInstructions(false); }}>Close</Button>
          {parsed && !applied && (
            <Button variant="contained" startIcon={<Check />} onClick={handleApply}>
              Apply {selected.size < 4 ? `(${selected.size} section${selected.size !== 1 ? 's' : ''})` : 'All'}
            </Button>
          )}
          {applied && <Typography variant="body2" color="success.main" sx={{ mr: 2 }}>✓ Applied</Typography>}
        </DialogActions>
      </Dialog>
    </>
  );
}
