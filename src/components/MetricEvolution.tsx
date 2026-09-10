import { useMemo, useState } from 'react';
import { Box, Paper, Typography, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { TrendingUp, InfoOutlined } from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, Dot,
} from 'recharts';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Metric } from '../types';

dayjs.extend(isoWeek);

interface Props {
  metrics: Metric[];
}

// KPIs where a HIGHER value is better (everything else: lower is better).
const HIGHER_IS_BETTER = new Set(['CSAT%', 'ARR', 'CONC%', 'Quality Score']);
// KPIs rendered as percentages (everything else is minutes).
const PERCENT_KPIS = new Set(['CSAT%', 'ARR', 'CONC%', 'Quality Score', 'XFER%', 'Contacts Missed']);

const ON = '#2e7d32';
const OFF = '#c62828';

interface Point {
  week: number;
  date: string;
  /** ISO week label, e.g. "W12 · Mar 17–Mar 23" */
  weekLabel: string;
  month: string; // YYYY-MM
  value: number;
  onTarget: boolean;
}

interface MonthPoint {
  month: string; // YYYY-MM
  /** Display label, e.g. "March 2026" */
  monthLabel: string;
  value: number;
  onTarget: boolean;
  count: number;
}

interface KpiSeries {
  label: string;
  target: number;
  higherIsBetter: boolean;
  isPercent: boolean;
  points: Point[];
}

function isOnTarget(value: number, target: number, higherIsBetter: boolean): boolean {
  return higherIsBetter ? value >= target : value <= target;
}

function fmt(value: number, isPercent: boolean): string {
  return isPercent ? `${value.toFixed(1)}%` : `${value.toFixed(1)}m`;
}

/**
 * Computes a human-readable ISO week label with date range.
 * E.g. "W12 · Mar 17–Mar 23"
 */
function computeWeekLabel(dateStr: string): string {
  const d = dayjs(dateStr);
  const isoWk = d.isoWeek();
  // ISO week starts on Monday
  const weekStart = d.startOf('isoWeek');
  const weekEnd = weekStart.add(6, 'day');
  const startFmt = weekStart.format('MMM D');
  const endFmt = weekEnd.format('MMM D');
  return `W${isoWk} · ${startFmt}–${endFmt}`;
}

/** Groups the reconstructed weekly metrics into per-KPI series. */
function buildSeries(metrics: Metric[]): KpiSeries[] {
  const weekly = metrics.filter((m) => m.period === 'weekly' && m.notes.includes(' — Week'));
  const groups = new Map<string, Metric[]>();
  for (const m of weekly) {
    const label = m.notes.split(' — Week')[0].trim();
    const arr = groups.get(label) ?? [];
    arr.push(m);
    groups.set(label, arr);
  }

  const series: KpiSeries[] = [];
  for (const [label, ms] of groups) {
    const higherIsBetter = HIGHER_IS_BETTER.has(label);
    const isPercent = PERCENT_KPIS.has(label);
    const target = ms[0].target;
    const sorted = [...ms].sort((a, b) => a.date.localeCompare(b.date));
    const points: Point[] = sorted.map((m, i) => ({
      week: i + 1,
      date: m.date,
      weekLabel: computeWeekLabel(m.date),
      month: m.date.substring(0, 7),
      value: m.value,
      onTarget: isOnTarget(m.value, target, higherIsBetter),
    }));
    series.push({ label, target, higherIsBetter, isPercent, points });
  }
  // Stable, readable ordering.
  series.sort((a, b) => a.label.localeCompare(b.label));
  return series;
}

/** Aggregate weekly points into monthly averages for chart display. */
function monthlyPoints(s: KpiSeries): MonthPoint[] {
  const byMonth = new Map<string, number[]>();
  for (const p of s.points) {
    const arr = byMonth.get(p.month) ?? [];
    arr.push(p.value);
    byMonth.set(p.month, arr);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => {
      const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
      // Full month name + year, e.g. "March 2026"
      const monthLabel = dayjs(month + '-01').format('MMMM YYYY');
      return {
        month,
        monthLabel,
        value: parseFloat(avg.toFixed(2)),
        onTarget: isOnTarget(avg, s.target, s.higherIsBetter),
        count: vals.length,
      };
    });
}

/** Colored dot for charts (green on-target, red off-target). */
function TargetDot(props: { cx?: number; cy?: number; payload?: { onTarget: boolean } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return <Dot cx={cx} cy={cy} r={3.5} fill={payload.onTarget ? ON : OFF} stroke="none" />;
}

function WeeklyCard({ s }: { s: KpiSeries }) {
  const onCount = s.points.filter((p) => p.onTarget).length;
  const total = s.points.length;
  const values = s.points.map((p) => p.value);
  const yMin = Math.min(s.target, ...values);
  const yMax = Math.max(s.target, ...values);
  const pad = (yMax - yMin) * 0.15 || 1;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.label}</Typography>
        <Typography variant="caption" color="text.secondary">
          Target {s.higherIsBetter ? '≥' : '≤'} {fmt(s.target, s.isPercent)}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: onCount === total ? ON : onCount === 0 ? OFF : 'text.secondary', fontWeight: 600 }}>
        On target {onCount}/{total} weeks
      </Typography>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={s.points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 9 }}
            interval="preserveStartEnd"
          />
          <YAxis domain={[yMin - pad, yMax + pad]} tick={{ fontSize: 10 }} width={38} />
          <RTooltip
            formatter={(v) => [fmt(Number(v), s.isPercent), s.label] as [string, string]}
            labelFormatter={(_, payload) => {
              // Show full week label in tooltip header
              const pt = payload?.[0]?.payload as Point | undefined;
              return pt ? `${pt.weekLabel} (${dayjs(pt.date).format('YYYY-MM-DD')})` : '';
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={s.target} stroke="#555" strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1a237e"
            strokeWidth={1.5}
            dot={<TargetDot />}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}

/** Monthly card — same LineChart style as weekly, with month-averaged data points. */
function MonthlyCard({ s }: { s: KpiSeries }) {
  const buckets = monthlyPoints(s);
  const onCount = buckets.filter((b) => b.onTarget).length;
  const total = buckets.length;
  const values = buckets.map((b) => b.value);
  const yMin = Math.min(s.target, ...values);
  const yMax = Math.max(s.target, ...values);
  const pad = (yMax - yMin) * 0.15 || 1;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.label}</Typography>
        <Typography variant="caption" color="text.secondary">
          Target {s.higherIsBetter ? '≥' : '≤'} {fmt(s.target, s.isPercent)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.68rem' }}>
          Approximate — unweighted average of weekly values
        </Typography>
        <Tooltip
          title="The source dashboard weights months by contact volume, which the PDF does not include. For exact monthly figures, use your dashboard values — you can add them as manual monthly metrics."
          arrow
          placement="top"
        >
          <InfoOutlined sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
        </Tooltip>
      </Box>
      <Typography variant="caption" sx={{ color: onCount === total ? ON : onCount === 0 ? OFF : 'text.secondary', fontWeight: 600 }}>
        On target {onCount}/{total} months
      </Typography>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 9 }}
            interval="preserveStartEnd"
          />
          <YAxis domain={[yMin - pad, yMax + pad]} tick={{ fontSize: 10 }} width={38} />
          <RTooltip
            formatter={(v) => [`Approximate: ${fmt(Number(v), s.isPercent)}`, s.label] as [string, string]}
            labelFormatter={(_, payload) => {
              // Show full month label + week count in tooltip header
              const pt = payload?.[0]?.payload as MonthPoint | undefined;
              return pt ? `${pt.monthLabel} (avg of ${pt.count} week${pt.count > 1 ? 's' : ''})` : '';
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={s.target} stroke="#555" strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1a237e"
            strokeWidth={1.5}
            dot={<TargetDot />}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}

export default function MetricEvolution({ metrics }: Props) {
  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');
  const series = useMemo(() => buildSeries(metrics), [metrics]);

  if (series.length === 0) return null;

  const dates = series.flatMap((s) => s.points.map((p) => p.date)).sort();
  const range = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : '';

  return (
    <Box sx={{ mb: 4 }}>
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#1a237e', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Performance Evolution</Typography>
              <Typography variant="body2">{range}</Typography>
            </Box>
          </Box>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(_, v) => v && setView(v)}
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          >
            <ToggleButton value="monthly">By Month</ToggleButton>
            <ToggleButton value="weekly">By Week</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        Green = on target, red = off target. Trends are reconstructed from the scorecard's weekly
        data points; monthly figures are the average of each month's weeks.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        {series.map((s) =>
          view === 'weekly' ? <WeeklyCard key={s.label} s={s} /> : <MonthlyCard key={s.label} s={s} />,
        )}
      </Box>
    </Box>
  );
}
