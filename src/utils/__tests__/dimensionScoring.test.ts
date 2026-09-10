import { describe, it, expect } from 'vitest';
import { scoreDimensions, validateSuggestions } from '../dimensionScoring';
import { STAREntry, AISuggestedDimension } from '../../types';
import { Competency, GUIDELINES, Guideline } from '../../data/levelGuidelines';

const mockCompetencies: Competency[] = [
  {
    id: 'no-sop-troubleshooting',
    name: 'No-SOP Troubleshooting',
    shortName: 'No-SOP',
    rubric: 'Troubleshoot without SOPs',
    evidenceExamples: [],
    wikiCitation: 'test',
  },
  {
    id: 'small-projects',
    name: 'Small Projects',
    shortName: 'Projects',
    rubric: 'Execute small projects',
    evidenceExamples: [],
    wikiCitation: 'test',
  },
  {
    id: 'kb-authoring',
    name: 'KB Authoring',
    shortName: 'KB/SOPs',
    rubric: 'Author operating procedures',
    evidenceExamples: [],
    wikiCitation: 'test',
  },
];

const mockGuidelines: Guideline[] = GUIDELINES.L4;

function makeEntry(id: string, title: string, dimensions: string[]): STAREntry {
  return {
    id,
    title,
    situation: '',
    task: '',
    action: '',
    results: '',
    principles: [],
    date: '2024-01-01',
    quarter: 'Q1 2024',
    impactLevel: 'Medium',
    evidenceLinks: [],
    dimensions,
  };
}

describe('scoreDimensions', () => {
  it('returns gap status for competencies with 0 tagged entries', () => {
    const entries: STAREntry[] = [];
    const scores = scoreDimensions(entries, mockCompetencies);

    expect(scores).toHaveLength(3);
    for (const score of scores) {
      expect(score.status).toBe('gap');
      expect(score.count).toBe(0);
      expect(score.entryIds).toEqual([]);
      expect(score.entryTitles).toEqual([]);
    }
  });

  it('returns strong status for competencies with 1+ tagged entries', () => {
    const entries = [
      makeEntry('e1', 'Entry One', ['no-sop-troubleshooting']),
      makeEntry('e2', 'Entry Two', ['no-sop-troubleshooting']),
    ];
    const scores = scoreDimensions(entries, mockCompetencies);
    const noSop = scores.find(s => s.competencyId === 'no-sop-troubleshooting')!;

    expect(noSop.status).toBe('strong');
    expect(noSop.count).toBe(2);
    expect(noSop.entryIds).toEqual(['e1', 'e2']);
    expect(noSop.entryTitles).toEqual(['Entry One', 'Entry Two']);
  });

  it('returns strong status for competencies with 3+ tagged entries', () => {
    const entries = [
      makeEntry('e1', 'Entry One', ['small-projects']),
      makeEntry('e2', 'Entry Two', ['small-projects']),
      makeEntry('e3', 'Entry Three', ['small-projects']),
    ];
    const scores = scoreDimensions(entries, mockCompetencies);
    const projects = scores.find(s => s.competencyId === 'small-projects')!;

    expect(projects.status).toBe('strong');
    expect(projects.count).toBe(3);
  });

  it('returns strong status for competencies with more than 3 entries', () => {
    const entries = [
      makeEntry('e1', 'One', ['kb-authoring']),
      makeEntry('e2', 'Two', ['kb-authoring']),
      makeEntry('e3', 'Three', ['kb-authoring']),
      makeEntry('e4', 'Four', ['kb-authoring']),
      makeEntry('e5', 'Five', ['kb-authoring']),
    ];
    const scores = scoreDimensions(entries, mockCompetencies);
    const kb = scores.find(s => s.competencyId === 'kb-authoring')!;

    expect(kb.status).toBe('strong');
    expect(kb.count).toBe(5);
  });

  it('ignores unknown dimension ids not in competency list', () => {
    const entries = [
      makeEntry('e1', 'Entry One', ['unknown-dimension', 'no-sop-troubleshooting']),
      makeEntry('e2', 'Entry Two', ['totally-fake-id']),
    ];
    const scores = scoreDimensions(entries, mockCompetencies);
    const noSop = scores.find(s => s.competencyId === 'no-sop-troubleshooting')!;
    const projects = scores.find(s => s.competencyId === 'small-projects')!;

    expect(noSop.status).toBe('strong');
    expect(noSop.count).toBe(1);
    expect(projects.status).toBe('gap');
    expect(projects.count).toBe(0);
  });

  it('counts entries with multiple dimensions correctly', () => {
    const entries = [
      makeEntry('e1', 'Multi-tag Entry', ['no-sop-troubleshooting', 'small-projects', 'kb-authoring']),
    ];
    const scores = scoreDimensions(entries, mockCompetencies);

    for (const score of scores) {
      expect(score.count).toBe(1);
      expect(score.status).toBe('strong');
    }
  });

  it('handles entries without dimensions field gracefully', () => {
    const entries: STAREntry[] = [{
      id: 'e1',
      title: 'No Dimensions',
      situation: '',
      task: '',
      action: '',
      results: '',
      principles: [],
      date: '2024-01-01',
      quarter: 'Q1 2024',
      impactLevel: 'Medium',
      evidenceLinks: [],
      // no dimensions field
    }];
    const scores = scoreDimensions(entries, mockCompetencies);

    for (const score of scores) {
      expect(score.status).toBe('gap');
      expect(score.count).toBe(0);
    }
  });

  it('returns scores in the same order as competencies input', () => {
    const entries: STAREntry[] = [];
    const scores = scoreDimensions(entries, mockCompetencies);

    expect(scores[0].competencyId).toBe('no-sop-troubleshooting');
    expect(scores[1].competencyId).toBe('small-projects');
    expect(scores[2].competencyId).toBe('kb-authoring');
  });
});

describe('validateSuggestions', () => {
  const baseEntry: STAREntry = {
    id: 'test-1',
    title: 'Resolved critical network outage',
    situation: 'The main switch failed at building 42 during peak hours causing widespread connectivity loss.',
    task: 'Diagnose root cause and restore service within SLA.',
    action: 'I identified the faulty firmware version, rolled back to stable, and coordinated with the vendor.',
    results: 'Service restored in 23 minutes, below 30-minute SLA target. Zero repeat incidents in 6 months.',
    principles: [],
    date: '2024-03-15',
    quarter: 'Q1 2024',
    impactLevel: 'High',
    evidenceLinks: [],
  };

  it('keeps a suggestion with a valid ≥20 char quote from the entry', () => {
    const suggestions: AISuggestedDimension[] = [
      {
        id: 'no-sop-troubleshooting',
        justification: 'The entry shows "identified the faulty firmware version" which demonstrates troubleshooting without SOPs.',
      },
    ];
    const result = validateSuggestions(suggestions, baseEntry);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('no-sop-troubleshooting');
  });

  it('drops a suggestion with a fabricated quote not in the entry', () => {
    const suggestions: AISuggestedDimension[] = [
      {
        id: 'small-projects',
        justification: 'The entry mentions "led a multi-quarter infrastructure redesign project across three regions" showing project execution.',
      },
    ];
    const result = validateSuggestions(suggestions, baseEntry);
    expect(result).toHaveLength(0);
  });

  it('handles case-insensitive matching', () => {
    const suggestions: AISuggestedDimension[] = [
      {
        id: 'no-sop-troubleshooting',
        justification: 'Evidence: "THE MAIN SWITCH FAILED AT BUILDING 42" clearly shows an unplanned incident.',
      },
    ];
    const result = validateSuggestions(suggestions, baseEntry);
    expect(result).toHaveLength(1);
  });

  it('handles whitespace normalization (extra spaces/newlines)', () => {
    const entryWithWhitespace: STAREntry = {
      ...baseEntry,
      action: 'I   identified  the   faulty\n  firmware   version   and   rolled   back.',
    };
    const suggestions: AISuggestedDimension[] = [
      {
        id: 'no-sop-troubleshooting',
        justification: 'Shows "identified the faulty firmware version and rolled back" as evidence of troubleshooting.',
      },
    ];
    const result = validateSuggestions(suggestions, entryWithWhitespace);
    expect(result).toHaveLength(1);
  });

  it('drops suggestions with justification shorter than 20 characters', () => {
    const suggestions: AISuggestedDimension[] = [
      {
        id: 'no-sop-troubleshooting',
        justification: 'Short justification',
      },
    ];
    const result = validateSuggestions(suggestions, baseEntry);
    expect(result).toHaveLength(0);
  });

  it('validates against combined title+situation+task+action+results', () => {
    const suggestions: AISuggestedDimension[] = [
      {
        id: 'no-sop-troubleshooting',
        justification: 'The title "Resolved critical network outage" itself demonstrates the scope of work.',
      },
    ];
    const result = validateSuggestions(suggestions, baseEntry);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when given empty suggestions', () => {
    const result = validateSuggestions([], baseEntry);
    expect(result).toHaveLength(0);
  });

  it('filters mixed valid and invalid suggestions correctly', () => {
    const suggestions: AISuggestedDimension[] = [
      {
        id: 'valid-one',
        justification: 'Shows "Diagnose root cause and restore service within SLA" as clear task ownership.',
      },
      {
        id: 'invalid-one',
        justification: 'Completely fabricated text that does not appear anywhere in the entry at all whatsoever.',
      },
    ];
    const result = validateSuggestions(suggestions, baseEntry);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid-one');
  });
});

describe('scoreDimensions with GUIDELINES model', () => {
  it('scores L4 guidelines correctly with guideline ids', () => {
    const entries = [
      makeEntry('e1', 'No-SOP Issue', ['no-sop-troubleshooting']),
      makeEntry('e2', 'Another No-SOP', ['no-sop-troubleshooting', 'tradeoffs']),
      makeEntry('e3', 'Project Work', ['small-projects']),
    ];
    const scores = scoreDimensions(entries, mockGuidelines);

    const noSop = scores.find(s => s.competencyId === 'no-sop-troubleshooting')!;
    expect(noSop.status).toBe('strong');
    expect(noSop.count).toBe(2);

    const tradeoffs = scores.find(s => s.competencyId === 'tradeoffs')!;
    expect(tradeoffs.status).toBe('strong');
    expect(tradeoffs.count).toBe(1);

    const projects = scores.find(s => s.competencyId === 'small-projects')!;
    expect(projects.status).toBe('strong');
    expect(projects.count).toBe(1);

    const kb = scores.find(s => s.competencyId === 'kb-authoring')!;
    expect(kb.status).toBe('gap');
    expect(kb.count).toBe(0);
  });

  it('returns all 7 L4 guideline rows', () => {
    const scores = scoreDimensions([], mockGuidelines);
    expect(scores).toHaveLength(7);
    expect(scores.map(s => s.competencyId)).toEqual([
      'no-sop-troubleshooting',
      'small-projects',
      'change-management',
      'higher-permissions',
      'root-cause-automation',
      'tradeoffs',
      'kb-authoring',
    ]);
  });

  it('achieves strong status with 3+ entries for a guideline', () => {
    const entries = [
      makeEntry('e1', 'Entry 1', ['root-cause-automation']),
      makeEntry('e2', 'Entry 2', ['root-cause-automation']),
      makeEntry('e3', 'Entry 3', ['root-cause-automation']),
    ];
    const scores = scoreDimensions(entries, mockGuidelines);
    const rca = scores.find(s => s.competencyId === 'root-cause-automation')!;
    expect(rca.status).toBe('strong');
    expect(rca.count).toBe(3);
  });
});
