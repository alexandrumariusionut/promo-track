import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, getDefaultState, clearAllData } from '../storage';

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
});
