import { useState } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Description, Download, Visibility } from '@mui/icons-material';
import DOMPurify from 'dompurify';
import { useApp } from '../store/AppContext';
import { generatePreviewHTML } from '../utils/docPreview';
import PageTip from '../components/PageTip';

export default function DocumentsPage() {
  const { state } = useApp();
  const [snack, setSnack] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDocx = async () => {
    const { generateDocx } = await import('../utils/docExport');
    await generateDocx(state);
    setSnack('Word document generated!');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Documents</Typography>

      <PageTip id="documents" title="Preview & Generate">
        <strong>Preview:</strong> See how your promotion document will look before generating the .docx file.<br/>
        <strong>Generate .docx:</strong> Creates a professional Word document matching the Amazon promotion template format, ready for submission.
      </PageTip>

      <Grid container spacing={3}>
        {/* Document Preview */}
        <Grid size={{ xs: 12, sm: 6 }}>
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
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Description sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">Promotion Document</Typography>
              <Typography variant="body2" color="text.secondary">
                Generate a professional .docx matching the Amazon promotion template format.
              </Typography>
            </CardContent>
            <CardActions>
              <Button variant="contained" color="success" startIcon={<Download />} onClick={handleDocx} disabled={state.star.length === 0}>
                Generate .docx
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Document Preview</DialogTitle>
        <DialogContent>
          <Box dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatePreviewHTML(state, { includeComments: false })) }} sx={{ '& h2': { borderBottom: '2px solid', borderColor: 'primary.main', pb: 0.5, mt: 3 }, '& table': { fontSize: 13 } }} />
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
