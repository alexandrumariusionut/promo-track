import { useState, useRef } from 'react';
import { Box, Typography, Button, Paper, Grid, Card, CardContent, CardActions, Chip, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Description, Download, FileUpload, FileDownload, Visibility } from '@mui/icons-material';
import { useApp } from '../store/AppContext';
import { generateDocx } from '../utils/docExport';
import { exportSession, importSession } from '../utils/session';
import { readinessScore, lpCoverage } from '../utils/helpers';
import { generatePreviewHTML } from '../utils/docPreview';
import PageTip from '../components/PageTip';

export default function DocumentsPage() {
  const { state, dispatch } = useApp();
  const [snack, setSnack] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const score = readinessScore(state);
  const coverage = lpCoverage(state.starr);
  const coveredCount = Object.values(coverage).filter((v: number) => v > 0).length;

  const handleDocx = async () => { await generateDocx(state); setSnack('Word document generated!'); };
  const handleExport = () => { exportSession(state); setSnack('Portfolio session exported!'); };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importSession(file);
      dispatch({ type: 'LOAD_STATE', payload: imported });
      setSnack('Portfolio imported successfully!');
    } catch (err: any) {
      setSnack(`Import failed: ${err.message}`);
    }
    e.target.value = '';
  };

  const handleJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'promo-track-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Documents & Sessions</Typography>

      <PageTip id="documents" title="Export, Import & Generate">
        <strong>Export Session:</strong> Saves all your work to a .portfolio file you can store anywhere and reload later.<br/>
        <strong>Import Session:</strong> Load a previously saved .portfolio file to continue where you left off.<br/>
        <strong>Generate .docx:</strong> Creates a professional Word document matching the Amazon promotion template format, ready for submission.<br/>
        You can also use the buttons in the top navigation bar for quick access.
      </PageTip>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Portfolio Summary</Typography>
        <Typography>Readiness Score: <strong>{score}%</strong></Typography>
        <Typography>STARR Entries: <strong>{state.starr.length}</strong></Typography>
        <Typography>LP Coverage: <strong>{coveredCount}/16</strong></Typography>
        <Typography>Projects: <strong>{state.projects.length}</strong></Typography>
        <Typography>Feedback: <strong>{state.feedback.length}</strong></Typography>
        <Typography>Metrics: <strong>{state.metrics.length}</strong></Typography>
        {score < 50 && (
          <Chip label="Consider adding more entries before generating your document" color="warning" sx={{ mt: 2 }} />
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Session Export */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <FileDownload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Export Session</Typography>
              <Typography variant="body2" color="text.secondary">
                Save all your work to a .portfolio file. Resume later by importing it.
              </Typography>
            </CardContent>
            <CardActions>
              <Button variant="contained" startIcon={<Download />} onClick={handleExport}>Export .portfolio</Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Session Import */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <FileUpload sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6">Import Session</Typography>
              <Typography variant="body2" color="text.secondary">
                Load a previously saved .portfolio file to continue where you left off.
              </Typography>
            </CardContent>
            <CardActions>
              <input ref={fileRef} type="file" accept=".portfolio,.json" hidden onChange={handleImport} />
              <Button variant="outlined" startIcon={<FileUpload />} onClick={() => fileRef.current?.click()}>Import .portfolio</Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Document Preview */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Visibility sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">Preview Document</Typography>
              <Typography variant="body2" color="text.secondary">
                See how your promotion document will look before generating the .docx file.
              </Typography>
            </CardContent>
            <CardActions>
              <Button variant="outlined" color="warning" startIcon={<Visibility />} onClick={() => setPreviewOpen(true)}>Preview</Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Word Document */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Description sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">Promotion Document</Typography>
              <Typography variant="body2" color="text.secondary">
                Generate a professional .docx matching the Amazon promotion template format.
              </Typography>
            </CardContent>
            <CardActions>
              <Button variant="contained" color="success" startIcon={<Download />} onClick={handleDocx} disabled={state.starr.length === 0}>
                Generate .docx
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* JSON Backup */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Description sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">JSON Backup</Typography>
              <Typography variant="body2" color="text.secondary">
                Raw data export for backup purposes.
              </Typography>
            </CardContent>
            <CardActions>
              <Button variant="outlined" startIcon={<Download />} onClick={handleJSON}>Export JSON</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Document Preview</DialogTitle>
        <DialogContent>
          <Box dangerouslySetInnerHTML={{ __html: generatePreviewHTML(state) }} sx={{ '& h2': { borderBottom: '2px solid', borderColor: 'primary.main', pb: 0.5, mt: 3 }, '& table': { fontSize: 13 } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => { setPreviewOpen(false); handleDocx(); }}>Generate .docx</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnack(null)} variant="filled">{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
