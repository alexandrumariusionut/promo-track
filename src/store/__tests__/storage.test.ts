import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, getDefaultState, clearAllData, migrateToGuidelineIds } from '../storage';
import { STAREntry } from '../../types';

beforeEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  describe('plaintext state', () => {
    it('loadState returns default state when nothing stored', () => {
      const state = loadState();
      expect(state.profile).toBeDefined();
      expect(state.star).toEqual([]);
      expect(state.metrics).toEqual([]);
    });

    it('saveState and loadState round-trip', () => {
      const state = getDefaultState();
      state.profile.name = 'Test User';
      saveState(state);
      const loaded = loadState();
      expect(loaded.profile.name).toBe('Test User');
    });

    it('loadState returns defaults when stored data is not valid JSON', () => {
      localStorage.setItem('promo-track-data', 'not-json');
      const state = loadState();
      expect(state.profile).toBeDefined();
      expect(state.star).toEqual([]);
    });
  });

  describe('getDefaultState', () => {
    it('returns a deep copy', () => {
      const a = getDefaultState();
      const b = getDefaultState();
      a.profile.name = 'modified';
      expect(b.profile.name).toBe('');
    });
  });

  describe('clearAllData', () => {
    it('removes all storage keys', () => {
      saveState(getDefaultState());
      clearAllData();
      expect(localStorage.getItem('promo-track-data')).toBeNull();
      expect(localStorage.getItem('promo-track-encrypted')).toBeNull();
      expect(localStorage.getItem('promo-track-lock-ts')).toBeNull();
    });

    it('sets reset flag', () => {
      clearAllData();
      expect(localStorage.getItem('promo-track-was-reset')).toBe('1');
    });

    it('loadState returns defaults after clearAllData', () => {
      const state = getDefaultState();
      state.profile.name = 'Before Clear';
      saveState(state);
      clearAllData();
      const loaded = loadState();
      expect(loaded.profile.name).toBe('');
    });
  });

  describe('migration: levelDimension → dimensions', () => {
    it('migrates legacy levelDimension string into dimensions array', () => {
      const stored = {
        profile: { id: '1', name: 'Test', level: 'L3', targetLevel: 'L4' },
        star: [
          {
            id: 'entry1',
            title: 'Test Entry',
            situation: '',
            task: '',
            action: '',
            results: '',
            principles: [],
            date: '2024-01-01',
            quarter: 'Q1 2024',
            impactLevel: 'Medium',
            evidenceLinks: [],
            levelDimension: 'no-sop-troubleshooting',
          },
        ],
        metrics: [],
        scopeOfRole: '',
        bestReasonsNotToPromote: '',
        additionalInfo: '',
      };
      localStorage.setItem('promo-track-data', JSON.stringify(stored));
      const loaded = loadState();
      // no-sop-troubleshooting is already a valid guideline id — stays as-is
      expect(loaded.star[0].dimensions).toEqual(['no-sop-troubleshooting']);
      // levelDimension should still be present (not removed)
      expect(loaded.star[0].levelDimension).toBe('no-sop-troubleshooting');
    });

    it('does not overwrite existing dimensions array (and migrates old ids)', () => {
      const stored = {
        profile: { id: '1', name: 'Test', level: 'L3', targetLevel: 'L4' },
        star: [
          {
            id: 'entry1',
            title: 'Test Entry',
            situation: '',
            task: '',
            action: '',
            results: '',
            principles: [],
            date: '2024-01-01',
            quarter: 'Q1 2024',
            impactLevel: 'Medium',
            evidenceLinks: [],
            levelDimension: 'old-value',
            dimensions: ['small-projects', 'kb-authoring'],
          },
        ],
        metrics: [],
        scopeOfRole: '',
        bestReasonsNotToPromote: '',
        additionalInfo: '',
      };
      localStorage.setItem('promo-track-data', JSON.stringify(stored));
      const loaded = loadState();
      // small-projects and kb-authoring are both valid guideline ids — kept as-is
      expect(loaded.star[0].dimensions).toContain('small-projects');
      expect(loaded.star[0].dimensions).toContain('kb-authoring');
    });

    it('handles entries without levelDimension gracefully', () => {
      const stored = {
        profile: { id: '1', name: 'Test', level: 'L3', targetLevel: 'L4' },
        star: [
          {
            id: 'entry1',
            title: 'Clean Entry',
            situation: '',
            task: '',
            action: '',
            results: '',
            principles: [],
            date: '2024-01-01',
            quarter: 'Q1 2024',
            impactLevel: 'Medium',
            evidenceLinks: [],
          },
        ],
        metrics: [],
        scopeOfRole: '',
        bestReasonsNotToPromote: '',
        additionalInfo: '',
      };
      localStorage.setItem('promo-track-data', JSON.stringify(stored));
      const loaded = loadState();
      expect(loaded.star[0].dimensions).toBeUndefined();
    });
  });

  describe('migration: old competency ids → guideline ids (identity map)', () => {
    function makeTestEntry(id: string, dimensions: string[], themes?: string[]): STAREntry {
      return {
        id,
        title: `Entry ${id}`,
        situation: '', task: '', action: '', results: '',
        principles: [], date: '2024-01-01', quarter: 'Q1 2024',
        impactLevel: 'Medium', evidenceLinks: [], dimensions,
        ...(themes ? { themes } : {}),
      };
    }

    it('keeps no-sop-troubleshooting as-is (already a guideline id)', () => {
      const entries = [makeTestEntry('e1', ['no-sop-troubleshooting'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['no-sop-troubleshooting']);
    });

    it('keeps small-projects as-is (already a guideline id)', () => {
      const entries = [makeTestEntry('e1', ['small-projects'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['small-projects']);
    });

    it('keeps change-management as-is (already a guideline id)', () => {
      const entries = [makeTestEntry('e1', ['change-management'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['change-management']);
    });

    it('keeps higher-permissions as-is (already a guideline id)', () => {
      const entries = [makeTestEntry('e1', ['higher-permissions'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['higher-permissions']);
    });

    it('keeps root-cause-automation as-is (already a guideline id)', () => {
      const entries = [makeTestEntry('e1', ['root-cause-automation'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['root-cause-automation']);
    });

    it('keeps tradeoffs as-is (already a guideline id)', () => {
      const entries = [makeTestEntry('e1', ['tradeoffs'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['tradeoffs']);
    });

    it('keeps kb-authoring as-is (already a guideline id)', () => {
      const entries = [makeTestEntry('e1', ['kb-authoring'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['kb-authoring']);
    });

    it('preserves already-valid guideline ids without duplication', () => {
      const entries = [makeTestEntry('e1', ['no-sop-troubleshooting', 'tradeoffs'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toContain('no-sop-troubleshooting');
      expect(result[0].dimensions).toContain('tradeoffs');
      expect(result[0].dimensions).toHaveLength(2);
    });

    it('keeps unknown ids (does not drop unrecognized data)', () => {
      const entries = [makeTestEntry('e1', ['unknown-future-id'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['unknown-future-id']);
    });

    it('handles entries without dimensions gracefully', () => {
      const entry: STAREntry = {
        id: 'e1', title: 'No dims', situation: '', task: '', action: '', results: '',
        principles: [], date: '2024-01-01', quarter: 'Q1 2024', impactLevel: 'Medium',
        evidenceLinks: [],
      };
      const result = migrateToGuidelineIds([entry]);
      expect(result[0].dimensions).toBeUndefined();
    });
  });

  describe('migration: responsibility ids → guideline ids', () => {
    function makeTestEntry(id: string, dimensions: string[], themes?: string[]): STAREntry {
      return {
        id,
        title: `Entry ${id}`,
        situation: '', task: '', action: '', results: '',
        principles: [], date: '2024-01-01', quarter: 'Q1 2024',
        impactLevel: 'Medium', evidenceLinks: [], dimensions,
        ...(themes ? { themes } : {}),
      };
    }

    it('maps contact-support → no-sop-troubleshooting', () => {
      const entries = [makeTestEntry('e1', ['contact-support'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['no-sop-troubleshooting']);
    });

    it('maps assist → no-sop-troubleshooting', () => {
      const entries = [makeTestEntry('e1', ['assist'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['no-sop-troubleshooting']);
    });

    it('maps escalated-contacts → higher-permissions', () => {
      const entries = [makeTestEntry('e1', ['escalated-contacts'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['higher-permissions']);
    });

    it('maps executive-support → no-sop-troubleshooting', () => {
      const entries = [makeTestEntry('e1', ['executive-support'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['no-sop-troubleshooting']);
    });

    it('maps repeat-contact-resolution → root-cause-automation', () => {
      const entries = [makeTestEntry('e1', ['repeat-contact-resolution'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['root-cause-automation']);
    });

    it('maps process-improvement → root-cause-automation', () => {
      const entries = [makeTestEntry('e1', ['process-improvement'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].dimensions).toEqual(['root-cause-automation']);
    });

    it('maps hiring-training-mentorship → themes (mentoring-coaching), NOT dimensions', () => {
      const entries = [makeTestEntry('e1', ['hiring-training-mentorship'])];
      const result = migrateToGuidelineIds(entries);
      // Should NOT have it in dimensions (it becomes a theme)
      expect(result[0].dimensions).toEqual([]);
      expect(result[0].themes).toContain('mentoring-coaching');
    });

    it('deduplicates when multiple responsibility ids map to the same guideline', () => {
      const entries = [makeTestEntry('e1', ['contact-support', 'assist', 'executive-support'])];
      const result = migrateToGuidelineIds(entries);
      // All three map to no-sop-troubleshooting — should deduplicate
      expect(result[0].dimensions).toEqual(['no-sop-troubleshooting']);
    });

    it('handles mixed guideline ids and responsibility ids', () => {
      const entries = [makeTestEntry('e1', ['no-sop-troubleshooting', 'escalated-contacts'])];
      const result = migrateToGuidelineIds(entries);
      // no-sop already valid, escalated-contacts → higher-permissions
      expect(result[0].dimensions).toContain('no-sop-troubleshooting');
      expect(result[0].dimensions).toContain('higher-permissions');
    });

    it('preserves existing themes when adding theme from migration', () => {
      const entries = [makeTestEntry('e1', ['hiring-training-mentorship'], ['difficult-customer'])];
      const result = migrateToGuidelineIds(entries);
      expect(result[0].themes).toContain('mentoring-coaching');
      expect(result[0].themes).toContain('difficult-customer');
    });

    it('is idempotent — running twice gives the same result', () => {
      const entries = [makeTestEntry('e1', ['contact-support', 'hiring-training-mentorship'])];
      const firstPass = migrateToGuidelineIds(entries);
      const secondPass = migrateToGuidelineIds(firstPass);
      expect(secondPass[0].dimensions).toEqual(firstPass[0].dimensions);
      expect(secondPass[0].themes).toEqual(firstPass[0].themes);
    });

    it('migrates through loadState end-to-end', () => {
      const stored = {
        profile: { id: '1', name: 'Test', level: 'L3', targetLevel: 'L4' },
        star: [
          {
            id: 'entry1', title: 'Old Entry', situation: '', task: '', action: '', results: '',
            principles: [], date: '2024-01-01', quarter: 'Q1 2024', impactLevel: 'Medium',
            evidenceLinks: [], dimensions: ['contact-support', 'process-improvement'],
          },
        ],
        metrics: [],
        scopeOfRole: '',
        bestReasonsNotToPromote: '',
        additionalInfo: '',
      };
      localStorage.setItem('promo-track-data', JSON.stringify(stored));
      const loaded = loadState();
      // contact-support → no-sop-troubleshooting, process-improvement → root-cause-automation
      expect(loaded.star[0].dimensions).toContain('no-sop-troubleshooting');
      expect(loaded.star[0].dimensions).toContain('root-cause-automation');
    });
  });
});
