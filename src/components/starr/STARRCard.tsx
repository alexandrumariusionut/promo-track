import { Box, Typography, Button, Chip } from '@mui/material';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Delete from '@mui/icons-material/Delete';
import RateReview from '@mui/icons-material/RateReview';
import Visibility from '@mui/icons-material/Visibility';
import { STAREntry } from '../../types';

interface STARRCardProps {
  entry: STAREntry;
  onEdit: (entry: STAREntry) => void;
  onView: (entry: STAREntry) => void;
  onDuplicate: (entry: STAREntry) => void;
  onDelete: (entry: STAREntry) => void;
}

export default function STARRCard({ entry, onEdit, onView, onDuplicate, onDelete }: STARRCardProps) {
  return (
    <Box onClick={() => onEdit(entry)} role="button" tabIndex={0} aria-label={`Edit STAR entry: ${entry.title}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(entry); } }}
      sx={{
      p: 2.5, borderRadius: 3, cursor: 'pointer', height: '100%',
      border: '1px solid', borderColor: 'divider', borderLeft: '4px solid',
      borderLeftColor: 'primary.main',
      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
      boxShadow: 1, transition: 'all 0.2s',
      '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
      display: 'flex', flexDirection: 'column', gap: 1,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3, flex: 1 }} noWrap>{entry.title}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', lineHeight: 1.5, fontSize: '0.82rem', flex: 1,
      }}>
        {entry.situation || entry.action || 'No content yet'}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {entry.principles.slice(0, 2).map((p: string) => (
          <Chip key={p} size="small" label={p} color="primary" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
        ))}
        {entry.principles.length > 2 && <Chip size="small" label={`+${entry.principles.length - 2}`} sx={{ fontSize: '0.7rem', height: 22 }} />}
      </Box>
      {entry.reviewComments && entry.reviewComments.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <RateReview sx={{ fontSize: 14, color: 'primary.main' }} />
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
            {entry.reviewComments.length} {entry.reviewComments.length === 1 ? 'comment' : 'comments'}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 0.5 }}>
        <Chip size="small" label={entry.quarter} variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
          <Button size="small" sx={{ minWidth: 0, p: 0.5 }} onClick={() => onView(entry)} aria-label="View entry"><Visibility sx={{ fontSize: 16 }} /></Button>
          <Button size="small" sx={{ minWidth: 0, p: 0.5 }} onClick={() => onDuplicate(entry)} aria-label="Duplicate entry"><ContentCopy sx={{ fontSize: 16 }} /></Button>
          <Button size="small" color="error" sx={{ minWidth: 0, p: 0.5 }} onClick={() => onDelete(entry)} aria-label="Delete entry"><Delete sx={{ fontSize: 16 }} /></Button>
        </Box>
      </Box>
    </Box>
  );
}