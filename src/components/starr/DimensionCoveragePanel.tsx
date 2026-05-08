import { useState } from 'react';
import { Box, Paper, Typography, Chip, Button, CircularProgress, Collapse, IconButton, Tooltip, Divider, LinearProgress } from '@mui/material';
import { Analytics, ExpandMore, ExpandLess, Refresh } from '@mui/icons-material';
import { useApp } from '../../store/AppContext';
import { FUNCTIONAL_DIMENSIONS, LEVEL_GUIDELINES } from '../../data/levelGuidelines';
import { chat } from '../../utils/ai';
import { PROMPTS } from '../../utils/aiPrompts';
import { DimensionAnalysis } from '../../types';

type DimStatus = 'strong' | 'moderate' | 'weak' | 'gap';

const STATUS_BAR: Record<DimStatus, { value: number; color: string; label: string }> = {
  strong:   { value: 100, color: 'primary.main',              label: 'Strong' },
  moderate: { value: 66,  color: 'primary.light',             label: 'Growing' },
  weak:     { value: 33,  color: 'action.disabled',           label: 'Emerging' },
  gap:      { value: 0,   color: 'action.disabledBackground', label: 'Not yet started' },
};

const DIMENSION_PROMPTS: Record<string, string> = {
  'Ambiguity': 'A time you solved a problem with no SOP or clear procedure to follow.',
  'Scope & Influence': 'A project where you took on responsibility beyond your usual tasks or helped others improve.',
  'Execution': 'A task you drove from start to finish, hitting targets without needing step-by-step guidance.',
  'Problem Complexity': 'A difficult technical issue you debugged that required deep investigation.',
  'Communication': 'When you explained a technical tradeoff or escalation path to stakeholders.',
  'Impact': 'A project or initiative that delivered measurable results — time saved, tickets reduced, or team efficiency improved.',
  'Process Improvement': 'A workflow, tool, SOP, or KB article you created or improved for the team.',
};

interface Props {
  onStartEntry?: () => void;
}

export default function DimensionCoveragePanel({ onStartEntry }: Props) {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const guidelines = LEVEL_GUIDELINES[state.profile.level];
  // Clear stale analysis data from old format or when no entries exist
  const rawAnalysis = state.dimensionAnalysis;
  const analysis = rawAnalysis && 'dimensions' in rawAnalysis && state.star.length > 0 ? rawAnalysis : undefined;

  if (!guidelines) return null;

  const hasEntries = state.star.length > 0;

  const movingCriteria = guidelines.movingToNextSummary.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const prompt = PROMPTS.analyzeDimensions(state, movingCriteria);
      let raw: string;
      try {
        raw = await chat(prompt.system, prompt.user);
      } catch (e) {
        // Retry once after 2s on transient failures (503, timeout)
        await new Promise(r => setTimeout(r, 2000));
        raw = await chat(prompt.system, prompt.user);
      }
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as Omit<DimensionAnalysis, 'analyzedAt'>;
      dispatch({
        type: 'SET_DIMENSION_ANALYSIS',
        payload: { ...parsed, analyzedAt: new Date().toISOString() },
      });
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getDimStatus = (fd: string): DimStatus => {
    if (!analysis?.dimensions[fd]) return 'gap';
    return analysis.dimensions[fd].strength;
  };

  const coveredCount = analysis
    ? FUNCTIONAL_DIMENSIONS.filter(fd => getDimStatus(fd) === 'strong' || getDimStatus(fd) === 'moderate').length
    : 0;

  const coveredDimensions = analysis
    ? FUNCTIONAL_DIMENSIONS.filter(fd => analysis.dimensions[fd])
    : [];

  // Mode A: No analysis yet — show the guide
  if (!analysis) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Build Your Promotion Story
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Each STAR entry you write covers one or more promotion dimensions. Here's what to write about — start with whichever feels most natural.
        </Typography>
        {FUNCTIONAL_DIMENSIONS.map(fd => (
          <Box key={fd} sx={{ mb: 1.5 }}>
            <Typography variant="body2"><strong>{fd}</strong></Typography>
            <Typography variant="caption" color="text.secondary">{DIMENSION_PROMPTS[fd]}</Typography>
            {onStartEntry && (
              <Button size="small" variant="outlined" onClick={onStartEntry} sx={{ display: 'block', mt: 0.5, textTransform: 'none', fontSize: '0.75rem' }}>
                Write about this
              </Button>
            )}
          </Box>
        ))}
        {hasEntries && (
          <Button size="small" variant="contained" startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Analytics />}
            onClick={handleAnalyze} disabled={loading} sx={{ mt: 1 }}>
            {loading ? 'Analyzing...' : 'Analyze My Entries'}
          </Button>
        )}
        {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{error}</Typography>}
      </Paper>
    );
  }

  // Mode B: Has analysis — show progress bars + expandable details + uncovered guidance
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Analytics color="primary" sx={{ fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          Promotion Readiness — {state.profile.targetLevel} Dimensions
          <Chip label={`${coveredCount}/${FUNCTIONAL_DIMENSIONS.length}`} size="small"
            color="primary" sx={{ ml: 1 }} />
        </Typography>
        <Tooltip title="Re-analyze">
          <IconButton size="small" onClick={handleAnalyze} disabled={loading}>
            <Refresh sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={() => setExpanded(v => !v)}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {error && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{error}</Typography>}

      {/* Dimension progress bars — all 7 always shown */}
      <Box sx={{ mt: 1 }}>
        {FUNCTIONAL_DIMENSIONS.map(fd => {
          const cfg = STATUS_BAR[getDimStatus(fd)];
          return (
            <Box key={fd} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography variant="body2" sx={{ width: 150, flexShrink: 0, fontSize: '0.8rem' }}>{fd}</Typography>
              <LinearProgress variant="determinate" value={cfg.value} sx={{
                width: 120, flexShrink: 0, height: 6, borderRadius: 3, backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': { backgroundColor: cfg.color, borderRadius: 3 },
              }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {cfg.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Expandable details */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {/* Covered dimensions — summary-first layout */}
          {coveredDimensions.map(fd => {
            const dim = analysis.dimensions[fd];
            return (
              <Box key={fd} sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  <strong>{fd}:</strong> {dim.summary}
                </Typography>
                {dim.entryTitles.length > 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
                    Based on: {dim.entryTitles.join(', ')}
                  </Typography>
                )}
              </Box>
            );
          })}

          {/* Gaps section */}
          {analysis.gaps.length > 0 && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Gaps to Address</Typography>
              {analysis.gaps.map(gap => (
                <Box key={gap.dimension} sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                    <strong>{gap.dimension}:</strong> {gap.suggestion}
                  </Typography>
                </Box>
              ))}
            </>
          )}
        </Box>
      </Collapse>

      {/* Uncovered guidance — after the expandable section */}
      {analysis.gaps.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>What to Write Next</Typography>
          {analysis.gaps.map(gap => (
            <Box key={gap.dimension} sx={{ mb: 1.5 }}>
              <Typography variant="body2">
                <strong>{gap.dimension}:</strong> {DIMENSION_PROMPTS[gap.dimension]}
              </Typography>
              {onStartEntry && (
                <Button size="small" variant="outlined" onClick={onStartEntry} sx={{ mt: 0.5, textTransform: 'none', fontSize: '0.75rem' }}>
                  Write about this
                </Button>
              )}
            </Box>
          ))}
        </>
      )}
    </Paper>
  );
}
