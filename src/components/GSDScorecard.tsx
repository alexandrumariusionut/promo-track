import { Box, Paper, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Metric } from '../types';

interface ScorecardProps {
  metrics: Metric[];
}

// Min threshold types: higher is better (value should be ≥ target)
const MIN_THRESHOLD_TYPES = ['CSAT', 'Case ARR', 'Dual Chat Overlap %', 'Custom'];

function findMetric(metrics: Metric[], type: string, channel = 'Total'): Metric | undefined {
  return metrics.find((m: Metric) => m.type === type && m.channel === channel);
}

// Percentage-based metric types
const PERCENT_TYPES = ['CSAT', 'Case ARR', 'Dual Chat Overlap %', 'Transfer Rate', 'Contacts Missed %', 'Custom'];
// Minute-based metric types
const MINUTE_TYPES = ['CPH', 'AHT', 'AHT Assist', 'ACW'];

function formatValue(type: string, value: number): string {
  if (PERCENT_TYPES.includes(type)) return `${value}%`;
  if (MINUTE_TYPES.includes(type)) return `${value} min`;
  return String(value);
}

function formatTarget(type: string, target: number): string {
  const symbol = MIN_THRESHOLD_TYPES.includes(type) ? '≥' : '≤';
  if (PERCENT_TYPES.includes(type)) return `${symbol} ${target}%`;
  if (MINUTE_TYPES.includes(type)) return `${symbol} ${target.toFixed(2)} min`;
  return `${symbol} ${target}`;
}

interface BulletCardProps {
  name: string;
  value: number;
  target: number;
  type: string;
}

function MetricBulletCard({ name, value, target, type }: BulletCardProps) {
  const higherIsBetter = MIN_THRESHOLD_TYPES.includes(type);
  const met = higherIsBetter ? value >= target : value <= target;
  const color = met ? '#2e7d32' : '#c62828';
  const max = Math.max(value, target) * 1.3;

  return (
    <Paper sx={{ p: 2, borderLeft: `3px solid ${color}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color }}>{formatValue(type, value)}</Typography>
      </Box>
      <ResponsiveContainer width="100%" height={24}>
        <BarChart data={[{ value }]} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis type="category" hide />
          <Bar dataKey="value" fill={color} barSize={16} radius={[2, 2, 2, 2]} background={{ fill: '#f5f5f5', radius: 2 }} />
          <ReferenceLine x={target} stroke="#555" strokeWidth={2} strokeDasharray="4 2" />
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        Target: {formatTarget(type, target)}
      </Typography>
    </Paper>
  );
}

export default function GSDScorecard({ metrics }: ScorecardProps) {
  if (metrics.length === 0) return null;

  // Date range from monthly Total metrics
  const dates = metrics.filter((m: Metric) => m.channel !== 'Benchmark').map((m: Metric) => m.date).sort();
  const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : '';

  // Monthly Total metrics only
  const monthly = metrics.filter((m: Metric) => m.period === 'monthly' && m.channel === 'Total');

  // Find specific AHT variants by notes field
  const findByNotes = (type: string, noteKey: string): Metric | undefined =>
    monthly.find((m: Metric) => m.type === type && m.notes.includes(noteKey));

  // Build KPI rows
  const rows = [
    { label: 'GSD1 Live cAHT', metric: findMetric(monthly, 'CPH') },
    { label: 'All Contacts rAHT', metric: findByNotes('AHT', 'rAHT') },
    { label: 'Task Helpdesk AHT', metric: findByNotes('AHT', 'Task Helpdesk') },
    { label: 'Escalation/Repeat cAHT', metric: findByNotes('AHT', 'Escalation') },
    { label: 'ACW', metric: findMetric(monthly, 'ACW') },
    { label: 'CSAT%', metric: findMetric(monthly, 'CSAT') },
    { label: 'ARR', metric: findMetric(monthly, 'Case ARR') },
    { label: 'Dual Chat Overlap %', metric: findMetric(monthly, 'Dual Chat Overlap %') },
    { label: 'Transfer Rate', metric: findMetric(monthly, 'Transfer Rate') },
    { label: 'Contacts Missed %', metric: findMetric(monthly, 'Contacts Missed %') },
    { label: 'Quality Score', metric: monthly.find((m: Metric) => m.type === 'Custom' && m.notes.includes('Quality')) },
  ].filter((r): r is { label: string; metric: Metric } => r.metric !== undefined && r.metric.target !== undefined);

  return (
    <Box sx={{ mb: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#1a237e', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>GSD Scorecard</Typography>
            <Typography variant="body2">Weekly Contact Metrics</Typography>
          </Box>
          <Typography variant="body2">{dateRange}</Typography>
        </Box>
      </Paper>

      {/* Bullet Chart Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
        {rows.map(({ label, metric }) => (
          <MetricBulletCard
            key={label}
            name={label}
            value={metric.value}
            target={metric.target!}
            type={metric.type}
          />
        ))}
      </Box>

    </Box>
  );
}
