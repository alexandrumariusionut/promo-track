import { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Card, CardContent, CardActions, Chip, Grid,
  LinearProgress, Slider,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { v4 as uuid } from 'uuid';
import { useApp } from '../store/AppContext';
import { Goal } from '../types';

const CATEGORIES = ['Technical', 'Leadership', 'Business', 'Development'] as const;
const STATUSES = ['Not Started', 'In Progress', 'Completed'] as const;
const STATUS_COLORS: Record<string, 'default' | 'info' | 'success'> = { 'Not Started': 'default', 'In Progress': 'info', Completed: 'success' };

export default function GoalsPage() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const { control, handleSubmit, reset } = useForm<Omit<Goal, 'id'>>();

  const openNew = () => { setEditing(null); reset({ title: '', description: '', targetDate: '', progress: 0, status: 'Not Started', category: 'Technical' }); setOpen(true); };
  const openEdit = (g: Goal) => { setEditing(g); reset(g); setOpen(true); };

  const onSubmit = (data: Omit<Goal, 'id'>) => {
    const goal: Goal = { ...data, id: editing?.id || uuid(), progress: Number(data.progress) };
    dispatch({ type: editing ? 'UPDATE_GOAL' : 'ADD_GOAL', payload: goal });
    setOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Goals & Development</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openNew}>New Goal</Button>
      </Box>

      {state.goals.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>No goals set yet.</Typography>
      ) : (
        <Grid container spacing={2}>
          {state.goals.map((g: Goal) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={g.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{g.title}</Typography>
                    <Chip size="small" label={g.status} color={STATUS_COLORS[g.status]} />
                  </Box>
                  <Chip size="small" label={g.category} variant="outlined" sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{g.description}</Typography>
                  {g.targetDate && <Typography variant="caption" color="text.secondary">Target: {g.targetDate}</Typography>}
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Progress</Typography>
                      <Typography variant="body2">{g.progress}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={g.progress} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<Edit />} onClick={() => openEdit(g)}>Edit</Button>
                  <Button size="small" color="error" startIcon={<Delete />} onClick={() => dispatch({ type: 'DELETE_GOAL', payload: g.id })}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit' : 'New'} Goal</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <Controller name="title" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Title" required fullWidth />} />
            <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Description" multiline rows={3} fullWidth />} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller name="category" control={control} render={({ field }) => (
                <TextField {...field} label="Category" select sx={{ flex: 1 }}>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              )} />
              <Controller name="status" control={control} render={({ field }) => (
                <TextField {...field} label="Status" select sx={{ flex: 1 }}>
                  {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              )} />
            </Box>
            <Controller name="targetDate" control={control} render={({ field }) => <TextField {...field} label="Target Date" type="date" InputLabelProps={{ shrink: true }} fullWidth />} />
            <Controller name="progress" control={control} render={({ field }) => (
              <Box>
                <Typography gutterBottom>Progress: {field.value}%</Typography>
                <Slider value={Number(field.value)} onChange={(_: Event, v: number | number[]) => field.onChange(v)} min={0} max={100} step={5} />
              </Box>
            )} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">{editing ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
