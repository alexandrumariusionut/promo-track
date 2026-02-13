import { AppState, PortfolioFile, CURRENT_VERSION, APP_VERSION } from '../types';
import { getDefaultState } from '../store/storage';

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

export function importSession(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        // Handle both wrapped (PortfolioFile) and raw (AppState) formats
        const data: AppState = raw.data ? raw.data : raw;
        // Validate required fields exist
        if (!data.profile || !Array.isArray(data.starr)) {
          throw new Error('Invalid portfolio file: missing required sections');
        }
        // Merge with defaults to fill any missing fields from older versions
        const defaults = getDefaultState();
        const merged: AppState = {
          ...defaults,
          ...data,
          profile: { ...defaults.profile, ...data.profile },
          metrics: (data.metrics || []).map((m: any) => ({ notes: '', channel: '', ...m })),
          feedback: (data.feedback || []).map((f: any) => ({
            fromTitle: '', reasonsNotToSupport: '', supportsPromotion: true, steamDirect: '', ...f,
          })),
        };
        resolve(merged);
      } catch (e: any) {
        reject(new Error(`Failed to import: ${e.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
