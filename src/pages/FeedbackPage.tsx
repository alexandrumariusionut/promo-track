import { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Card, CardContent, CardActions, Chip, Grid,
  FormControl, InputLabel, Select, OutlinedInput, FormControlLabel, Switch,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import PageTip from '../components/PageTip';
import WordCount from '../components/WordCount';
import { useForm, Controller } from 'react-hook-form';
import { v4 as uuid } from 'uuid';
import { useApp } from '../store/AppContext';
import { FeedbackEntry, LEADERSHIP_PRINCIPLES, LeadershipPrinciple } from '../types';
import { showUndo } from '../components/UndoSnackbar';

const RELATIONSHIPS = ['Peer', 'Manager', 'Cross-functional', 'Direct Report', 'Other/Stakeholder'] as const;

export default function FeedbackPage() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackEntry | null>(null);
  const { control, handleSubmit, reset, watch } = useForm<Omit<FeedbackEntry, 'id'>>();
  const watchedFields = watch();

  const openNew = () => {
    setEditing(null);
    reset({ fromName: '', fromTitle: '', relationship: 'Peer', content: '', reasonsNotToSupport: '',
      supportsPromotion: true, date: new Date().toISOString().split('T')[0], principles: [], steamDirect: '' });
    setOpen(true);
  };

  const openEdit = (f: FeedbackEntry) => {
    setEditing(f);
    reset(f);
    setOpen(true);
  };

  const onSubmit = (data: Omit<FeedbackEntry, 'id'>) => {
    if (editing) {
      dispatch({ type: 'DELETE_FEEDBACK', payload: editing.id });
      dispatch({ type: 'ADD_FEEDBACK', payload: { ...data, id: editing.id } });
    } else {
      dispatch({ type: 'ADD_FEEDBACK', payload: { ...data, id: uuid() } });
    }
    setOpen(false);
    setEditing(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Feedback Collection</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openNew}>Add Feedback</Button>
      </Box>

      <PageTip id="feedback" title="Feedback Collection">
        Collect feedback from peers, managers, and cross-functional partners who can speak to your work. Each entry maps to the Feedback section of your promotion document. Include both "reasons to support" and "reasons not to support" — the template requires both. Aim for at least 2-3 feedback entries from different relationship types.
      </PageTip>

      {state.feedback.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>No feedback collected yet.</Typography>
      ) : (
        <Grid container spacing={2}>
          {state.feedback.sort((a: FeedbackEntry, b: FeedbackEntry) => b.date.localeCompare(a.date)).map((f: FeedbackEntry) => (
            <Grid size={{ xs: 12, sm: 6 }} key={f.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">{f.fromName}</Typography>
                      {f.fromTitle && <Typography variant="caption" color="text.secondary">{f.fromTitle}</Typography>}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip size="small" label={f.relationship} color="primary" variant="outlined" />
                      <Chip size="small" label={f.supportsPromotion ? 'Supports' : 'Does not support'}
                        color={f.supportsPromotion ? 'success' : 'error'} />
                    </Box>
                  </Box>
                  <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Reasons to support:</Typography>
                  <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{f.content}</Typography>
                  {f.reasonsNotToSupport && (
                    <>
                      <Typography variant="subtitle2" color="warning.main">Reasons not to support:</Typography>
                      <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{f.reasonsNotToSupport}</Typography>
                    </>
                  )}
                  <Typography variant="caption" color="text.secondary">{f.date}</Typography>
                  {f.principles.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {f.principles.map((p: string) => <Chip key={p} label={p} size="small" variant="outlined" />)}
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<Edit />} onClick={() => openEdit(f)}>Edit</Button>
                  <Button size="small" color="error" startIcon={<Delete />} onClick={() => {
                    dispatch({ type: 'DELETE_FEEDBACK', payload: f.id });
                    showUndo(`Feedback from "${f.fromName}" deleted`, () => dispatch({ type: 'ADD_FEEDBACK', payload: f }));
                  }}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => { setOpen(false); setEditing(null); }} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit' : 'Add'} Feedback</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <Controller name="fromName" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Feedback Provider Name" required fullWidth />} />
            <Controller name="fromTitle" control={control} render={({ field }) => <TextField {...field} label="Business Title & Job Level" fullWidth />} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller name="relationship" control={control} render={({ field }) => (
                <TextField {...field} label="Relationship" select sx={{ flex: 1 }}>
                  {RELATIONSHIPS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              )} />
              <Controller name="date" control={control} render={({ field }) => <TextField {...field} label="Date" type="date" InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />} />
            </Box>
            <Controller name="steamDirect" control={control} render={({ field }) => <TextField {...field} label="Feedback Provider Steam" fullWidth />} />
            <Controller name="supportsPromotion" control={control} render={({ field }) => (
              <FormControlLabel control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />} label="Supports Promotion" />
            )} />
            <Controller name="content" control={control} render={({ field }) => <TextField {...field} label="Reasons to support (250 words or less)" multiline rows={5} fullWidth />} />
            <WordCount text={watchedFields.content || ''} max={250} />
            <Controller name="reasonsNotToSupport" control={control} render={({ field }) => <TextField {...field} label="Reasons not to support (250 words or less)" multiline rows={3} fullWidth />} />
            <WordCount text={watchedFields.reasonsNotToSupport || ''} max={250} />
            <Controller name="principles" control={control} render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Related LPs</InputLabel>
                <Select<string[]> multiple value={field.value || []} onChange={(e) => field.onChange(e.target.value)} input={<OutlinedInput label="Related LPs" />}
                  renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{sel.map((v: string) => <Chip key={v} label={v} size="small" />)}</Box>}>
                  {LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple) => <MenuItem key={lp} value={lp}>{lp}</MenuItem>)}
                </Select>
              </FormControl>
            )} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" variant="contained">{editing ? 'Update' : 'Add'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
