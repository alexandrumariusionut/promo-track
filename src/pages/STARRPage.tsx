import { useState } from 'react';
import { Box, Typography, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress, Snackbar, Alert, Divider } from '@mui/material';
import { Add, Share, ContentCopy, RateReview } from '@mui/icons-material';
import DimensionCoveragePanel from '../components/starr/DimensionCoveragePanel';
import PageTip from '../components/PageTip';
import { v4 as uuid } from 'uuid';
import { useApp } from '../store/AppContext';
import { getPendingReviewKey } from '../store/storage';
import { STAREntry, LEADERSHIP_PRINCIPLES, LeadershipPrinciple, ReviewComment } from '../types';
import { showUndo } from '../components/UndoSnackbar';
import STARRCard from '../components/starr/STARRCard';
import STARRFormDialog from '../components/starr/STARRFormDialog';
import TemplatePickerDialog from '../components/starr/TemplatePickerDialog';
import { createReviewSession } from '../utils/reviewApi';
import { consumeReview, getUnmatchedComments, clearUnmatchedComments } from '../utils/reviewImport';
import { suggestDimensions, DimensionSuggestion } from '../utils/aiPrompts';
import { chat } from '../utils/ai';
import { GUIDELINES } from '../data/levelGuidelines';
import { validateSuggestions } from '../utils/dimensionScoring';

export default function STARRPage() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<STAREntry | null>(null);
  const [viewing, setViewing] = useState<STAREntry | null>(null);
  const [filterLP, setFilterLP] = useState('');
  const [search, setSearch] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);

  // Engineer note input
  const [noteText, setNoteText] = useState('');
  // Pre-tag new entries from the panel
  const [preTaggedResponsibility, setPreTaggedResponsibility] = useState<string | undefined>(undefined);
  const [dialogHelperText, setDialogHelperText] = useState<string | undefined>(undefined);

  // Share for Review state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [outlookUrl, setOutlookUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const [snack, setSnack] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const [unmatchedDialogOpen, setUnmatchedDialogOpen] = useState(false);
  const [unmatchedComments, setUnmatchedComments] = useState(getUnmatchedComments());

  const hasPendingReview = !!localStorage.getItem(getPendingReviewKey());
  const hasUnmatchedComments = unmatchedComments.length > 0;

  const handleCheckForReview = async () => {
    setCheckLoading(true);
    try {
      const outcome = await consumeReview(state.star);
      if (outcome.action === 'not-ready') {
        setSnack('Local entries not loaded yet — will retry automatically.');
      } else if (outcome.action === 'pending') {
        setSnack("No review yet. Your manager hasn't responded.");
      } else if (outcome.action === 'error' && !outcome.message) {
        setSnack('Temporary error checking review — will retry.');
      } else {
        // Apply matched comments
        if (outcome.importResult?.matched.length) {
          for (const { entryId, comment } of outcome.importResult.matched) {
            const entry = state.star.find(e => e.id === entryId);
            if (entry) {
              dispatch({ type: 'UPDATE_STAR', payload: { ...entry, reviewComments: [...(entry.reviewComments || []), comment] } });
            }
          }
        }
        if (outcome.message) {
          setSnack(outcome.message);
        }
        // Refresh unmatched comments state
        setUnmatchedComments(getUnmatchedComments());
      }
    } finally {
      setCheckLoading(false);
    }
  };

  const handleShareForReview = async () => {
    setShareLoading(true);
    setShareError('');
    setShareLink('');
    setOutlookUrl('');
    setShareDialogOpen(true);
    try {
      const { reviewUrl } = await createReviewSession({
        entries: state.star.map(e => ({
          id: e.id, title: e.title, situation: e.situation,
          task: e.task, action: e.action, results: e.results,
          principles: e.principles,
          reviewComments: e.reviewComments || [],
        })),
        employeeName: state.profile.name,
        targetLevel: state.profile.targetLevel,
      });
      setShareLink(reviewUrl);
      const sid = reviewUrl.split('/review/')[1];
      if (sid) localStorage.setItem(getPendingReviewKey(), sid);

      // Build Outlook compose URL for the dialog button
      const managerEmail = state.profile.manager?.includes('@') ? state.profile.manager : '';
      const managerFirst = state.profile.manager?.split(/[\s@]/)[0] || 'Manager';
      const subject = `Promotion Document Review Request - ${state.profile.name}`;
      const body = `Hi ${managerFirst},

I've prepared my promotion document for your review. Please use the link below to review my STAR narratives and leave your feedback:

${reviewUrl}

The link will be active for 7 days. You can add comments directly on each entry.

Thank you,
${state.profile.name}`;
      setOutlookUrl(`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(managerEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Failed to create review session');
    } finally {
      setShareLoading(false);
    }
  };

  const openNew = () => { setEditing(null); setPreTaggedResponsibility(undefined); setDialogHelperText(undefined); setOpen(true); };
  const openNewForResponsibility = (responsibilityId?: string) => {
    setEditing(null);
    setPreTaggedResponsibility(responsibilityId);
    // Build helper text from guideline rubric
    if (responsibilityId) {
      const targetLevel = state.profile.targetLevel;
      const guidelines = GUIDELINES[targetLevel as 'L4' | 'L5'] || [];
      const guideline = guidelines.find(g => g.id === responsibilityId);
      if (guideline) {
        setDialogHelperText(`Reviewer guidance: ${guideline.rubric}`);
      }
    } else {
      setDialogHelperText(undefined);
    }
    setOpen(true);
  };
  const openEdit = (entry: STAREntry) => { setEditing(entry); setPreTaggedResponsibility(undefined); setDialogHelperText(undefined); setOpen(true); };

  const handleSubmit = (entry: STAREntry) => {
    dispatch({ type: editing ? 'UPDATE_STAR' : 'ADD_STAR', payload: entry });
    setOpen(false);

    // Auto-suggest dimensions in the background (non-blocking)
    const targetLevel = state.profile.targetLevel;
    const guidelines = GUIDELINES[targetLevel as 'L4' | 'L5'];
    if (guidelines) {
      (async () => {
        try {
          const prompt = suggestDimensions(entry, guidelines);
          const raw = await chat(prompt.system, prompt.user);
          const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          const suggestions: DimensionSuggestion[] = parsed.suggestions || [];

          // Exclude already-confirmed dimensions
          const confirmed = new Set(entry.dimensions || []);
          const novel = suggestions
            .filter(s => !confirmed.has(s.id))
            .map(s => ({ id: s.id, justification: s.justification }));

          // Validate against entry text
          const validated = validateSuggestions(novel, entry);

          if (validated.length > 0) {
            dispatch({ type: 'SET_ENTRY_AI_SUGGESTIONS', payload: { entryId: entry.id, suggestions: validated } });
            setSnack(`AI found ${validated.length} possible guideline match${validated.length > 1 ? 'es' : ''} — review them in Promotion Readiness`);
          }
        } catch (e) {
          console.warn('[auto-suggest] AI dimension suggestion failed:', e instanceof Error ? e.message : e);
        }
      })();
    }
  };

  const handleDuplicate = (entry: STAREntry) => {
    const dup: STAREntry = { ...entry, id: uuid(), title: entry.title + ' (copy)' };
    dispatch({ type: 'ADD_STAR', payload: dup });
  };

  const handleDelete = (entry: STAREntry) => {
    dispatch({ type: 'DELETE_STAR', payload: entry.id });
    showUndo(`"${entry.title}" deleted`, () => dispatch({ type: 'ADD_STAR', payload: entry }));
  };

  const handleTemplateSelect = (entry: STAREntry) => {
    dispatch({ type: 'ADD_STAR', payload: entry });
    setTemplateOpen(false);
    setEditing(entry);
    setOpen(true);
  };

  const filtered = state.star.filter((s: STAREntry) => {
    if (filterLP && !s.principles.includes(filterLP as LeadershipPrinciple)) return false;
    if (search && !`${s.title} ${s.situation} ${s.action} ${s.results}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a: STAREntry, b: STAREntry) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>STAR Narratives</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasPendingReview && (
            <Button variant="outlined" startIcon={<RateReview />} onClick={handleCheckForReview} disabled={checkLoading}>
              {checkLoading ? 'Checking…' : 'Check for Review'}
            </Button>
          )}
          {hasUnmatchedComments && (
            <Button variant="outlined" color="warning" onClick={() => setUnmatchedDialogOpen(true)}>
              View unmatched manager feedback
            </Button>
          )}
          {state.star.length > 0 && (
            <Button variant="outlined" startIcon={<Share />} onClick={handleShareForReview}>Share for Review</Button>
          )}
          <Button variant="outlined" onClick={() => setTemplateOpen(true)}>Use Template</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openNew}>New Entry</Button>
        </Box>
      </Box>

      <PageTip id="star" title="What are STAR entries?">
        STAR stands for Situation, Task, Action, and Results. Each entry documents a specific example of how you demonstrated Amazon Leadership Principles. You can customize the form — hide fields you don't need, add custom text fields or images. Use "Format with AI" to polish your entries.
      </PageTip>

      <DimensionCoveragePanel onStartEntry={openNewForResponsibility} />

      {/* Filters */}
      <Box role="search" aria-label="Filter STAR entries" sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 200 }} />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by LP</InputLabel>
          <Select value={filterLP} onChange={e => setFilterLP(e.target.value)} label="Filter by LP">
            <MenuItem value="">All</MenuItem>
            {LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple) => <MenuItem key={lp} value={lp}>{lp}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          {state.star.length === 0 ? 'No STAR entries yet. Click "New Entry" to add your first narrative.' : 'No entries match your filters.'}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((entry: STAREntry) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={entry.id}>
              <STARRCard entry={entry} onEdit={openEdit} onView={setViewing} onDuplicate={handleDuplicate} onDelete={handleDelete} />
            </Grid>
          ))}
        </Grid>
      )}

      <TemplatePickerDialog open={templateOpen} onClose={() => setTemplateOpen(false)} onSelect={handleTemplateSelect} />
      <STARRFormDialog open={open} editing={editing} onClose={() => setOpen(false)} onSubmit={handleSubmit} preTaggedResponsibility={preTaggedResponsibility} helperText={dialogHelperText} />

      {/* View Dialog */}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="md" fullWidth>
        {viewing && (<>
          <DialogTitle>
            {viewing.title}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {viewing.principles.map(p => <Chip key={p} label={p} size="small" color="primary" variant="outlined" />)}
              <Chip label={viewing.quarter} size="small" variant="outlined" />
              <Chip label={viewing.date} size="small" variant="outlined" />
            </Box>
            {(['situation', 'task', 'action', 'results'] as const).map(field => {
              const val = viewing[field];
              if (!val) return null;
              return (
                <Box key={field}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', color: 'primary.main' }}>{field}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{val}</Typography>
                </Box>
              );
            })}
            {viewing.evidenceLinks.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="primary.main">Evidence Links</Typography>
                {viewing.evidenceLinks.map((l, i) => <Typography key={i} variant="body2" sx={{ wordBreak: 'break-all' }}>{l}</Typography>)}
              </Box>
            )}
            {viewing.reviewComments && viewing.reviewComments.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
                  💬 Conversation
                </Typography>
                {[...viewing.reviewComments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((c, i) => (
                  <Box key={c.id || i} sx={{ bgcolor: c.source === 'engineer' ? 'action.hover' : 'action.selected', borderRadius: 2, p: '10px 14px', mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: c.source === 'engineer' ? 'primary.main' : 'text.secondary' }}>
                      {c.source === 'engineer' ? 'You' : 'Manager'}
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, mt: 0.25 }}>{c.text}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>{c.date}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                size="small"
                multiline
                rows={2}
                fullWidth
                placeholder="Add a note for your manager..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <Button
                variant="outlined"
                size="small"
                disabled={!noteText.trim()}
                onClick={() => {
                  const comment: ReviewComment = {
                    id: uuid(),
                    text: noteText.trim(),
                    date: new Date().toISOString().split('T')[0],
                    source: 'engineer',
                  };
                  const updated = { ...viewing, reviewComments: [...(viewing.reviewComments || []), comment] };
                  dispatch({ type: 'UPDATE_STAR', payload: updated });
                  setViewing(updated);
                  setNoteText('');
                }}
                sx={{ whiteSpace: 'nowrap', mt: 0.5 }}
              >
                Add Note
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewing(null)}>Close</Button>
            <Button variant="contained" onClick={() => { setViewing(null); openEdit(viewing); }}>Edit</Button>
          </DialogActions>
        </>)}
      </Dialog>

      {/* Share Review Link Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share for Review</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {shareLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>}
          {shareError && <Alert severity="error">{shareError}</Alert>}
          {shareLink && (
            <>
              <Alert severity="success">Review link created! Send it to your manager via Outlook.</Alert>
              {outlookUrl && (
                <Button variant="contained" startIcon={<Share />} onClick={() => window.open(outlookUrl, '_blank')} sx={{ bgcolor: '#0078d4', '&:hover': { bgcolor: '#106ebe' } }}>
                  Open in Outlook
                </Button>
              )}
              <Divider>or copy the link</Divider>
              <TextField fullWidth value={shareLink} slotProps={{ input: { readOnly: true } }} size="small" />
              <Button startIcon={<ContentCopy />} variant="outlined" size="small" onClick={() => { navigator.clipboard.writeText(shareLink); setSnack('Link copied!'); }}>
                Copy Link
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Unmatched Manager Feedback Dialog */}
      <Dialog open={unmatchedDialogOpen} onClose={() => setUnmatchedDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Unmatched Manager Feedback</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These comments could not be matched to your current entries (entries may have been recreated with new IDs).
          </Typography>
          {unmatchedComments.map((item, i) => (
            <Box key={i} sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2">{item.title}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{item.text}</Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { clearUnmatchedComments(); setUnmatchedComments([]); setUnmatchedDialogOpen(false); }}>
            Dismiss
          </Button>
          <Button onClick={() => setUnmatchedDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={6000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnack(null)} variant="filled">{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
