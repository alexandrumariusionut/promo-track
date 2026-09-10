import { useState, useRef } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Paper, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, Checkbox, Tooltip, CircularProgress,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import PictureAsPdf from '@mui/icons-material/PictureAsPdf';
import DeleteSweep from '@mui/icons-material/DeleteSweep';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import { useForm, Controller } from 'react-hook-form';
import { v4 as uuid } from 'uuid';
import { useApp } from '../store/AppContext';
import { Metric } from '../types';
import { extractPDFText, extractPDFItems, parseGSDMetricsV2, ParseDiagnostics } from '../utils/pdfImport';
import MetricEvolution from '../components/MetricEvolution';
import PageTip from '../components/PageTip';

const METRIC_TYPES = ['CSAT', 'Case ARR', 'AHT', 'CPH', 'ACW', 'Contacts Missed %', 'Dual Chat Overlap %', 'CSAT Rating', 'Transfer Rate', 'Feedbacks Received', 'DSATs Received', 'Escalated', 'AHT Assist', 'Dual Chat Rate', 'Custom'];
const PERIODS = ['weekly', 'monthly', 'quarterly'] as const;
const PCT_TYPES = ['CSAT', 'Case ARR', 'Transfer Rate', 'Dual Chat Overlap %', 'Dual Chat Rate', 'Contacts Missed %'];

// Min threshold types: higher is better (value should be ≥ target)
const MIN_THRESHOLD_TYPES = ['CSAT', 'Case ARR', 'Dual Chat Overlap %', 'Custom'];

type TargetStatus = 'met' | 'missed' | 'none';

function targetStatus(type: string, value: number, target: number): TargetStatus {
  if (!target) return 'none';
  const higherIsBetter = MIN_THRESHOLD_TYPES.includes(type);
  return (higherIsBetter ? value >= target : value <= target) ? 'met' : 'missed';
}

/** Colour is never the only cue: an icon + accessible label accompany it. */
function StatusIcon({ status }: { status: TargetStatus }) {
  if (status === 'none') return null;
  return status === 'met'
    ? <CheckCircle fontSize="inherit" color="success" titleAccess="On target" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />
    : <Cancel fontSize="inherit" color="error" titleAccess="Below target" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />;
}

function targetLabel(type: string, target: number): string {
  if (!target) return '—';
  const prefix = MIN_THRESHOLD_TYPES.includes(type) ? 'Min' : 'Max';
  return `${prefix}: ${target}`;
}

export default function MetricsPage() {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<Metric[] | null>(null);
  const [pdfSelected, setPdfSelected] = useState<Set<string>>(new Set());
  const [pdfError, setPdfError] = useState('');
  const [pdfDiagnostics, setPdfDiagnostics] = useState<ParseDiagnostics | null>(null);
  const [showRawTable, setShowRawTable] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);
  const { control, handleSubmit, reset } = useForm<Omit<Metric, 'id'>>();

  const onSubmit = (data: Omit<Metric, 'id'>) => {
    dispatch({ type: 'ADD_METRIC', payload: { ...data, id: uuid(), value: Number(data.value), target: Number(data.target) } });
    setOpen(false);
  };

  const handlePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError('');
    setPdfDiagnostics(null);
    setImporting(true);
    try {
      const text = await extractPDFText(file);
      const items = await extractPDFItems(file);
      const result = parseGSDMetricsV2(text, items);
      setPdfDiagnostics(result.diagnostics);
      if (result.metrics.length === 0) {
        // Only error when truly nothing was found AND there are no "no data" diagnoses
        const hasNoDataDiagnoses = result.diagnostics.missing.some(m => m.reason.includes('no data'));
        if (!hasNoDataDiagnoses) {
          setPdfError('PDF read but no metric data found — check the report date range. ' +
            (result.diagnostics.warnings.length > 0 ? result.diagnostics.warnings.join('; ') : ''));
        } else {
          setPdfError('');
          setPdfPreview([]);
          setPdfSelected(new Set());
        }
        return;
      }
      setPdfPreview(result.metrics);
      setPdfSelected(new Set(result.metrics.map((m: Metric) => m.id)));
    } catch (err) { setPdfError(`Failed to parse PDF: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`); }
    finally { setImporting(false); }
    e.target.value = '';
  };

  const confirmPdfImport = () => {
    if (!pdfPreview) return;
    dispatch({ type: 'IMPORT_METRICS', payload: pdfPreview.filter((m: Metric) => pdfSelected.has(m.id)) });
    setPdfPreview(null);
  };

  const togglePdfMetric = (id: string) => {
    setPdfSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const deleteSelected = () => {
    selected.forEach(id => dispatch({ type: 'DELETE_METRIC', payload: id }));
    setSelected(new Set());
  };

  const clearAll = () => {
    state.metrics.forEach((m: Metric) => dispatch({ type: 'DELETE_METRIC', payload: m.id }));
    setSelected(new Set());
    setConfirmClear(false);
  };

  const sorted = [...state.metrics].sort((a: Metric, b: Metric) => {
    if (a.channel === 'Benchmark' && b.channel !== 'Benchmark') return 1;
    if (a.channel !== 'Benchmark' && b.channel === 'Benchmark') return -1;
    return a.type.localeCompare(b.type);
  });

  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Metrics Tracking</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {state.metrics.length > 0 && (
            <Tooltip title="Remove all metrics">
              <Button variant="outlined" color="error" startIcon={<DeleteSweep />} onClick={() => setConfirmClear(true)}>Clear All</Button>
            </Tooltip>
          )}
          <input ref={pdfRef} type="file" accept=".pdf" hidden onChange={handlePDF} />
          <Button variant="outlined" color="secondary" startIcon={importing ? <CircularProgress size={16} /> : <PictureAsPdf />} onClick={() => pdfRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Import PDF'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { reset({ type: 'CSAT', value: 0, target: 0, date: new Date().toISOString().split('T')[0], period: 'monthly', notes: '', channel: '' }); setOpen(true); }}>Add Metric</Button>
        </Box>
      </Box>

      {pdfError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPdfError('')}>{pdfError}</Alert>}

      <PageTip id="metrics" title="Metrics Tracking">
        Import your GSD Scorecard PDF to automatically extract CPH, AHT, CSAT, Case ARR, and other metrics. You can also add metrics manually. The scorecard view mirrors your GSD dashboard. Use "Clear All" to start fresh before importing a new PDF.
      </PageTip>

      {/* Performance evolution over the reporting period (weekly trend + monthly status) */}
      <MetricEvolution metrics={state.metrics} />

      {/* Toggle raw data table */}
      {state.metrics.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <Button size="small" onClick={() => setShowRawTable(!showRawTable)}>
            {showRawTable ? 'Hide' : 'Show'} Raw Data ({state.metrics.length} entries)
          </Button>
          {selected.size > 0 && (
            <Button size="small" color="error" startIcon={<Delete />} onClick={deleteSelected}>
              Delete {selected.size} selected
            </Button>
          )}
        </Box>
      )}

      {/* Raw Metrics Table with selection */}
      {(showRawTable || state.metrics.length === 0) && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allSelected} indeterminate={selected.size > 0 && !allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(sorted.map((m: Metric) => m.id)))} />
                </TableCell>
                <TableCell>Type</TableCell><TableCell>Value</TableCell><TableCell>Target</TableCell>
                <TableCell>Channel</TableCell><TableCell>Date</TableCell><TableCell>Notes</TableCell>
                <TableCell width={50}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>No metrics yet. Import from GSD Scorecard PDF, CSV, or add manually.</TableCell></TableRow>
              ) : sorted.map((m: Metric) => (
                <TableRow key={m.id} selected={selected.has(m.id)} sx={{ bgcolor: m.channel === 'Benchmark' ? 'action.hover' : 'inherit' }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} />
                  </TableCell>
                  <TableCell><Chip label={m.type} size="small" color={m.channel === 'Benchmark' ? 'default' : 'primary'} variant={m.channel === 'Benchmark' ? 'outlined' : 'filled'} /></TableCell>
                  {(() => { const st = targetStatus(m.type, m.value, m.target); return (
                  <TableCell sx={{ color: st === 'met' ? 'success.main' : st === 'missed' ? 'error.main' : 'inherit', fontWeight: m.target ? 600 : undefined, whiteSpace: 'nowrap' }}>
                    <StatusIcon status={st} />{m.value}{PCT_TYPES.includes(m.type) || m.type.includes('%') ? '%' : ''}
                  </TableCell>); })()}
                  <TableCell>{targetLabel(m.type, m.target)}</TableCell>
                  <TableCell>{m.channel}</TableCell>
                  <TableCell>{m.date}</TableCell>
                  <TableCell><Typography variant="caption">{m.notes}</Typography></TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => dispatch({ type: 'DELETE_METRIC', payload: m.id })}><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirm Clear All Dialog */}
      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>Remove all metrics?</DialogTitle>
        <DialogContent>
          <Typography>This will delete all {state.metrics.length} metrics. This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={clearAll}>Remove All</Button>
        </DialogActions>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={!!pdfPreview} onClose={() => setPdfPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>PDF Import Preview — Select metrics to import</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox checked={pdfPreview?.length === pdfSelected.size}
                      onChange={() => { if (pdfPreview?.length === pdfSelected.size) setPdfSelected(new Set()); else setPdfSelected(new Set(pdfPreview?.map((m: Metric) => m.id))); }} />
                  </TableCell>
                  <TableCell>Type</TableCell><TableCell>Value</TableCell><TableCell>Channel</TableCell><TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pdfPreview?.map((m: Metric) => (
                  <TableRow key={m.id} selected={pdfSelected.has(m.id)}>
                    <TableCell padding="checkbox"><Checkbox checked={pdfSelected.has(m.id)} onChange={() => togglePdfMetric(m.id)} /></TableCell>
                    <TableCell><Chip label={m.type} size="small" /></TableCell>
                    <TableCell>{m.value}{PCT_TYPES.includes(m.type) || m.type.includes('%') ? '%' : ''}</TableCell>
                    <TableCell>{m.channel}</TableCell>
                    <TableCell>{m.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" sx={{ mt: 1 }}>{pdfSelected.size} of {pdfPreview?.length} selected</Typography>
          {pdfDiagnostics && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Import summary: {pdfDiagnostics.found.length} KPIs found
                {pdfDiagnostics.missing.length > 0 && ` · ${pdfDiagnostics.missing.length} skipped`}
              </Typography>
              {pdfDiagnostics.missing.length > 0 && (
                <Typography variant="caption" component="div" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  Skipped: {pdfDiagnostics.missing.map(m => `${m.label} (${m.reason})`).join(', ')}
                </Typography>
              )}
              {pdfDiagnostics.warnings.length > 0 && (
                <Typography variant="caption" component="div" sx={{ mt: 0.5, color: 'warning.main' }}>
                  {pdfDiagnostics.warnings.join('; ')}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfPreview(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmPdfImport} disabled={pdfSelected.size === 0}>Import {pdfSelected.size} Metrics</Button>
        </DialogActions>
      </Dialog>

      {/* Add Metric Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add Metric</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <Controller name="type" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField {...field} label="Metric Type" select required>{METRIC_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
            )} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller name="value" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Value" type="number" required sx={{ flex: 1 }} />} />
              <Controller name="target" control={control} render={({ field }) => <TextField {...field} label="Target" type="number" sx={{ flex: 1 }} />} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller name="date" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Date" type="date" required InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />} />
              <Controller name="period" control={control} render={({ field }) => (
                <TextField {...field} label="Period" select sx={{ flex: 1 }}>{PERIODS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField>
              )} />
            </Box>
            <Controller name="channel" control={control} render={({ field }) => <TextField {...field} label="Channel (e.g., Chat, Voice, Total)" fullWidth />} />
            <Controller name="notes" control={control} render={({ field }) => <TextField {...field} label="Notes" multiline rows={2} fullWidth />} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
