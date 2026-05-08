import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, Chip } from '@mui/material';
import { STARR_TEMPLATES, createFromTemplate } from '../../utils/starrTemplates';
import { STAREntry } from '../../types';

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (entry: STAREntry) => void;
}

export default function TemplatePickerDialog({ open, onClose, onSelect }: TemplatePickerDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Start from a Template</DialogTitle>
      <DialogContent>
        {STARR_TEMPLATES.map((t, i) => (
          <Box key={i} role="button" tabIndex={0} aria-label={`Select template: ${t.title}`}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const entry = createFromTemplate(t); onSelect(entry); } }}
            sx={{ p: 2, mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => {
              const entry = createFromTemplate(t);
              onSelect(entry);
            }}>
            <Typography sx={{ fontWeight: 600 }}>{t.title}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              {t.principles.map((p: string) => <Chip key={p} label={p} size="small" variant="outlined" />)}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {t.situation.substring(0, 100)}{t.situation.length > 100 ? '\u2026' : ''}
            </Typography>
          </Box>
        ))}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button></DialogActions>
    </Dialog>
  );
}