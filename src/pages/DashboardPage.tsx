import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Chip, LinearProgress, List, ListItemButton, ListItemIcon, ListItemText,
  TextField, Collapse, IconButton, Button, Dialog, DialogTitle, DialogContent, Tooltip, Stack,
} from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import PlayCircleOutline from '@mui/icons-material/PlayCircleOutline';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import Timeline from '@mui/icons-material/Timeline';
import Close from '@mui/icons-material/Close';
import ArrowForward from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useApp } from '../store/AppContext';
import { lpCoverage, readinessScore } from '../utils/helpers';
import { scoreDimensions } from '../utils/dimensionScoring';
import { GUIDELINES } from '../data/levelGuidelines';
import { LEADERSHIP_PRINCIPLES, LeadershipPrinciple, Metric, AppState } from '../types';
import TimelinePage from './TimelinePage';

dayjs.extend(relativeTime);

// ─── helpers ────────────────────────────────────────────────────────────────

interface ChecklistItem {
  label: string;
  done: boolean;
  detail: string;
  /** Where the user completes this item. */
  to: string;
}

function buildChecklist(state: AppState, coveredLPs: number): ChecklistItem[] {
  const p = state.profile;
  const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
  return [
    { label: 'Profile completed', done: !!(p.name && p.role && p.manager && p.level), detail: p.name ? `${p.name} — ${p.role || 'add your role'}` : 'Name, role, manager required', to: '/profile' },
    { label: 'Management chain filled', done: !!(p.steamMember && p.steamDirect && p.promotionApprover), detail: p.promotionApprover ? `Approver: ${p.promotionApprover}` : 'Steam Member, Steam Direct, Approver', to: '/profile' },
    { label: 'Scope of Role written', done: !!(state.scopeOfRole && state.scopeOfRole.length > 50), detail: state.scopeOfRole ? `${words(state.scopeOfRole)} words` : 'Not started', to: '/profile' },
    { label: 'STAR entries added', done: state.star.length >= 3, detail: `${state.star.length} ${state.star.length === 1 ? 'entry' : 'entries'} (aim for 3+)`, to: '/star' },
    { label: 'Leadership Principles demonstrated', done: coveredLPs >= 4, detail: `${coveredLPs}/16 LPs covered`, to: '/star' },
    { label: 'Metrics imported', done: state.metrics.length > 0, detail: state.metrics.length > 0 ? `${state.metrics.filter((m: Metric) => m.channel !== 'Benchmark').length} personal metrics` : 'Import from PDF or add manually', to: '/metrics' },
    { label: 'Best Reasons Not to Promote', done: !!(state.bestReasonsNotToPromote && state.bestReasonsNotToPromote.length > 50), detail: state.bestReasonsNotToPromote ? `${words(state.bestReasonsNotToPromote)} words` : 'Not started', to: '/profile' },
  ];
}

function readinessLabel(score: number): { text: string; color: 'error' | 'warning' | 'primary' | 'success' } {
  if (score >= 85) return { text: 'Ready to share with your manager', color: 'success' };
  if (score >= 60) return { text: 'Good progress — close the gaps below', color: 'primary' };
  if (score >= 30) return { text: 'Getting started', color: 'warning' };
  return { text: 'Just beginning', color: 'error' };
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [videoOpen, setVideoOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const coverage = useMemo(() => lpCoverage(state.star), [state.star]);
  const coveredLPs = Object.values(coverage).filter((v: number) => v > 0).length;
  const checklist = useMemo(() => buildChecklist(state, coveredLPs), [state, coveredLPs]);
  const score = readinessScore(state);
  const readiness = readinessLabel(score);
  const nextStep = checklist.find((c) => !c.done);

  const targetLevel = state.profile.targetLevel;
  const guidelines = useMemo(() => GUIDELINES[targetLevel as 'L4' | 'L5'] ?? [], [targetLevel]);
  const dimensionScores = useMemo(() => scoreDimensions(state.star, guidelines), [state.star, guidelines]);
  const coveredGuidelines = dimensionScores.filter((d) => d.status === 'strong').length;

  const isFirstRun = state.star.length === 0 && !state.profile.role;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" component="h2">
          {state.profile.name ? `Welcome, ${state.profile.name.split(' ')[0]}` : 'Welcome to PromoTrack'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Target level {state.profile.targetLevel}
        </Typography>
      </Box>

      {/* First-run: one clear call to action */}
      {isFirstRun && (
        <Paper sx={{ p: { xs: 3, md: 4 }, mb: 3, background: (t) => t.palette.brand.gradient, color: 'common.white', border: 'none' }}>
          <Typography variant="h5" component="h3" gutterBottom>Build your promotion case in three steps</Typography>
          <Typography sx={{ opacity: 0.9, mb: 2, maxWidth: 640 }}>
            Read the level guidelines, fill in your profile, then write your first STAR narrative. PromoTrack maps each
            narrative to the role guidelines your promo panel will look for.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" color="secondary" endIcon={<ArrowForward />} onClick={() => navigate('/guidelines')}>
              Read the guidelines
            </Button>
            <Button variant="outlined" sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }} onClick={() => navigate('/profile')}>
              Fill in my profile
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Readiness hero */}
      {!isFirstRun && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" color="text.secondary">Portfolio readiness</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h3" component="p" sx={{ fontWeight: 800, lineHeight: 1 }} aria-label={`Readiness score ${score} out of 100`}>{score}</Typography>
                <Typography variant="h6" color="text.secondary" component="span">/ 100</Typography>
              </Box>
              <Chip label={readiness.text} color={readiness.color} size="small" sx={{ mt: 1 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <LinearProgress variant="determinate" value={score} color={readiness.color} aria-hidden sx={{ height: 10, borderRadius: 5, mb: 1.5 }} />
              {nextStep ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontWeight: 600 }}>Next step:</Box> {nextStep.label} — {nextStep.detail}
                  </Typography>
                  <Button size="small" variant="contained" endIcon={<ArrowForward />} onClick={() => navigate(nextStep.to)}>
                    Go
                  </Button>
                </Box>
              ) : (
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                  Every checklist item is complete. Generate your document or share it for review.
                </Typography>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Walkthrough video */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box
          component="button"
          type="button"
          aria-expanded={videoOpen}
          aria-controls="walkthrough-panel"
          onClick={() => setVideoOpen((v) => !v)}
          sx={{
            all: 'unset', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center',
            px: 2, py: 1.5, cursor: 'pointer', bgcolor: 'surface.subtle', '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <PlayCircleOutline color="primary" sx={{ mr: 1.5 }} />
          <Box sx={{ flex: 1, textAlign: 'left' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>App walkthrough (video)</Typography>
            <Typography variant="caption" color="text.secondary">A quick demo of how to build your portfolio</Typography>
          </Box>
          {videoOpen ? <ExpandLess /> : <ExpandMore />}
        </Box>
        <Collapse in={videoOpen} id="walkthrough-panel">
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
            {videoOpen && <video src="/walkthrough.mov" controls preload="metadata" style={{ width: '100%', maxWidth: 800, borderRadius: 8 }} />}
          </Box>
        </Collapse>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Guideline coverage (replaces the radar chart) */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
              <Typography variant="h6" component="h3">Role guideline coverage</Typography>
              <Typography variant="body2" color="text.secondary">{coveredGuidelines}/{guidelines.length} covered</Typography>
            </Box>
            {state.star.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <StarIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Your STAR narratives will light up the {state.profile.targetLevel} guidelines they demonstrate.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/star')}>Write your first STAR entry</Button>
              </Box>
            ) : (
              <List dense disablePadding>
                {guidelines.map((g) => {
                  const s = dimensionScores.find((d) => d.competencyId === g.id);
                  const count = s?.count ?? 0;
                  return (
                    <ListItemButton key={g.id} onClick={() => navigate('/star')} sx={{ borderRadius: 1, px: 1 }}>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        {count > 0
                          ? <CheckCircle color="success" fontSize="small" titleAccess="Covered" />
                          : <RadioButtonUnchecked color="disabled" fontSize="small" titleAccess="Not yet covered" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={g.leadClause}
                        secondary={count > 0 ? `${count} ${count === 1 ? 'entry' : 'entries'}${count < 3 ? ' · aim for 3' : ''}` : 'No examples yet'}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: count > 0 ? 400 : 600 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Leadership Principles</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }} aria-label={`${coveredLPs} of 16 Leadership Principles covered`}>
              {LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple) => (
                <Tooltip key={lp} title={coverage[lp] > 0 ? `${coverage[lp]} ${coverage[lp] === 1 ? 'entry' : 'entries'}` : 'Not yet demonstrated'}>
                  <Chip
                    label={lp}
                    size="small"
                    icon={coverage[lp] > 0 ? <CheckCircle /> : undefined}
                    variant={coverage[lp] > 0 ? 'filled' : 'outlined'}
                    color={coverage[lp] > 0 ? 'success' : 'default'}
                  />
                </Tooltip>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <PortfolioTracker state={state} checklist={checklist} />
        </Grid>
      </Grid>

      <Button variant="outlined" startIcon={<Timeline />} onClick={() => setTimelineOpen(true)}>
        View timeline
      </Button>
      <Dialog open={timelineOpen} onClose={() => setTimelineOpen(false)} maxWidth="lg" fullWidth aria-labelledby="timeline-title">
        <DialogTitle id="timeline-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Timeline
          <IconButton onClick={() => setTimelineOpen(false)} size="small" aria-label="Close timeline"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 400 }}>
          <TimelinePage />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// ─── checklist card ─────────────────────────────────────────────────────────

function PortfolioTracker({ state, checklist }: { state: AppState; checklist: ChecklistItem[] }) {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [editingDate, setEditingDate] = useState(false);
  const p = state.profile;

  const targetDate = p.targetPromotionDate;
  const daysLeft = targetDate ? dayjs(targetDate).diff(dayjs(), 'day') : null;
  const doneCount = checklist.filter((s) => s.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);

  const handleDateChange = (newDate: string) => {
    dispatch({ type: 'SET_PROFILE', payload: { ...p, targetPromotionDate: newDate } });
    setEditingDate(false);
  };

  return (
    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" component="h3">Portfolio checklist</Typography>
        <Chip label={`${doneCount}/${checklist.length}`} color={pct === 100 ? 'success' : pct >= 50 ? 'primary' : 'warning'} size="small" />
      </Box>
      <LinearProgress variant="determinate" value={pct} aria-label={`${doneCount} of ${checklist.length} checklist items complete`} sx={{ height: 8, borderRadius: 4, mb: 2 }} />

      {/* Target date */}
      <Box
        component={editingDate ? 'div' : 'button'}
        type={editingDate ? undefined : 'button'}
        onClick={editingDate ? undefined : () => setEditingDate(true)}
        aria-label={editingDate ? undefined : 'Set promotion target date'}
        sx={{
          all: 'unset', boxSizing: 'border-box', width: '100%', textAlign: 'center', py: 1.5, mb: 2, borderRadius: 2,
          bgcolor: 'surface.subtle', cursor: editingDate ? 'default' : 'pointer', '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {editingDate ? (
          <TextField
            type="date" size="small" defaultValue={targetDate || ''} autoFocus
            label="Target promotion date" InputLabelProps={{ shrink: true }}
            onBlur={(e) => handleDateChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDateChange((e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingDate(false); }}
            sx={{ width: 220 }}
          />
        ) : daysLeft !== null ? (
          <>
            <Typography variant="h5" component="p" sx={{ fontWeight: 700, color: daysLeft < 0 ? 'error.main' : 'primary.main' }}>
              {daysLeft < 0 ? 'Target date passed' : `${daysLeft} days to go`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              target {dayjs(targetDate).format('MMM D, YYYY')} · click to change
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>Set your promotion target date</Typography>
        )}
      </Box>

      <List dense disablePadding sx={{ flex: 1 }} aria-label="Portfolio checklist">
        {checklist.map((s) => (
          <ListItemButton key={s.label} onClick={() => navigate(s.to)} sx={{ borderRadius: 1, px: 1, py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              {s.done ? <CheckCircle color="success" sx={{ fontSize: 18 }} titleAccess="Done" /> : <RadioButtonUnchecked color="disabled" sx={{ fontSize: 18 }} titleAccess="To do" />}
            </ListItemIcon>
            <ListItemText
              primary={s.label}
              secondary={s.detail}
              primaryTypographyProps={{ variant: 'body2', fontWeight: s.done ? 400 : 600, color: s.done ? 'text.secondary' : 'text.primary' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
            {!s.done && <ArrowForward fontSize="small" sx={{ color: 'text.disabled' }} />}
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
