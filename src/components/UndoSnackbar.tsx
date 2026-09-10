import { useState, useEffect } from 'react';
import { Snackbar, Alert, Button } from '@mui/material';

interface UndoState {
  message: string;
  undo: () => void;
}

let globalSetUndo: ((u: UndoState | null) => void) | null = null;

export function showUndo(message: string, undo: () => void) {
  globalSetUndo?.({ message, undo });
}

export function UndoSnackbar() {
  const [state, setState] = useState<UndoState | null>(null);
  useEffect(() => {
    globalSetUndo = setState;
    return () => { globalSetUndo = null; };
  }, []);

  const handleUndo = () => { state?.undo(); setState(null); };

  return (
    <Snackbar open={!!state} autoHideDuration={6000} onClose={() => setState(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
      <Alert severity="warning" variant="filled" onClose={() => setState(null)}
        action={<Button color="inherit" size="small" onClick={handleUndo}>UNDO</Button>}>
        {state?.message}
      </Alert>
    </Snackbar>
  );
}
