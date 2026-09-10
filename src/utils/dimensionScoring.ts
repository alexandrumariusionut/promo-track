import { STAREntry, AISuggestedDimension } from '../types';

/** A scoreable dimension — either a Competency or a Guideline */
export type ScoreableDimension = { id: string; name: string };

export type DimensionStatus = 'strong' | 'gap';

/**
 * Normalizes whitespace in a string: collapses runs of whitespace to single space, trims.
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Validates AI-suggested dimensions by requiring each justification to contain a substring
 * of ≥20 consecutive characters (case-insensitive, whitespace-normalized) that appears
 * verbatim in the entry's combined text (title + situation + task + action + results).
 *
 * Suggestions that fail this check are discarded as potentially fabricated.
 */
export function validateSuggestions(
  suggestions: AISuggestedDimension[],
  entry: STAREntry,
): AISuggestedDimension[] {
  const combinedText = normalizeWhitespace(
    [entry.title, entry.situation, entry.task, entry.action, entry.results]
      .filter(Boolean)
      .join(' '),
  ).toLowerCase();

  return suggestions.filter(suggestion => {
    const justification = normalizeWhitespace(suggestion.justification);
    if (justification.length < 20) return false;

    // Slide a window of 20 characters across the normalized justification
    const justLower = justification.toLowerCase();
    for (let i = 0; i <= justLower.length - 20; i++) {
      const substring = justLower.slice(i, i + 20);
      if (combinedText.includes(substring)) return true;
    }
    return false;
  });
}

export interface DimensionScore {
  competencyId: string;
  status: DimensionStatus;
  count: number;
  entryIds: string[];
  entryTitles: string[];
}

/**
 * Computes deterministic dimension coverage scores based on confirmed tags only.
 * Two statuses: 1+ entries tagged = Strong (well covered), 0 = Gap (no examples yet).
 * Rule of Three remains a recommendation for consistency, but does not affect status.
 * Works with both the old Competency model and the new Guideline model.
 */
export function scoreDimensions(
  entries: STAREntry[],
  competencies: ScoreableDimension[],
): DimensionScore[] {
  const competencyIds = new Set(competencies.map(c => c.id));

  const countMap = new Map<string, { entryIds: string[]; entryTitles: string[] }>();
  for (const c of competencies) {
    countMap.set(c.id, { entryIds: [], entryTitles: [] });
  }

  for (const entry of entries) {
    if (!entry.dimensions) continue;
    for (const dimId of entry.dimensions) {
      // Ignore unknown competency ids (e.g. from a different level)
      if (!competencyIds.has(dimId)) continue;
      const bucket = countMap.get(dimId);
      if (bucket) {
        bucket.entryIds.push(entry.id);
        bucket.entryTitles.push(entry.title);
      }
    }
  }

  return competencies.map(c => {
    const bucket = countMap.get(c.id)!;
    const count = bucket.entryIds.length;
    const status: DimensionStatus = count >= 1 ? 'strong' : 'gap';
    return {
      competencyId: c.id,
      status,
      count,
      entryIds: bucket.entryIds,
      entryTitles: bucket.entryTitles,
    };
  });
}
