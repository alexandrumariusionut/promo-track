import { AppState, PortfolioFile, CURRENT_VERSION, APP_VERSION, Metric } from '../types';
import { getDefaultState } from '../store/storage';

const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5MB
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

export function exportSession(state: AppState): void {
  const portfolio: PortfolioFile = {
    metadata: {
      version: CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      appVersion: APP_VERSION,
    },
    data: state,
  };
  const blob = new Blob([JSON.stringify(portfolio, null, 2)], { type: 'application/json' });
  const name = state.profile.name.replace(/\s+/g, '_') || 'unnamed';
  const date = new Date().toISOString().split('T')[0];
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio_${name}_${date}.portfolio`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importSession(file: File): Promise<AppState> {
  if (file.size > MAX_IMPORT_SIZE) throw new Error(`File too large (max ${MAX_IMPORT_SIZE / 1024 / 1024}MB)`);

  const raw = await file.text();

  // Skip old encrypted files — they can't be imported without the removed crypto
  if (raw.startsWith('PROMO-TRACK-ENC:')) {
    throw new Error('This file was encrypted with an older version and cannot be imported. Please re-export from the original app.');
  }

  if (DANGEROUS_KEYS.some(k => raw.includes(`"${k}"`))) {
    throw new Error('Invalid portfolio file: contains forbidden keys');
  }

  const parsed = JSON.parse(raw);
  const data: AppState = parsed.data ? parsed.data : parsed;

  if (!data.profile || (!Array.isArray(data.star) && !Array.isArray((data as any).starr))) {
    throw new Error('Invalid portfolio file: missing required sections');
  }

  // Migrate old 'starr' key to 'star'
  if (!data.star && Array.isArray((data as any).starr)) {
    data.star = (data as any).starr;
    delete (data as any).starr;
  }

  const defaults = getDefaultState();
  return {
    ...defaults,
    ...data,
    profile: { ...defaults.profile, ...data.profile },
    metrics: (data.metrics || []).map((m: Partial<Metric>) => ({ 
      id: m.id || '', 
      type: m.type || '', 
      value: m.value || 0, 
      target: m.target || 0, 
      date: m.date || '', 
      period: m.period || 'monthly', 
      notes: m.notes || '', 
      channel: m.channel || '' 
    })),
  };
}
