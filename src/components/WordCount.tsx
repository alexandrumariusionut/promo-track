import { Typography } from '@mui/material';

export default function WordCount({ text, max }: { text: string; max?: number }) {
  const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const color = max && count > max ? 'error.main' : 'text.secondary';
  return (
    <Typography variant="caption" color={color} sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
      {count} words{max ? ` / ${max} recommended` : ''}
    </Typography>
  );
}
