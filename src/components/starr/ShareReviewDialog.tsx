import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, Switch, TextField, Typography,
} from '@mui/material';
import { ContentCopy, LinkOff, Share } from '@mui/icons-material';
import { AppState } from '../../types';
import { createReviewSession, revokeReviewSession } from '../../utils/reviewApi';
import { getPendingReviewKey } from '../../store/storage';
import { normalizeAlias } from '../../utils/alias';


function buildOutlookUrl(state: AppState, reviewUrl: string, reviewerAliases: string[]): string {
  const manager = state.profile.manager || '';
  const to = reviewerAliases.length > 0
    ? reviewerAliases.map((a) => `${a}@amazon.com`).join(';')
    : (manager.includes('@') ? manager : '');
  const managerFirst = manager.split(/[\s@]/)[0] || 'Manager';
  const subject = `Promotion Document Review Request - ${state.profile.name}`;
  const body = `Hi ${managerFirst},

I've prepared my promotion document for your review. Please use the link below to review my STAR narratives and leave your feedback:

${reviewUrl}

The link will be active for 7 days. You can add comments directly on each entry.

Thank you,
${state.profile.name}`;
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  state: AppState;
  onNotify: (message: string) => void;
  /** Called after a link is created or revoked so the parent can refresh pending-review UI. */
  onChanged?: () => void;
}

/**
 * Two-step share flow:
 *  1. Configure: choose who may open the link (defaults to the manager alias), or allow anyone with the link.
 *  2. Result: copy / send the link, or revoke it.
 * If a link already exists (pending review), the dialog opens on step 2 with a revoke option.
 */
export default function ShareReviewDialog({ open, onClose, state, onNotify, onChanged }: Props) {
  // Read once per open so the dialog does not flip state mid-flow
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const defaultReviewer = useMemo(() => normalizeAlias(state.profile.manager || ''), [state.profile.manager]);

  const [restrict, setRestrict] = useState(true);
  const [reviewers, setReviewers] = useState<string[]>([]);
  const [reviewerInput, setReviewerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [outlookUrl, setOutlookUrl] = useState('');

  // Reset per open
  useEffect(() => {
    if (!open) return;
    const existing = localStorage.getItem(getPendingReviewKey());
    setExistingSessionId(existing);
    setJustCreated(false);
    setError('');
    setLoading(false);
    setReviewers(defaultReviewer ? [defaultReviewer] : []);
    setReviewerInput('');
    if (existing) {
      const url = `${window.location.origin}/review/${existing}`;
      setLink(url);
      setOutlookUrl(buildOutlookUrl(state, url, defaultReviewer ? [defaultReviewer] : []));
    } else {
      setLink('');
      setOutlookUrl('');
    }
  }, [open, defaultReviewer, state]);

  const commitReviewerInput = (): string[] | null => {
    const raw = reviewerInput.trim();
    if (!raw) return reviewers;
    const alias = normalizeAlias(raw);
    if (!alias) { setError(`"${raw}" is not a valid Amazon alias`); return null; }
    const next = reviewers.includes(alias) ? reviewers : [...reviewers, alias];
    setReviewers(next);
    setReviewerInput('');
    return next;
  };

  const handleCreate = async () => {
    setError('');
    const finalReviewers = restrict ? commitReviewerInput() : [];
    if (finalReviewers === null) return;
    if (restrict && finalReviewers.length === 0) { setError('Add at least one reviewer alias, or allow anyone with the link.'); return; }

    setLoading(true);
    try {
      const { reviewUrl, sessionId } = await createReviewSession({
        entries: state.star.map((e) => ({
          id: e.id, title: e.title, situation: e.situation, task: e.task, action: e.action,
          results: e.results, principles: e.principles, reviewComments: e.reviewComments || [],
        })),
        employeeName: state.profile.name,
        targetLevel: state.profile.targetLevel,
        reviewerAliases: finalReviewers,
      });
      localStorage.setItem(getPendingReviewKey(), sessionId);
      setExistingSessionId(sessionId);
      setJustCreated(true);
      setLink(reviewUrl);
      setOutlookUrl(buildOutlookUrl(state, reviewUrl, finalReviewers));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create review session');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    const sid = existingSessionId || link.split('/review/')[1];
    if (!sid) return;
    setLoading(true);
    setError('');
    try {
      await revokeReviewSession(sid);
      localStorage.removeItem(getPendingReviewKey());
      setLink('');
      setOutlookUrl('');
      onNotify('Review link revoked. Anyone opening it will now see "not found".');
      onChanged?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="share-review-title">
      <DialogTitle id="share-review-title">Share for Review</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error" role="alert">{error}</Alert>}

        {!link && (
          <>
            <Typography variant="body2" color="text.secondary">
              Your STAR narratives will be shared read-only for 7 days. Reviewers must be signed in with Midway.
            </Typography>
            <FormControlLabel
              control={<Switch checked={restrict} onChange={(e) => setRestrict(e.target.checked)} />}
              label="Only these people can open the link"
            />
            {restrict ? (
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={reviewers}
                inputValue={reviewerInput}
                onInputChange={(_, v) => setReviewerInput(v)}
                onChange={(_, values) => {
                  const cleaned = values.map((v) => normalizeAlias(String(v))).filter((v): v is string => !!v);
                  setReviewers([...new Set(cleaned)]);
                  setError('');
                }}
                renderValue={(values, getTagProps) => values.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={option} label={`${option}@`} size="small" />
                ))}
                renderInput={(params) => (
                  <TextField {...params} label="Reviewer aliases" placeholder="alias, then Enter"
                    helperText="Pre-filled from your Manager field. Add up to 10 aliases." />
                )}
              />
            ) : (
              <Alert severity="warning">
                Anyone at Amazon who has the link will be able to read your narratives and leave comments.
              </Alert>
            )}
            <Alert severity="info" sx={{ fontSize: 13 }}>
              Sharing {state.star.length} {state.star.length === 1 ? 'entry' : 'entries'} for {state.profile.name || 'you'} · target {state.profile.targetLevel}
            </Alert>
          </>
        )}

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress aria-label="Working" /></Box>}

        {link && !loading && (
          <>
            <Alert severity="success">
              {justCreated ? 'Review link created!' : 'A review link is active.'} Send it to your reviewer via Outlook.
            </Alert>
            {outlookUrl && (
              <Button variant="contained" startIcon={<Share />} onClick={() => window.open(outlookUrl, '_blank', 'noopener')}>
                Open in Outlook
              </Button>
            )}
            <Divider>or copy the link</Divider>
            <TextField fullWidth value={link} slotProps={{ input: { readOnly: true } }} size="small" aria-label="Review link" />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button startIcon={<ContentCopy />} variant="outlined" size="small"
                onClick={() => { navigator.clipboard.writeText(link); onNotify('Link copied!'); }}>
                Copy Link
              </Button>
              <Button startIcon={<LinkOff />} variant="outlined" color="error" size="small" onClick={handleRevoke}>
                Revoke link
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!link && (
          <Button variant="contained" onClick={handleCreate} disabled={loading || state.star.length === 0}>
            Create link
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
