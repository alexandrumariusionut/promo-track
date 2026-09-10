import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import confetti from 'canvas-confetti';
import { useOnboarding } from '../../context/OnboardingContext';
import { getTrophyShownKey } from '../../store/storage';
import { prefersReducedMotion } from '../../utils/motion';

export default function TrophyModal() {
  const { stage } = useOnboarding();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (stage < 3) return;
    if (localStorage.getItem(getTrophyShownKey()) === 'true') return;

    localStorage.setItem(getTrophyShownKey(), 'true');
    // Defer to the next frame so the state update is not synchronous within the effect
    const frame = requestAnimationFrame(() => {
      setOpen(true);
      if (!prefersReducedMotion()) {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
        Promotion Toolkit Unlocked! 🎉
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <EmojiEvents sx={{ fontSize: 80, color: '#FFD700' }} />
        </Box>
        <Typography>
          Congratulations! You've completed the onboarding and unlocked all features.
          Your promotion portfolio toolkit is ready to use.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button variant="contained" size="large" onClick={() => setOpen(false)}>
          Let's Go!
        </Button>
      </DialogActions>
    </Dialog>
  );
}
