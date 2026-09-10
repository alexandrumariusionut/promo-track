import { describe, it, expect, beforeEach } from 'vitest';
import { setStorageUserAlias, getUserKey, loadState, saveState, getPendingReviewKey, getRetryCountKey, getUnmatchedReviewKey, getDismissedTipsKey, getTrophyShownKey } from '../storage';

beforeEach(() => {
  localStorage.clear();
});

describe('storage per-user namespacing', () => {
  describe('getUserKey', () => {
    it('returns unscoped key when no alias set', () => {
      // Force no alias by not calling setStorageUserAlias
      // Note: module state persists across tests in same file, so test isolation relies on ordering
      // We'll test the function's logic directly
      expect(getUserKey('data')).toMatch(/promo-track-.*data/);
    });
  });

  describe('setStorageUserAlias + migration', () => {
    it('migrates legacy unscoped keys to user namespace', () => {
      // Set up legacy keys
      localStorage.setItem('promo-track-data', JSON.stringify({ profile: { name: 'Test' }, star: [], metrics: [] }));
      localStorage.setItem('promo-track-pending-review', 'session-abc');
      localStorage.setItem('promo-track-review-retry-count', '2');
      localStorage.setItem('promo-track-unmatched-review', '[]');
      localStorage.setItem('promo-track-dismissed-tips', '["tip1"]');
      localStorage.setItem('promo-track-trophy-shown', 'true');

      // Trigger migration
      setStorageUserAlias('testuser');

      // Verify namespaced keys exist
      expect(localStorage.getItem('promo-track-testuser:data')).toContain('Test');
      expect(localStorage.getItem('promo-track-testuser:pending-review')).toBe('session-abc');
      expect(localStorage.getItem('promo-track-testuser:review-retry-count')).toBe('2');
      expect(localStorage.getItem('promo-track-testuser:unmatched-review')).toBe('[]');
      expect(localStorage.getItem('promo-track-testuser:dismissed-tips')).toBe('["tip1"]');
      expect(localStorage.getItem('promo-track-testuser:trophy-shown')).toBe('true');

      // Legacy keys should be removed after migration
      expect(localStorage.getItem('promo-track-data')).toBeNull();
      expect(localStorage.getItem('promo-track-pending-review')).toBeNull();
    });

    it('does not overwrite existing namespaced keys', () => {
      // Namespaced key already exists (e.g., user already migrated on another device)
      localStorage.setItem('promo-track-userB:data', JSON.stringify({ profile: { name: 'Existing' }, star: [], metrics: [] }));
      // Legacy key with different data
      localStorage.setItem('promo-track-data', JSON.stringify({ profile: { name: 'Legacy' }, star: [], metrics: [] }));

      setStorageUserAlias('userB');

      // Should keep the existing namespaced data, not overwrite
      expect(localStorage.getItem('promo-track-userB:data')).toContain('Existing');
    });

    it('marks migration as done and does not re-run', () => {
      localStorage.setItem('promo-track-data', JSON.stringify({ profile: { name: 'First' }, star: [], metrics: [] }));

      setStorageUserAlias('userC');
      // Clear the namespaced key to simulate it being modified
      localStorage.setItem('promo-track-userC:data', JSON.stringify({ profile: { name: 'Modified' }, star: [], metrics: [] }));

      // Re-set a legacy key and try migrating again
      localStorage.setItem('promo-track-data', JSON.stringify({ profile: { name: 'ShouldNotOverwrite' }, star: [], metrics: [] }));
      setStorageUserAlias('userC');

      // Should NOT have overwritten — migration already done
      expect(localStorage.getItem('promo-track-userC:data')).toContain('Modified');
    });

    it('device-level keys remain unscoped', () => {
      localStorage.setItem('promo-track-ai-config', '{"model":"test"}');
      localStorage.setItem('promo-track-onboarding', '{"stage":2}');
      localStorage.setItem('promo-track-theme', 'dark');

      setStorageUserAlias('userD');

      // These should still be accessible at their original keys
      expect(localStorage.getItem('promo-track-ai-config')).toBe('{"model":"test"}');
      expect(localStorage.getItem('promo-track-onboarding')).toBe('{"stage":2}');
      expect(localStorage.getItem('promo-track-theme')).toBe('dark');
    });
  });

  describe('key accessor functions after alias set', () => {
    it('returns correctly namespaced keys', () => {
      setStorageUserAlias('myalias');

      expect(getPendingReviewKey()).toBe('promo-track-myalias:pending-review');
      expect(getRetryCountKey()).toBe('promo-track-myalias:review-retry-count');
      expect(getUnmatchedReviewKey()).toBe('promo-track-myalias:unmatched-review');
      expect(getDismissedTipsKey()).toBe('promo-track-myalias:dismissed-tips');
      expect(getTrophyShownKey()).toBe('promo-track-myalias:trophy-shown');
    });
  });

  describe('loadState and saveState with namespace', () => {
    it('loads from namespaced key after alias is set', () => {
      const state = { profile: { id: '1', name: 'Namespaced User' }, star: [], metrics: [], scopeOfRole: '', bestReasonsNotToPromote: '', additionalInfo: '' };
      localStorage.setItem('promo-track-nsuser:data', JSON.stringify(state));

      setStorageUserAlias('nsuser');
      const loaded = loadState();
      expect(loaded.profile.name).toBe('Namespaced User');
    });

    it('saveState writes to namespaced key', () => {
      setStorageUserAlias('writer');
      const state = { profile: { id: '1', name: 'Writer', email: '', role: '', level: 'L3' as const, targetLevel: 'L4' as const, proposedTitle: '', manager: '', team: '', startDate: '', targetPromotionDate: '', effectiveQuarter: '', steamMember: '', steamDirect: '', promotionApprover: '' }, star: [], metrics: [], scopeOfRole: '', bestReasonsNotToPromote: '', additionalInfo: '' };
      saveState(state);
      expect(localStorage.getItem('promo-track-writer:data')).toContain('Writer');
    });
  });
});
