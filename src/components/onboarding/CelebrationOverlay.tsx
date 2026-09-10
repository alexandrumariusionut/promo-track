import { useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import confetti from 'canvas-confetti';
import { useOnboarding, CELEBRATION_MESSAGES as MESSAGES } from '../../context/OnboardingContext';
import { prefersReducedMotion } from '../../utils/motion';

export default function CelebrationOverlay() {
  const { pendingCelebration, dismissCelebration } = useOnboarding();

  useEffect(() => {
    if (pendingCelebration === null || prefersReducedMotion()) return;

    const isFinal = pendingCelebration === 3;
    confetti({
      particleCount: isFinal ? 200 : 100,
      spread: isFinal ? 100 : 70,
      origin: { y: 0.6 },
    });
  }, [pendingCelebration]);

  const message = pendingCelebration !== null ? MESSAGES[pendingCelebration] : null;

  return (
    <Snackbar
      open={!!message}
      autoHideDuration={4000}
      onClose={dismissCelebration}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity="success"
        variant="filled"
        onClose={dismissCelebration}
        sx={{ width: '100%', fontSize: '0.95rem' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
