import { Box, Stepper, Step, StepLabel, Typography } from '@mui/material';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import CheckCircle from '@mui/icons-material/CheckCircle';
import { useOnboarding } from '../../context/OnboardingContext';

const STEPS = ['Read Guidelines', 'Complete Profile', 'First STAR Entry'];

export default function OnboardingProgress() {
  const { stage, stageProgress } = useOnboarding();

  if (stage >= 3) {
    return (
      <Box sx={{ mx: 2, mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
        <EmojiEvents sx={{ fontSize: 48, color: 'brand.trophy' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
          All Unlocked! 🏆
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {stageProgress.current} of {stageProgress.total} complete
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mx: 2, mb: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {stageProgress.current} of {stageProgress.total} complete
      </Typography>
      <Stepper activeStep={stage} orientation="vertical" sx={{
        '& .MuiStepConnector-line': { minHeight: 16 },
        '& .MuiStepLabel-label': { fontSize: '0.75rem' },
      }}>
        {STEPS.map((label, i) => (
          <Step key={label} completed={i < stage}>
            <StepLabel
              StepIconProps={{
                sx: {
                  fontSize: 20,
                  ...(i < stage && { color: 'success.main' }),
                  ...(i === stage && {
                    color: 'primary.main',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }),
                },
              }}
              icon={i < stage ? <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} /> : undefined}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
