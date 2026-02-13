import { useState } from 'react';
import { Alert, AlertTitle, IconButton, Collapse } from '@mui/material';
import { Close, Lightbulb } from '@mui/icons-material';

const DISMISSED_KEY = 'promo-track-dismissed-tips';

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
}

export default function PageTip({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(!getDismissed().includes(id));

  const dismiss = () => {
    setVisible(false);
    const d = getDismissed();
    if (!d.includes(id)) localStorage.setItem(DISMISSED_KEY, JSON.stringify([...d, id]));
  };

  return (
    <Collapse in={visible}>
      <Alert severity="info" icon={<Lightbulb />} sx={{ mb: 3 }}
        action={<IconButton size="small" onClick={dismiss}><Close fontSize="small" /></IconButton>}>
        <AlertTitle>{title}</AlertTitle>
        {children}
      </Alert>
    </Collapse>
  );
}
