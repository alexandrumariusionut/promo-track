import { useState } from 'react';
import { Alert, AlertTitle, IconButton, Collapse } from '@mui/material';
import Close from '@mui/icons-material/Close';
import Lightbulb from '@mui/icons-material/Lightbulb';
import { getDismissedTipsKey } from '../store/storage';

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(getDismissedTipsKey()) || '[]'); } catch { return []; }
}

export default function PageTip({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(!getDismissed().includes(id));

  const dismiss = () => {
    setVisible(false);
    const d = getDismissed();
    if (!d.includes(id)) localStorage.setItem(getDismissedTipsKey(), JSON.stringify([...d, id]));
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
