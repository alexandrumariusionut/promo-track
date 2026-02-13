import { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Card, CardContent, CardActions, Chip, Grid,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { v4 as uuid } from 'uuid';
import { useApp } from '../store/AppContext';
import { Project } from '../types';

const STATUSES = ['In Progress', 'Completed', 'Archived'] as const;
const STATUS_COLORS: Record<string, 'info' | 'success' | 'default'> = { 'In Progress': 'info', Completed: 'success', Archived: 'default' };

type FormData = Omit<Project, 'id' | 'stakeholders' | 'outcomes'> & { stakeholders: string; outcomes: string };

export default function ProjectsPage() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const { control, handleSubmit, reset } = useForm<FormData>();

  const openNew = () => { setEditing(null); reset({ title: '', description: '', startDate: new Date().toISOString().split('T')[0], endDate: '', status: 'In Progress', impact: '', stakeholders: '', outcomes: '' }); setOpen(true); };
  const openEdit = (p: Project) => { setEditing(p); reset({ ...p, stakeholders: p.stakeholders.join(', '), outcomes: p.outcomes.join('\n') }); setOpen(true); };

  const onSubmit = (data: FormData) => {
    const project: Project = {
      ...data, id: editing?.id || uuid(),
      stakeholders: data.stakeholders.split(',').map((s: string) => s.trim()).filter(Boolean),
      outcomes: data.outcomes.split('\n').filter(Boolean),
    };
    dispatch({ type: editing ? 'UPDATE_PROJECT' : 'ADD_PROJECT', payload: project });
    setOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Projects & Accomplishments</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openNew}>New Project</Button>
      </Box>

      {state.projects.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>No projects yet.</Typography>
      ) : (
        <Grid container spacing={2}>
          {state.projects.map((p: Project) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{p.title}</Typography>
                    <Chip size="small" label={p.status} color={STATUS_COLORS[p.status]} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{p.description}</Typography>
                  {p.impact && <Typography variant="body2"><strong>Impact:</strong> {p.impact}</Typography>}
                  <Typography variant="caption" color="text.secondary">{p.startDate} → {p.endDate || 'Ongoing'}</Typography>
                  {p.stakeholders.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {p.stakeholders.map((s: string) => <Chip key={s} label={s} size="small" variant="outlined" />)}
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<Edit />} onClick={() => openEdit(p)}>Edit</Button>
                  <Button size="small" color="error" startIcon={<Delete />} onClick={() => dispatch({ type: 'DELETE_PROJECT', payload: p.id })}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit' : 'New'} Project</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <Controller name="title" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Title" required fullWidth />} />
            <Controller name="description" control={control} render={({ field }) => <TextField {...field} label="Description" multiline rows={3} fullWidth />} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller name="startDate" control={control} render={({ field }) => <TextField {...field} label="Start Date" type="date" InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />} />
              <Controller name="endDate" control={control} render={({ field }) => <TextField {...field} label="End Date" type="date" InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />} />
            </Box>
            <Controller name="status" control={control} render={({ field }) => (
              <TextField {...field} label="Status" select>{STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
            )} />
            <Controller name="impact" control={control} render={({ field }) => <TextField {...field} label="Impact (quantify if possible)" multiline rows={2} fullWidth />} />
            <Controller name="stakeholders" control={control} render={({ field }) => <TextField {...field} label="Stakeholders (comma-separated)" fullWidth />} />
            <Controller name="outcomes" control={control} render={({ field }) => <TextField {...field} label="Outcomes (one per line)" multiline rows={3} fullWidth />} />
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
