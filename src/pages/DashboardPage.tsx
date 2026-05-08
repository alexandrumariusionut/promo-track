import { useState } from 'react';
import { Box, Grid, Paper, Typography, Chip, LinearProgress, List, ListItem, ListItemIcon, ListItemText, TextField, Collapse, IconButton, Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle, RadioButtonUnchecked, PlayCircleOutline, ExpandMore, ExpandLess, Timeline } from '@mui/icons-material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useApp } from '../store/AppContext';
import { lpCoverage } from '../utils/helpers';
import { LEADERSHIP_PRINCIPLES, LeadershipPrinciple, Metric, AppState } from '../types';
import TimelinePage from './TimelinePage';

dayjs.extend(relativeTime);

export default function DashboardPage() {
  const { state } = useApp();
  const [videoOpen, setVideoOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const coverage = lpCoverage(state.star);
  const coveredCount = Object.values(coverage).filter((v: number) => v > 0).length;

  const maxCount = Math.max(...Object.values(coverage), 3);
  const radarData = LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple) => ({
    lp: lp.split(' ').slice(0, 3).join(' '),
    count: coverage[lp],
    fullMark: maxCount,
  }));

  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {state.profile.name ? `Welcome, ${state.profile.name}` : 'Welcome to Promo Tracker'}
        </Typography>
      </Box>

      {/* App Walkthrough Video */}
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, cursor: 'pointer', bgcolor: 'primary.main', color: 'white' }}
          onClick={() => setVideoOpen(v => !v)}
        >
          <PlayCircleOutline sx={{ mr: 1 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>PromoTrack App Walkthrough</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>Watch a quick demo on how to use the app to build your promotion portfolio</Typography>
          </Box>
          <IconButton size="small" sx={{ color: 'white' }}>
            {videoOpen ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        <Collapse in={videoOpen}>
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
            <video src="/walkthrough.mov" controls style={{ width: '100%', maxWidth: 800, borderRadius: 8 }} />
          </Box>
        </Collapse>
      </Paper>

      {/* Two-column: LP Radar + Portfolio Tracker */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>LP Coverage</Typography>
            {state.star.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Add STAR entries to see LP coverage
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="lp" fontSize={10} />
                  <PolarRadiusAxis allowDecimals={false} />
                  <Tooltip />
                  <Radar dataKey="count" fill="#1976d2" fillOpacity={0.3} stroke="#1976d2" />
                </RadarChart>
              </ResponsiveContainer>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple) => (
                <Chip
                  key={lp}
                  label={lp}
                  size="small"
                  variant={coverage[lp] > 0 ? 'filled' : 'outlined'}
                  color={coverage[lp] > 0 ? 'success' : 'default'}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <PortfolioTracker state={state} coveredCount={coveredCount} />
        </Grid>
      </Grid>

      {/* Timeline */}
      <Button variant="outlined" startIcon={<Timeline />} onClick={() => setTimelineOpen(true)} sx={{ mt: 2 }}>
        View Timeline
      </Button>
      <Dialog open={timelineOpen} onClose={() => setTimelineOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Timeline
          <IconButton onClick={() => setTimelineOpen(false)} size="small"><ExpandLess /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 400 }}>
          <TimelinePage />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function PortfolioTracker({ state, coveredCount }: { state: AppState; coveredCount: number }) {
  const { dispatch } = useApp();
  const [editingDate, setEditingDate] = useState(false);
  const p = state.profile;

  const targetDate = p.targetPromotionDate;
  const daysLeft = targetDate ? dayjs(targetDate).diff(dayjs(), 'day') : null;

  const sections = [
    { label: 'Profile completed', done: !!(p.name && p.role && p.manager && p.level), detail: p.name ? `${p.name} — ${p.role}` : 'Name, role, manager required' },
    { label: 'Management chain filled', done: !!(p.steamMember && p.steamDirect && p.promotionApprover), detail: p.promotionApprover ? `Approver: ${p.promotionApprover}` : 'Steam Member, Steam Direct, Approver' },
    { label: 'Scope of Role written', done: !!(state.scopeOfRole && state.scopeOfRole.length > 50), detail: state.scopeOfRole ? `${state.scopeOfRole.split(/\s+/).filter(Boolean).length} words` : 'Not started' },
    { label: 'STAR entries added', done: state.star.length >= 3, detail: `${state.star.length} entries` },
    { label: 'Leadership Principles demonstrated', done: coveredCount >= 4, detail: `${coveredCount}/16 LPs covered` },
    { label: 'Metrics imported', done: state.metrics.length > 0, detail: state.metrics.length > 0 ? `${state.metrics.filter((m: Metric) => m.channel !== 'Benchmark').length} personal metrics` : 'Import from PDF or add manually' },
    { label: 'Best Reasons Not to Promote', done: !!(state.bestReasonsNotToPromote && state.bestReasonsNotToPromote.length > 50), detail: state.bestReasonsNotToPromote ? `${state.bestReasonsNotToPromote.split(/\s+/).filter(Boolean).length} words` : 'Not started' },
  ];

  const doneCount = sections.filter(s => s.done).length;
  const pct = Math.round((doneCount / sections.length) * 100);

  const handleDateChange = (newDate: string) => {
    dispatch({ type: 'SET_PROFILE', payload: { ...p, targetPromotionDate: newDate } });
    setEditingDate(false);
  };

  return (
    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Portfolio Completion</Typography>
        <Chip label={`${doneCount}/${sections.length}`} color={pct === 100 ? 'success' : pct >= 50 ? 'primary' : 'warning'} size="small" />
      </Box>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, mb: 2 }} />

      {/* Promotion Countdown */}
      <Box
        sx={{
          textAlign: 'center', py: 1.5, mb: 2, borderRadius: 2,
          bgcolor: 'action.hover',
          cursor: 'pointer',
        }}
        onClick={() => setEditingDate(true)}
      >
        {editingDate ? (
          <TextField
            type="date"
            size="small"
            defaultValue={targetDate || ''}
            autoFocus
            onBlur={(e) => handleDateChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDateChange((e.target as HTMLInputElement).value); }}
            onClick={(e) => e.stopPropagation()}
            sx={{ width: 180 }}
          />
        ) : daysLeft !== null ? (
          <>
            <Typography variant="h4" sx={{ fontWeight: 700, color: daysLeft < 0 ? '#d32f2f' : '#1976d2' }}>
              {daysLeft < 0 ? 'Overdue' : `${daysLeft} days`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              until promotion · {dayjs(targetDate).format('MMM D, YYYY')}
            </Typography>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">🎯 Set your promotion target date</Typography>
        )}
      </Box>

      {/* Checklist */}
      <List dense disablePadding sx={{ flex: 1 }}>
        {sections.map(s => (
          <ListItem key={s.label} disableGutters sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              {s.done ? <CheckCircle color="success" sx={{ fontSize: 18 }} /> : <RadioButtonUnchecked color="disabled" sx={{ fontSize: 18 }} />}
            </ListItemIcon>
            <ListItemText
              primary={s.label}
              secondary={s.detail}
              primaryTypographyProps={{ variant: 'body2', fontWeight: s.done ? 400 : 600, color: s.done ? 'text.secondary' : 'text.primary' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
