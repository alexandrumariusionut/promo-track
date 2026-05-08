import { useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

let globalSetError: ((message: string | null) => void) | null = null;

export function showError(message: string) {
  globalSetError?.(message);
}

export function ErrorSnackbar() {
  const [message, setMessage] = useState<string | null>(null);
  globalSetError = setMessage;

  return (
    <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
      <Alert severity="error" variant="filled" onClose={() => setMessage(null)}>
        {message}
      </Alert>
    </Snackbar>
  );
}