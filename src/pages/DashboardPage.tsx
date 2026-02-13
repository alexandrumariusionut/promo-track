import { Box, Grid, Paper, Typography, Chip, Card, CardContent, LinearProgress, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { useApp } from '../store/AppContext';
import { lpCoverage } from '../utils/helpers';
import { LEADERSHIP_PRINCIPLES, LeadershipPrinciple, Metric } from '../types';

import PageTip from '../components/PageTip';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7', '#689f38', '#fbc02d',
  '#e64a19', '#5d4037', '#455a64', '#c2185b', '#00838f', '#558b2f', '#ff6f00', '#4527a0'];

export default function DashboardPage() {
  const { state } = useApp();
  const coverage = lpCoverage(state.starr);

  const lpData = LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple, i: number) => ({
    name: lp.length > 20 ? lp.substring(0, 18) + '…' : lp,
    fullName: lp,
    count: coverage[lp],
    fill: COLORS[i % COLORS.length],
  }));

  const coveredCount = Object.values(coverage).filter((v: number) => v > 0).length;

  const stats = [
    { label: 'STARR Entries', value: state.starr.length, color: '#1976d2' },
    { label: 'LPs Covered', value: `${coveredCount}/16`, color: '#388e3c' },
    { label: 'Feedback', value: state.feedback.length, color: '#7b1fa2' },
    { label: 'Metrics', value: state.metrics.length, color: '#d32f2f' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        {state.profile.name ? `Welcome, ${state.profile.name}` : 'Welcome to PromoTrack'}
      </Typography>
      {state.profile.level && (
        <Chip label={`${state.profile.level} → ${state.profile.targetLevel}`} color="primary" sx={{ mb: 3 }} />
      )}

      <PageTip id="dashboard" title="Dashboard Overview">
        This is your portfolio command center. Track your progress across all sections, see which Leadership Principles you've demonstrated, and identify gaps before generating your promotion document.
      </PageTip>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map(s => (
          <Grid size={{ xs: 6, sm: 4, md: 2 }} key={s.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: s.color }}>{s.value}</Typography>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Portfolio Completion Tracker */}
      <PortfolioTracker state={state} coveredCount={coveredCount} />

      <Grid container spacing={3}>
        {/* LP Coverage Chart — full width */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Leadership Principle Coverage</Typography>
            {state.starr.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Add STARR entries to see LP coverage
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={lpData} margin={{ bottom: 80 }}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={10} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Entries">
                    {lpData.map((_entry: typeof lpData[0], i: number) => <Cell key={i} fill={_entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* LP Gap Analysis */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>LP Coverage Details</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {LEADERSHIP_PRINCIPLES.filter((lp: LeadershipPrinciple) => coverage[lp] === 0).map((lp: LeadershipPrinciple) => (
                <Chip key={lp} label={lp} color="default" variant="outlined" />
              ))}
              {LEADERSHIP_PRINCIPLES.filter((lp: LeadershipPrinciple) => coverage[lp] === 1).map((lp: LeadershipPrinciple) => (
                <Chip key={lp} label={`${lp} (1)`} color="primary" variant="outlined" />
              ))}
              {LEADERSHIP_PRINCIPLES.filter((lp: LeadershipPrinciple) => coverage[lp] >= 2).map((lp: LeadershipPrinciple) => (
                <Chip key={lp} label={`${lp} (${coverage[lp]})`} color="success" />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              You don't need to cover all 16 LPs — focus on the ones most relevant to your promotion case.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function PortfolioTracker({ state, coveredCount }: { state: any; coveredCount: number }) {
  const p = state.profile;
  const sections = [
    { label: 'Profile completed', done: !!(p.name && p.role && p.manager && p.level), detail: p.name ? `${p.name} — ${p.role}` : 'Name, role, manager required' },
    { label: 'Management chain filled', done: !!(p.steamMember && p.steamDirect && p.promotionApprover), detail: p.promotionApprover ? `Approver: ${p.promotionApprover}` : 'Steam Member, Steam Direct, Approver' },
    { label: 'Scope of Role written', done: !!(state.scopeOfRole && state.scopeOfRole.length > 50), detail: state.scopeOfRole ? `${state.scopeOfRole.split(/\s+/).filter(Boolean).length} words` : 'Not started' },
    { label: 'STARR entries added', done: state.starr.length >= 3, detail: `${state.starr.length} entries (aim for 3+)` },
    { label: 'Leadership Principles demonstrated', done: coveredCount >= 4, detail: `${coveredCount}/16 LPs covered — focus on key ones` },
    { label: 'Metrics imported', done: state.metrics.length > 0, detail: state.metrics.length > 0 ? `${state.metrics.filter((m: Metric) => m.channel !== 'Benchmark').length} personal metrics` : 'Import from PDF or add manually' },
    { label: 'Feedback collected', done: state.feedback.length >= 2, detail: `${state.feedback.length} entries (aim for 2+)` },
    { label: 'Best Reasons Not to Promote', done: !!(state.bestReasonsNotToPromote && state.bestReasonsNotToPromote.length > 50), detail: state.bestReasonsNotToPromote ? `${state.bestReasonsNotToPromote.split(/\s+/).filter(Boolean).length} words` : 'Not started' },
  ];

  const doneCount = sections.filter(s => s.done).length;
  const pct = Math.round((doneCount / sections.length) * 100);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">Portfolio Completion</Typography>
        <Chip label={`${doneCount}/${sections.length} sections`} color={pct === 100 ? 'success' : pct >= 50 ? 'primary' : 'warning'} />
      </Box>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 10, borderRadius: 5, mb: 2 }} />
      <List dense disablePadding>
        {sections.map(s => (
          <ListItem key={s.label} disableGutters sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {s.done ? <CheckCircle color="success" fontSize="small" /> : <RadioButtonUnchecked color="disabled" fontSize="small" />}
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
