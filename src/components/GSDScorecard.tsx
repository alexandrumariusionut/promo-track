import { Box, Paper, Typography, Grid, Chip } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Metric } from '../types';

interface ScorecardProps {
  metrics: Metric[];
}

// Color logic: green if meeting/exceeding benchmark, red if below
function kpiColor(value: number, benchmark: number, higherIsBetter: boolean): string {
  if (!benchmark) return '#1565c0';
  return higherIsBetter ? (value >= benchmark ? '#2e7d32' : '#c62828') : (value <= benchmark ? '#2e7d32' : '#c62828');
}

function KPICard({ label, value, unit, globalLabel, globalVal, teamLabel, teamVal, higherIsBetter = true, weeklyData }: {
  label: string; value: string; unit?: string; globalLabel?: string; globalVal?: string;
  teamLabel?: string; teamVal?: string; higherIsBetter?: boolean;
  weeklyData?: { week: string; value: number }[];
}) {
  const numVal = parseFloat(value);
  const numGlobal = globalVal ? parseFloat(globalVal) : 0;
  const color = numGlobal ? kpiColor(numVal, numGlobal, higherIsBetter) : '#1565c0';

  return (
    <Paper sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 700, color, my: 1 }}>
        {value}{unit}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1 }}>
        {globalLabel && (
          <Box>
            <Typography variant="caption" color="text.secondary">{globalLabel}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{globalVal}{unit}</Typography>
          </Box>
        )}
        {teamLabel && (
          <Box>
            <Typography variant="caption" color="text.secondary">{teamLabel}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{teamVal}{unit}</Typography>
          </Box>
        )}
      </Box>
      {weeklyData && weeklyData.length > 0 && (
        <Box sx={{ flexGrow: 1, minHeight: 80 }}>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [v, label]} />
              {numGlobal > 0 && <ReferenceLine y={numGlobal} stroke="#999" strokeDasharray="3 3" />}
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {weeklyData.map((entry, i) => (
                  <Cell key={i} fill={numGlobal ? kpiColor(entry.value, numGlobal, higherIsBetter) : '#1565c0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}

function findMetric(metrics: Metric[], type: string, channel = 'Total'): Metric | undefined {
  return metrics.find((m: Metric) => m.type === type && m.channel === channel);
}

function findBenchmark(metrics: Metric[], prefix: string, type: string): string {
  const m = metrics.find((m: Metric) => m.type === `${prefix} ${type}` && m.channel === 'Benchmark');
  return m ? String(m.value) : '';
}

function getWeeklyData(metrics: Metric[], type: string): { week: string; value: number }[] {
  return metrics
    .filter((m: Metric) => m.type === `${type} (Weekly)`)
    .sort((a: Metric, b: Metric) => a.date.localeCompare(b.date))
    .map((m: Metric) => ({ week: m.notes || m.date, value: m.value }));
}

export default function GSDScorecard({ metrics }: ScorecardProps) {
  if (metrics.length === 0) return null;

  const cph = findMetric(metrics, 'CPH');
  const aht = findMetric(metrics, 'AHT');
  const csat = findMetric(metrics, 'CSAT');
  const caseArr = findMetric(metrics, 'Case ARR');
  const contactsMissed = findMetric(metrics, 'Contacts Missed %');
  const acw = findMetric(metrics, 'ACW');
  const dualChat = findMetric(metrics, 'Dual Chat Overlap %');
  const csatRating = findMetric(metrics, 'CSAT Rating');
  const feedbacks = findMetric(metrics, 'Feedbacks Received');
  const dsats = findMetric(metrics, 'DSATs Received');

  // Channel breakdown
  const channels = ['Chat', 'Task', 'Voice'];
  const channelMetrics = channels.map(ch => ({
    channel: ch,
    cph: findMetric(metrics, 'CPH', ch)?.value ?? '—',
    aht: findMetric(metrics, 'AHT', ch)?.value ?? '—',
    ahtAssist: findMetric(metrics, 'AHT Assist', ch)?.value ?? '—',
    acw: findMetric(metrics, 'ACW', ch)?.value ?? '—',
    transferRate: findMetric(metrics, 'Transfer Rate', ch)?.value ?? '—',
    dualChatOverlap: findMetric(metrics, 'Dual Chat Overlap %', ch)?.value ?? '—',
    dualChatRate: findMetric(metrics, 'Dual Chat Rate', ch)?.value ?? '—',
    escalated: findMetric(metrics, 'Escalated', ch)?.value ?? '—',
  }));

  // Date range
  const dates = metrics.filter((m: Metric) => m.channel !== 'Benchmark').map((m: Metric) => m.date).sort();
  const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : '';

  const weeklyAHT = getWeeklyData(metrics, 'AHT');
  const weeklyCPH = getWeeklyData(metrics, 'CPH');
  const weeklyCSAT = getWeeklyData(metrics, 'CSAT');
  const weeklyARR = getWeeklyData(metrics, 'Case ARR');

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

      {/* Agent Summary Row */}
      <Paper sx={{ mb: 2, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', minWidth: 900 }}>
          {[
            { label: 'CPH', val: cph?.value },
            { label: 'cAHT (min)', val: aht?.value },
            { label: 'ACW (min)', val: acw?.value },
            { label: 'Dual Chat Overlap %', val: dualChat ? `${dualChat.value}%` : '—' },
            { label: 'CSAT % of 5', val: csat ? `${csat.value}%` : '—' },
            { label: 'Case ARR', val: caseArr ? `${caseArr.value}%` : '—' },
          ].map(item => (
            <Box key={item.label} sx={{ flex: 1, p: 1.5, textAlign: 'center', borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 600 }}>{item.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.val ?? '—'}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* KPI Cards with Weekly Trends */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="CPH" value={cph ? String(cph.value) : '—'}
            globalLabel="Global CPH" globalVal={findBenchmark(metrics, 'Global', 'CPH')}
            teamLabel="Team CPH" teamVal={findBenchmark(metrics, 'Team', 'CPH')}
            weeklyData={weeklyCPH} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="AHT" value={aht ? String(aht.value) : '—'}
            globalLabel="Global AHT" globalVal={findBenchmark(metrics, 'Global', 'AHT')}
            teamLabel="Team AHT" teamVal={findBenchmark(metrics, 'Team', 'AHT')}
            higherIsBetter={false} weeklyData={weeklyAHT} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="CSAT" value={csat ? String(csat.value) : '—'} unit="%"
            globalLabel="Global CSAT" globalVal={findBenchmark(metrics, 'Global', 'CSAT')}
            teamLabel="Team CSAT" teamVal={findBenchmark(metrics, 'Team', 'CSAT')}
            weeklyData={weeklyCSAT} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="Case ARR" value={caseArr ? String(caseArr.value) : '—'} unit="%"
            globalLabel="Global Case ARR" globalVal={findBenchmark(metrics, 'Global', 'Case ARR')}
            teamLabel="Team Case ARR" teamVal={findBenchmark(metrics, 'Team', 'Case ARR')}
            weeklyData={weeklyARR} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="Contacts Missed" value={contactsMissed ? String(contactsMissed.value) : '—'} unit="%"
            globalLabel="Global" globalVal={findBenchmark(metrics, 'Global', 'Contacts Missed')}
            teamLabel="Team" teamVal={findBenchmark(metrics, 'Team', 'Contacts Missed')}
            higherIsBetter={false} />
        </Grid>
      </Grid>

      {/* Contact Channels Table */}
      <Paper sx={{ mb: 2, overflow: 'auto' }}>
        <Typography variant="subtitle2" sx={{ p: 1.5, bgcolor: 'action.hover', fontWeight: 700 }}>Contact Channels</Typography>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { p: 1, borderBottom: '1px solid', borderColor: 'divider', fontSize: 13, textAlign: 'center' }, '& th': { bgcolor: 'action.hover', fontWeight: 600, fontSize: 11 } }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Channel</th>
              <th>CPH</th><th>AHT</th><th>AHT Assist</th><th>ACW</th>
              <th>Escalated</th><th>Transfer Rate</th><th>Dual Chat Overlap %</th><th>Dual Chat Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 700, backgroundColor: 'inherit' }}>
              <td style={{ textAlign: 'left', fontWeight: 700 }}>Total</td>
              <td>{cph?.value ?? '—'}</td><td>{aht?.value ?? '—'}</td>
              <td>{findMetric(metrics, 'AHT Assist')?.value ?? '—'}</td>
              <td>{acw?.value ?? '—'}</td>
              <td>{findMetric(metrics, 'Escalated')?.value ?? '—'}</td>
              <td>{findMetric(metrics, 'Transfer Rate')?.value ? `${findMetric(metrics, 'Transfer Rate')?.value}%` : '—'}</td>
              <td>{dualChat ? `${dualChat.value}%` : '—'}</td>
              <td>{findMetric(metrics, 'Dual Chat Rate')?.value ? `${findMetric(metrics, 'Dual Chat Rate')?.value}%` : '—'}</td>
            </tr>
            {channelMetrics.map(ch => (
              <tr key={ch.channel}>
                <td style={{ textAlign: 'left' }}>{ch.channel}</td>
                <td>{ch.cph}</td><td>{ch.aht}</td><td>{ch.ahtAssist}</td><td>{ch.acw}</td>
                <td>{ch.escalated}</td>
                <td>{ch.transferRate !== '—' ? `${ch.transferRate}%` : '—'}</td>
                <td>{ch.dualChatOverlap !== '—' ? `${ch.dualChatOverlap}%` : '—'}</td>
                <td>{ch.dualChatRate !== '—' ? `${ch.dualChatRate}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Paper>

      {/* Customer Satisfaction Table */}
      <Paper sx={{ mb: 2, overflow: 'auto' }}>
        <Typography variant="subtitle2" sx={{ p: 1.5, bgcolor: 'action.hover', fontWeight: 700 }}>Customer Satisfaction</Typography>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { p: 1, borderBottom: '1px solid', borderColor: 'divider', fontSize: 13, textAlign: 'center' }, '& th': { bgcolor: 'action.hover', fontWeight: 600, fontSize: 11 } }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Channel</th>
              <th>Percent of 5's</th><th>Feedbacks Received</th><th>DSATs Received</th><th>CSAT Rating</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 700, backgroundColor: 'inherit' }}>
              <td style={{ textAlign: 'left', fontWeight: 700 }}>Total</td>
              <td>{csat ? `${csat.value}%` : '—'}</td>
              <td>{feedbacks?.value ?? '—'}</td>
              <td>{dsats?.value ?? '—'}</td>
              <td>{csatRating?.value ?? '—'}</td>
            </tr>
            {channels.map(ch => {
              const chCsat = findMetric(metrics, 'CSAT', ch);
              const chFb = findMetric(metrics, 'Feedbacks Received', ch);
              const chDsat = findMetric(metrics, 'DSATs Received', ch);
              const chRating = findMetric(metrics, 'CSAT Rating', ch);
              return (
                <tr key={ch}>
                  <td style={{ textAlign: 'left' }}>{ch}</td>
                  <td>{chCsat ? `${chCsat.value}%` : '—'}</td>
                  <td>{chFb?.value ?? '—'}</td>
                  <td>{chDsat?.value ?? '—'}</td>
                  <td>{chRating?.value ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </Box>
      </Paper>
    </Box>
  );
}
