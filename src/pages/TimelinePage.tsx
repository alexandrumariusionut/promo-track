import { useState } from 'react';
import { Box, Typography, Paper, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Star, History, RateReview, Assessment, Edit } from '@mui/icons-material';
import { useApp } from '../store/AppContext';

type ItemType = 'star' | 'activity';

interface TimelineItem {
  date: string;
  type: ItemType;
  title: string;
  subtitle: string;
  tags: string[];
}

const icons: Record<ItemType, React.ReactNode> = {
  star: <Star sx={{ fontSize: 14 }} />,
  activity: <History sx={{ fontSize: 14 }} />,
};
const colors: Record<ItemType, string> = { star: '#1976d2', activity: '#7b1fa2' };
const labels: Record<ItemType, string> = { star: 'STAR', activity: 'Activity' };

export default function TimelinePage() {
  const { state } = useApp();
  const [filter, setFilter] = useState<ItemType | 'all'>('all');

  const items: TimelineItem[] = [
    ...state.star.map(s => ({ date: s.date, type: 'star' as const, title: s.title, subtitle: `${s.principles.length} LPs`, tags: s.principles })),
    ...(state.activityLog || []).map(a => ({ date: a.timestamp.split('T')[0], type: 'activity' as const, title: a.action, subtitle: a.detail, tags: [] as string[] })),
  ].filter(i => i.date && (filter === 'all' || i.type === filter))
   .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Timeline</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Chronological view of all portfolio activity.
      </Typography>

      <ToggleButtonGroup value={filter} exclusive onChange={(_, v) => v && setFilter(v)} size="small" sx={{ mb: 3 }}>
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="star">STAR</ToggleButton>
        <ToggleButton value="activity">Activity</ToggleButton>
      </ToggleButtonGroup>

      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>No entries yet.</Typography>
      ) : (
        <Box sx={{ position: 'relative', pl: 4, '&::before': { content: '""', position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, bgcolor: 'divider' } }}>
          {items.map((item, i) => {
            const prevDate = i > 0 ? items[i - 1].date.substring(0, 7) : '';
            const curMonth = item.date.substring(0, 7);
            const showMonth = curMonth !== prevDate;

            return (
              <Box key={`${item.type}-${item.title}-${i}`}>
                {showMonth && (
                  <Typography variant="overline" sx={{ display: 'block', ml: 2, mt: i > 0 ? 2 : 0, mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                    {new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', mb: 2 }}>
                  <Box sx={{ position: 'absolute', left: 6, width: 18, height: 18, borderRadius: '50%', bgcolor: colors[item.type], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 1 }}>
                    {icons[item.type]}
                  </Box>
                  <Paper sx={{ ml: 2, p: 2, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip size="small" label={labels[item.type]} sx={{ bgcolor: colors[item.type], color: 'white', fontWeight: 600 }} />
                        <Chip size="small" label={item.date} variant="outlined" />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">{item.subtitle}</Typography>
                    {item.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                        {item.tags.slice(0, 4).map(t => <Chip key={t} label={t} size="small" variant="outlined" />)}
                        {item.tags.length > 4 && <Chip label={`+${item.tags.length - 4}`} size="small" />}
                      </Box>
                    )}
                  </Paper>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
