import { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Chip, Grid, FormControl, InputLabel, Select, OutlinedInput,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Add, Delete, Edit, ExpandMore, ContentCopy } from '@mui/icons-material';
import PageTip from '../components/PageTip';
import WordCount from '../components/WordCount';
import { useForm, Controller } from 'react-hook-form';
import { v4 as uuid } from 'uuid';
import { useApp } from '../store/AppContext';
import { STARREntry, LEADERSHIP_PRINCIPLES, LeadershipPrinciple } from '../types';
import { getQuarter } from '../utils/helpers';
import { showUndo } from '../components/UndoSnackbar';
import { STARR_TEMPLATES, createFromTemplate } from '../utils/starrTemplates';

const IMPACT_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;
const IMPACT_COLORS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  Low: 'default', Medium: 'info', High: 'warning', Critical: 'error',
};

type FormData = Omit<STARREntry, 'id' | 'quarter' | 'evidenceLinks'> & { evidenceLinks: string };

export default function STARRPage() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<STARREntry | null>(null);
  const [filterLP, setFilterLP] = useState<string>('');
  const [filterImpact, setFilterImpact] = useState<string>('');
  const [search, setSearch] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);

  const { control, handleSubmit, reset, watch } = useForm<FormData>();
  const watchedFields = watch();

  const openNew = () => { setEditing(null); reset({ title: '', situation: '', task: '', action: '', results: '', reflection: '', principles: [], date: new Date().toISOString().split('T')[0], impactLevel: 'Medium', evidenceLinks: '' }); setOpen(true); };
  const openEdit = (entry: STARREntry) => { setEditing(entry); reset({ ...entry, evidenceLinks: entry.evidenceLinks.join('\n') }); setOpen(true); };

  const onSubmit = (data: FormData) => {
    const entry: STARREntry = {
      ...data,
      id: editing?.id || uuid(),
      quarter: getQuarter(data.date),
      evidenceLinks: data.evidenceLinks.split('\n').filter(Boolean),
    };
    dispatch({ type: editing ? 'UPDATE_STARR' : 'ADD_STARR', payload: entry });
    setOpen(false);
  };

  const filtered = state.starr.filter((s: STARREntry) => {
    if (filterLP && !s.principles.includes(filterLP as LeadershipPrinciple)) return false;
    if (filterImpact && s.impactLevel !== filterImpact) return false;
    if (search && !`${s.title} ${s.situation} ${s.action} ${s.results}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a: STARREntry, b: STARREntry) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>STARR Demonstrations</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => setTemplateOpen(true)}>Use Template</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openNew}>New Entry</Button>
        </Box>
      </Box>

      <PageTip id="starr" title="What are STARR entries?">
        STARR stands for Situation, Task, Action, Results, and Reflection. Each entry documents a specific example of how you demonstrated Amazon Leadership Principles. All fields are optional — fill in what's relevant. Tag entries with the LPs they demonstrate. These form the core of your promotion document's "Promotion Assessment" section.
      </PageTip>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 200 }} />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by LP</InputLabel>
          <Select value={filterLP} onChange={e => setFilterLP(e.target.value)} label="Filter by LP">
            <MenuItem value="">All</MenuItem>
            {LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple) => <MenuItem key={lp} value={lp}>{lp}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Impact</InputLabel>
          <Select value={filterImpact} onChange={e => setFilterImpact(e.target.value)} label="Impact">
            <MenuItem value="">All</MenuItem>
            {IMPACT_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          {state.starr.length === 0 ? 'No STARR entries yet. Click "New Entry" to add your first demonstration.' : 'No entries match your filters.'}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((entry: STARREntry) => (
            <Grid size={{ xs: 12 }} key={entry.id}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%', pr: 2 }}>
                    <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>{entry.title}</Typography>
                    <Chip size="small" label={entry.impactLevel} color={IMPACT_COLORS[entry.impactLevel]} />
                    <Chip size="small" label={entry.quarter} variant="outlined" />
                    {entry.principles.slice(0, 3).map((p: string) => <Chip key={p} size="small" label={p} color="primary" variant="outlined" />)}
                    {entry.principles.length > 3 && <Chip size="small" label={`+${entry.principles.length - 3}`} />}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 1 }}><Typography variant="subtitle2" color="primary">Situation</Typography><Typography>{entry.situation}</Typography></Box>
                  <Box sx={{ mb: 1 }}><Typography variant="subtitle2" color="primary">Task</Typography><Typography>{entry.task}</Typography></Box>
                  <Box sx={{ mb: 1 }}><Typography variant="subtitle2" color="primary">Action</Typography><Typography>{entry.action}</Typography></Box>
                  <Box sx={{ mb: 1 }}><Typography variant="subtitle2" color="primary">Results</Typography><Typography>{entry.results}</Typography></Box>
                  <Box sx={{ mb: 1 }}><Typography variant="subtitle2" color="primary">Reflection</Typography><Typography>{entry.reflection}</Typography></Box>
                  {entry.evidenceLinks.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Evidence</Typography>
                      {entry.evidenceLinks.map((link: string, i: number) => <Typography key={i} variant="body2"><a href={link} target="_blank" rel="noreferrer">{link}</a></Typography>)}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button size="small" startIcon={<Edit />} onClick={() => openEdit(entry)}>Edit</Button>
                    <Button size="small" startIcon={<ContentCopy />} onClick={() => {
                      const dup: STARREntry = { ...entry, id: uuid(), title: entry.title + ' (copy)' };
                      dispatch({ type: 'ADD_STARR', payload: dup });
                    }}>Duplicate</Button>
                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => {
                      dispatch({ type: 'DELETE_STARR', payload: entry.id });
                      showUndo(`"${entry.title}" deleted`, () => dispatch({ type: 'ADD_STARR', payload: entry }));
                    }}>Delete</Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Template Picker Dialog */}
      <Dialog open={templateOpen} onClose={() => setTemplateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start from a Template</DialogTitle>
        <DialogContent>
          {STARR_TEMPLATES.map((t, i) => (
            <Box key={i} sx={{ p: 2, mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => {
                const entry = createFromTemplate(t);
                dispatch({ type: 'ADD_STARR', payload: entry });
                setTemplateOpen(false);
                // Open it for editing immediately
                setEditing(entry);
                reset({ ...entry, evidenceLinks: entry.evidenceLinks.join('\n') });
                setOpen(true);
              }}>
              <Typography sx={{ fontWeight: 600 }}>{t.title}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                {t.principles.map((p: string) => <Chip key={p} label={p} size="small" variant="outlined" />)}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {t.situation.substring(0, 100)}{t.situation.length > 100 ? '…' : ''}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editing ? 'Edit' : 'New'} STARR Demonstration</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <Controller name="title" control={control} render={({ field }) => <TextField {...field} label="Title" fullWidth />} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller name="date" control={control} render={({ field }) => <TextField {...field} label="Date" type="date" InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />} />
              <Controller name="impactLevel" control={control} render={({ field }) => (
                <TextField {...field} label="Impact Level" select sx={{ flex: 1 }}>
                  {IMPACT_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </TextField>
              )} />
            </Box>
            <Controller name="principles" control={control} render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Leadership Principles</InputLabel>
                <Select<string[]> multiple value={field.value || []} onChange={(e) => field.onChange(e.target.value)} input={<OutlinedInput label="Leadership Principles" />}
                  renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((v: string) => <Chip key={v} label={v} size="small" />)}</Box>}>
                  {LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple) => <MenuItem key={lp} value={lp}>{lp}</MenuItem>)}
                </Select>
              </FormControl>
            )} />
            <Controller name="situation" control={control} render={({ field }) => <TextField {...field} label="Situation" multiline rows={3} fullWidth />} />
            <WordCount text={watchedFields.situation || ''} />
            <Controller name="task" control={control} render={({ field }) => <TextField {...field} label="Task" multiline rows={2} fullWidth />} />
            <WordCount text={watchedFields.task || ''} />
            <Controller name="action" control={control} render={({ field }) => <TextField {...field} label="Action" multiline rows={4} fullWidth />} />
            <WordCount text={watchedFields.action || ''} />
            <Controller name="results" control={control} render={({ field }) => <TextField {...field} label="Results" multiline rows={3} fullWidth />} />
            <WordCount text={watchedFields.results || ''} />
            <Controller name="reflection" control={control} render={({ field }) => <TextField {...field} label="Reflection" multiline rows={2} fullWidth />} />
            <WordCount text={watchedFields.reflection || ''} />
            <Controller name="evidenceLinks" control={control} render={({ field }) => <TextField {...field} label="Evidence Links (one per line)" multiline rows={2} fullWidth />} />
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
