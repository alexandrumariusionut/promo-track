import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';
import confetti from 'canvas-confetti';
import { useOnboarding } from '../../context/OnboardingContext';

const STORAGE_KEY = 'promo-track-trophy-shown';

export default function TrophyModal() {
  const { stage } = useOnboarding();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (stage < 3) return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    setOpen(true);
    localStorage.setItem(STORAGE_KEY, 'true');
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
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
