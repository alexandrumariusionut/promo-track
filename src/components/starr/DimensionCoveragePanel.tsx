import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Collapse,
  IconButton,
  Divider,
  CircularProgress,
  Popover,
  Tooltip,
  Card,
} from '@mui/material';
import {
  Analytics,
  ExpandMore,
  ExpandLess,
  School,
  InfoOutlined,
  EditNote,
  BugReport,
  RocketLaunch,
  PublishedWithChanges,
  AdminPanelSettings,
  Psychology,
  Balance,
  MenuBook,
} from '@mui/icons-material';
import { useApp } from '../../store/AppContext';
import { GUIDELINES, BONUS_TAGS } from '../../data/levelGuidelines';
import { scoreDimensions, DimensionScore, DimensionStatus } from '../../utils/dimensionScoring';
import { gapCoaching, GapCoachingResponse } from '../../utils/aiPrompts';
import { chat } from '../../utils/ai';
import { AISuggestedDimension } from '../../types';

interface Props {
  onStartEntry?: (guidelineId?: string) => void;
  onOpenEntry?: (entryId: string) => void;
}

/**
 * Maps icon string id → MUI icon component.
 * Keeps levelGuidelines.ts free of React imports.
 */
const ICON_MAP: Record<string, React.ElementType> = {
  BugReport,
  RocketLaunch,
  PublishedWithChanges,
  AdminPanelSettings,
  Psychology,
  Balance,
  MenuBook,
};

/**
 * Maps internal scoring status to user-friendly display labels.
 * Two statuses: 1+ confirmed = Well covered, 0 = No examples yet.
 */
const STATUS_DISPLAY: Record<DimensionStatus, { label: string; color: 'success' | 'default' }> = {
  strong: { label: 'Well covered', color: 'success' },
  gap: { label: 'No examples yet', color: 'default' },
};

/**
 * Returns a plain-language evidence count badge string.
 */
function evidenceCountLabel(count: number): string {
  if (count === 0) return 'none yet';
  if (count === 1) return '1 example';
  return `${count} examples`;
}

export default function DimensionCoveragePanel({ onStartEntry, onOpenEntry }: Props) {
  const { state, dispatch } = useApp();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [coachingData, setCoachingData] = useState<Record<string, GapCoachingResponse>>({});
  const [coachingLoading, setCoachingLoading] = useState<Set<string>>(new Set());
  const [coachingError, setCoachingError] = useState<Record<string, string>>({});
  const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null);

  const targetLevel = state.profile.targetLevel;
  const guidelines = GUIDELINES[targetLevel as 'L4' | 'L5'];

  // If no guidelines defined for this level, don't render
  if (!guidelines) return null;

  const scores = scoreDimensions(state.star, guidelines);
  // "Covered" means 1+ confirmed evidence for a guideline
  const coveredCount = scores.filter(s => s.count > 0).length;
  const totalCount = guidelines.length;

  // Compute pending AI suggestions per guideline (from all entries)
  const pendingSuggestionsMap = new Map<string, { entryId: string; entryTitle: string; suggestion: AISuggestedDimension }[]>();
  for (const entry of state.star) {
    if (!entry.aiSuggestedDimensions) continue;
    for (const suggestion of entry.aiSuggestedDimensions) {
      const existing = pendingSuggestionsMap.get(suggestion.id) || [];
      existing.push({ entryId: entry.id, entryTitle: entry.title, suggestion });
      pendingSuggestionsMap.set(suggestion.id, existing);
    }
  }

  const handleAcceptSuggestion = (entryId: string, dimensionId: string) => {
    const entry = state.star.find(s => s.id === entryId);
    if (!entry) return;
    const updatedDimensions = [...(entry.dimensions || []), dimensionId];
    const updatedAiSuggestions = (entry.aiSuggestedDimensions || []).filter(s => s.id !== dimensionId);
    dispatch({
      type: 'UPDATE_STAR',
      payload: {
        ...entry,
        dimensions: updatedDimensions,
        aiSuggestedDimensions: updatedAiSuggestions.length > 0 ? updatedAiSuggestions : undefined,
      },
    });
  };

  const handleDismissSuggestion = (entryId: string, dimensionId: string) => {
    const entry = state.star.find(s => s.id === entryId);
    if (!entry) return;
    const updatedAiSuggestions = (entry.aiSuggestedDimensions || []).filter(s => s.id !== dimensionId);
    dispatch({
      type: 'SET_ENTRY_AI_SUGGESTIONS',
      payload: { entryId, suggestions: updatedAiSuggestions },
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCoachMe = async (score: DimensionScore) => {
    const guideline = guidelines.find(g => g.id === score.competencyId);
    if (!guideline) return;

    setCoachingLoading(prev => new Set(prev).add(score.competencyId));
    setCoachingError(prev => {
      const next = { ...prev };
      delete next[score.competencyId];
      return next;
    });

    try {
      const competencyForCoaching = {
        id: guideline.id,
        name: guideline.name,
        rubric: guideline.rubric,
      };
      const prompt = gapCoaching(competencyForCoaching, score.entryTitles, targetLevel);
      const raw = await chat(prompt.system, prompt.user);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: GapCoachingResponse = JSON.parse(cleaned);
      setCoachingData(prev => ({ ...prev, [score.competencyId]: parsed }));
    } catch (e) {
      setCoachingError(prev => ({
        ...prev,
        [score.competencyId]: e instanceof Error ? e.message : 'Coaching failed',
      }));
    } finally {
      setCoachingLoading(prev => {
        const next = new Set(prev);
        next.delete(score.competencyId);
        return next;
      });
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Analytics color="primary" sx={{ fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          Promotion Readiness — {targetLevel} Role Guidelines
          <IconButton
            size="small"
            sx={{ ml: 0.5, p: 0.25 }}
            onClick={(e) => setInfoAnchor(e.currentTarget)}
            aria-label="How this works"
          >
            <InfoOutlined sx={{ fontSize: 16 }} />
          </IconButton>
        </Typography>
      </Box>

      {/* Progress rail — segmented bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Box
          role="progressbar"
          aria-valuenow={coveredCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label={`${coveredCount} of ${totalCount} guidelines covered`}
          sx={{ display: 'flex', gap: '3px', flex: 1, maxWidth: 220 }}
        >
          {scores.map((score, i) => {
            const isCovered = score.count > 0;
            return (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 1,
                  bgcolor: isCovered ? 'success.main' : 'divider',
                  border: isCovered ? '1px solid' : '1.5px dashed',
                  borderColor: isCovered ? 'success.main' : 'text.disabled',
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
              />
            );
          })}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {coveredCount} of {totalCount} covered
        </Typography>
      </Box>

      {/* Summary caption */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Only tags you confirm are counted
      </Typography>

      {/* "Also valued by reviewers" bonus chips moved to footer */}

      {/* How this works popover */}
      <Popover
        open={Boolean(infoAnchor)}
        anchorEl={infoAnchor}
        onClose={() => setInfoAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, maxWidth: 340 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>How this works</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Each row is one of the 7 L4 role guidelines the GSD2 review panel assesses your evidence against.
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            You tag each narrative with the guidelines it demonstrates (or accept AI suggestions).
            Every confirmed tag becomes evidence here.
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            One solid example gives evidence for a guideline. More varied examples strengthen
            consistency (&ldquo;Rule of Three&rdquo; is a good recommendation for strong promos).
          </Typography>
          <Typography variant="body2">
            You do not need every guideline covered to be promotable.
          </Typography>
        </Box>
      </Popover>

      <Divider sx={{ mb: 1.5 }} />

      {/* Per-guideline accordion cards */}
      {scores.map((score) => {
        const guideline = guidelines.find(g => g.id === score.competencyId)!;
        const display = STATUS_DISPLAY[score.status];
        const isExpanded = expandedRows.has(score.competencyId);
        const coaching = coachingData[score.competencyId];
        const isCoachLoading = coachingLoading.has(score.competencyId);
        const coachError = coachingError[score.competencyId];
        const pendingForRow = pendingSuggestionsMap.get(score.competencyId) || [];
        const isCovered = score.count > 0;
        const IconComponent = ICON_MAP[guideline.icon];

        return (
          <Card
            key={score.competencyId}
            variant="outlined"
            sx={{ mb: 1.5 }}
          >
            {/* Card header — clickable accordion trigger */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 1.5,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => toggleRow(score.competencyId)}
              role="button"
              aria-expanded={isExpanded}
              aria-label={`${guideline.leadClause}: ${display.label}`}
            >
              {/* Left icon */}
              {IconComponent && (
                <IconComponent
                  sx={{
                    fontSize: 24,
                    color: isCovered ? 'primary.main' : 'text.disabled',
                    mt: 0.25,
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Text content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, lineHeight: 1.4 }}
                >
                  {guideline.leadClause}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25, maxWidth: '65ch', lineHeight: 1.4 }}
                >
                  {guideline.name}
                </Typography>
              </Box>

              {/* Right side: status chip + count + expand icon */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                  <Chip label={display.label} size="small" color={display.color} variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    {evidenceCountLabel(score.count)}
                  </Typography>
                </Box>
                {pendingForRow.length > 0 && (
                  <Chip
                    label={`+${pendingForRow.length} suggested`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', color: 'info.main', borderColor: 'info.main' }}
                  />
                )}
                <IconButton size="small" sx={{ p: 0 }} tabIndex={-1}>
                  {isExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                </IconButton>
              </Box>
            </Box>

            {/* Expandable detail — with left accent border */}
            <Collapse in={isExpanded}>
              <Box
                sx={{
                  pl: 4,
                  pr: 2,
                  py: 1.5,
                  borderLeft: '3px solid',
                  borderLeftColor: isCovered ? 'success.main' : 'primary.main',
                  ml: 1.5,
                  mb: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}>
                  {guideline.rubric}
                </Typography>

                {/* Tagged entry titles */}
                {score.entryTitles.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Evidence entries:</Typography>
                    {score.entryTitles.map((title, i) => (
                      <Typography
                        key={score.entryIds[i]}
                        variant="caption"
                        color="primary"
                        sx={{
                          display: 'block',
                          cursor: onOpenEntry ? 'pointer' : 'default',
                          textDecoration: onOpenEntry ? 'underline' : 'none',
                          '&:hover': onOpenEntry ? { color: 'primary.dark' } : {},
                        }}
                        onClick={() => onOpenEntry?.(score.entryIds[i])}
                      >
                        • {title}
                      </Typography>
                    ))}
                  </Box>
                )}

                {/* Pending AI suggestions for this guideline */}
                {pendingForRow.length > 0 && (
                  <Box sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      AI suggestions — they only count after you add them
                    </Typography>
                    {pendingForRow.map(({ entryId, entryTitle, suggestion }) => (
                      <Box key={`${entryId}-${suggestion.id}`} sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 500, display: 'block' }}>
                          {entryTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }}>
                          &ldquo;{suggestion.justification}&rdquo;
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={(e) => { e.stopPropagation(); handleAcceptSuggestion(entryId, suggestion.id); }}
                            sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.25, px: 1 }}
                          >
                            Add as evidence
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="inherit"
                            onClick={(e) => { e.stopPropagation(); handleDismissSuggestion(entryId, suggestion.id); }}
                            sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.25, px: 1 }}
                          >
                            Dismiss
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Coach me button — only for non-well-covered rows */}
                {score.status !== 'strong' && (
                  <Box sx={{ mt: 0.5 }}>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={isCoachLoading ? <CircularProgress size={14} /> : <School />}
                      onClick={(e) => { e.stopPropagation(); handleCoachMe(score); }}
                      disabled={isCoachLoading}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      {isCoachLoading ? 'Loading...' : 'What could I write for this?'}
                    </Button>
                    {coachError && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.25 }}>
                        {coachError}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Coaching advice */}
                {coaching && (
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      What counts here:
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                      {coaching.advice.whatCountsHere}
                    </Typography>

                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Story starters:
                    </Typography>
                    {coaching.advice.storyShapes.map((q, i) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block', pl: 1, mb: 0.25 }}>
                        • {q}
                      </Typography>
                    ))}

                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 1, mb: 0.5 }}>
                      Pitfalls to avoid:
                    </Typography>
                    {coaching.advice.pitfalls.map((p, i) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block', pl: 1, mb: 0.25 }}>
                        ⚠️ {p}
                      </Typography>
                    ))}
                  </Box>
                )}

                {/* Write a narrative for this — prominent button for gap rows */}
                {score.status === 'gap' && onStartEntry && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditNote />}
                    onClick={() => onStartEntry(score.competencyId)}
                    sx={{ mt: 1, textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Write a narrative for this
                  </Button>
                )}
              </Box>
            </Collapse>
          </Card>
        );
      })}
      {/* Footer: Also valued by reviewers */}
      <Divider sx={{ mt: 2, mb: 1.5 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Also valued by reviewers — weave these into your examples where relevant:
        </Typography>
        {BONUS_TAGS.map(tag => (
          <Tooltip key={tag.id} title={tag.reviewerGuidance} arrow>
            <Chip
              label={tag.name}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.72rem', cursor: 'default' }}
            />
          </Tooltip>
        ))}
      </Box>
    </Paper>
  );
}
