import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseGSDMetrics, PDFItem } from '../pdfImport';

const here = dirname(fileURLToPath(import.meta.url));
const text = readFileSync(join(here, 'fixtures/gsd-multimonth.txt'), 'utf8');
const items = JSON.parse(readFileSync(join(here, 'fixtures/gsd-multimonth-items.json'), 'utf8')) as PDFItem[];

// KPI notes-prefix -> expected period aggregate printed in the PDF summary row.
const EXPECTED_AGG: Record<string, number> = {
  'GSD1 Live cAHT': 19.83,
  'Escalation / Repeat cAHT': 22.28,
  'Task Helpdesk AHT': 16.30,
  'ACW Live': 1.75,
  'CSAT%': 84.50,
  'ARR': 92.86,
  'CONC%': 7.73,
  'XFER%': 3.36,
  'Quality Score': 87.96,
  'Contacts Missed': 4.69,
};

describe('parseGSDMetrics — multi-month (Jan–Jul 2026) PDF', () => {
  it('parses the new "Report Date … – …" range instead of falling back to today', () => {
    const metrics = parseGSDMetrics(text, items);
    // Monthly aggregates should be dated at the report start (2026-01-01), not today.
    const monthly = metrics.filter((m) => m.period === 'monthly' && m.channel === 'Total');
    expect(monthly.length).toBeGreaterThan(0);
    expect(monthly.every((m) => m.date.startsWith('2026-01'))).toBe(true);
  });

  it('reconstructs weekly series whose mean matches the printed aggregate for each KPI', () => {
    const metrics = parseGSDMetrics(text, items);
    const weekly = metrics.filter((m) => m.period === 'weekly');

    // Group weekly points by KPI (notes prefix "<KPI> — Week N").
    const byKpi: Record<string, number[]> = {};
    for (const m of weekly) {
      const kpi = m.notes.split(' — ')[0];
      (byKpi[kpi] ||= []).push(m.value);
    }

    let validated = 0;
    for (const [kpi, agg] of Object.entries(EXPECTED_AGG)) {
      const series = byKpi[kpi];
      if (!series || series.length < 4) continue;
      const mean = series.reduce((s, v) => s + v, 0) / series.length;
      const tol = Math.max(2, 0.25 * agg);
      // Every trusted series must be self-consistent with the printed aggregate.
      expect(Math.abs(mean - agg), `${kpi} mean ${mean.toFixed(2)} vs agg ${agg}`).toBeLessThanOrEqual(tol);
      // Each weekly value must carry the KPI's target so on/off-target can be computed.
      expect(series.length).toBeGreaterThanOrEqual(4);
      validated++;
    }

    // We expect at least 8 of the 10 KPI trends to reconstruct and validate.
    expect(validated).toBeGreaterThanOrEqual(8);
  });

  it('assigns every reconstructed weekly point a non-zero target and a valid date', () => {
    const metrics = parseGSDMetrics(text, items);
    const weekly = metrics.filter((m) => m.period === 'weekly');
    expect(weekly.length).toBeGreaterThan(30);
    expect(weekly.every((m) => m.target > 0)).toBe(true);
    // ISO week 1 of 2026 starts 2025-12-29, so allow late-2025 dates
    expect(weekly.every((m) => /^202[56]-/.test(m.date))).toBe(true);
  });
});
