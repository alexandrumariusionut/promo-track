import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, Alert, CircularProgress,
  Chip, Divider, Container,
} from '@mui/material';
import { Send, CheckCircle } from '@mui/icons-material';
import { getReview, submitComments } from '../utils/reviewApi';
import { getHarmonyUser } from '../utils/harmonyUser';

interface ReviewEntry {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  results: string;
  principles: string[];
  reviewComments?: { id: string; text: string; date: string; source: string }[];
}

interface ReviewData {
  employeeName: string;
  targetLevel: string;
  entries: ReviewEntry[];
  status: 'pending' | 'reviewed';
}

export default function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userAlias, setUserAlias] = useState<string | null>(null);

  useEffect(() => {
    getHarmonyUser().then(u => { if (u) setUserAlias(u.login); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    getReview(sessionId)
      .then(d => {
        setData(d);
        if (d.status === 'reviewed') setSubmitted(true);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleSubmit = async () => {
    if (!sessionId) return;
    const toSubmit: Record<string, { text: string }> = {};
    Object.entries(comments).forEach(([id, text]) => {
      if (text.trim()) toSubmit[id] = { text: text.trim() };
    });
    if (Object.keys(toSubmit).length === 0) return;
    setSubmitting(true);
    try {
      await submitComments(sessionId, toSubmit);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{error || 'Review not found'}</Alert>
      </Container>
    );
  }

  if (submitted) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>Comments submitted!</Typography>
          <Typography color="text.secondary">
            The employee will see your feedback in their promotion tracker.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)', color: 'white' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Portfolio Review</Typography>
        <Typography sx={{ mt: 1, opacity: 0.9 }}>
          {data.employeeName} · Target: {data.targetLevel}
        </Typography>
      </Paper>

      {data.entries.map((entry) => (
        <Paper key={entry.id} sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{entry.title}</Typography>
          {entry.principles.length > 0 && (
            <Box sx={{ mt: 1, mb: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {entry.principles.map(lp => (
                <Chip key={lp} label={lp} size="small" variant="outlined" color="primary" />
              ))}
            </Box>
          )}

          {(['situation', 'task', 'action', 'results'] as const).map(field => (
            entry[field] ? (
              <Box key={field} sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {field}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{entry[field]}</Typography>
              </Box>
            ) : null
          ))}

          <Divider sx={{ my: 2 }} />
          {entry.reviewComments && entry.reviewComments.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>💬 Conversation</Typography>
              {[...entry.reviewComments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((c, ci) => (
                <Box key={c.id || ci} sx={{
                  bgcolor: c.source === 'engineer' ? 'action.hover' : 'action.selected',
                  borderRadius: 2, p: '10px 14px', mb: 1,
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: c.source === 'engineer' ? 'text.secondary' : 'primary.main' }}>
                    {c.source === 'engineer' ? 'Employee' : 'Manager'}
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.7, mt: 0.25 }}>{c.text}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                    {(c as { commenterAlias?: string }).commenterAlias
                      ? `From ${(c as { commenterAlias?: string }).commenterAlias}@ on ${new Date(c.date).toLocaleDateString()}`
                      : c.date}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Add your feedback for this entry..."
            value={comments[entry.id] || ''}
            onChange={e => setComments(prev => ({ ...prev, [entry.id]: e.target.value }))}
            variant="outlined"
            size="small"
          />
        </Paper>
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3, mb: 4, gap: 2 }}>
        {userAlias && (
          <Typography variant="caption" color="text.secondary">
            You will submit as {userAlias}@
          </Typography>
        )}
        <Button
          variant="contained"
          size="large"
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
          onClick={handleSubmit}
          disabled={submitting || Object.values(comments).every(c => !c.trim())}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </Box>
    </Container>
  );
}
