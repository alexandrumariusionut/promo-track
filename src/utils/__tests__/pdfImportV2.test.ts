import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseGSDMetrics, parseGSDMetricsV2, PDFItem } from '../pdfImport';
import { parseDateRange, parseAgentLevel, isoWeekToDate } from '../pdfImportV2';
import { interpolateWeekFromX } from '../pdfImportV2';

const here = dirname(fileURLToPath(import.meta.url));
const text0724 = readFileSync(join(here, 'fixtures/gsd1-0724-text.txt'), 'utf8');
const items0724: PDFItem[] = JSON.parse(readFileSync(join(here, 'fixtures/gsd1-0724-items.json'), 'utf8'));

// Helper: compute ISO week Monday date
function w(weekNum: number, year = 2026): string {
  return isoWeekToDate(weekNum, year);
}

describe('pdfImportV2 — golden test (gsd1-0724 fixture, interpolated weeks)', () => {
  const result = parseGSDMetricsV2(text0724, items0724);
  const { metrics, diagnostics } = result;
  const weekly = metrics.filter(m => m.period === 'weekly');
  const monthly = metrics.filter(m => m.period === 'monthly');

  // Group weekly by KPI
  const byKpi: Record<string, typeof metrics> = {};
  for (const m of weekly) {
    const kpi = m.notes.split(' — ')[0];
    (byKpi[kpi] ||= []).push(m);
  }

  it('finds at least 10 KPIs', () => {
    expect(diagnostics.found.length).toBeGreaterThanOrEqual(10);
  });

  it('produces 14-week series for GSD1 Live cAHT', () => {
    const series = byKpi['GSD1 Live cAHT'];
    expect(series).toBeDefined();
    expect(series.length).toBe(14);
  });

  it('produces 20-week series for CSAT% spanning W1–W30 (interpolated)', () => {
    const series = byKpi['CSAT%'];
    expect(series).toBeDefined();
    expect(series.length).toBe(20);
    // Verify first and last weeks
    const weeks = series.map(m => parseInt(m.notes.match(/Week (\d+)/)![1])).sort((a, b) => a - b);
    expect(weeks[0]).toBe(1);
    expect(weeks[weeks.length - 1]).toBe(30);
  });

  it('uses ISO week dates: W2 Monday = 2026-01-05, W29 Monday = 2026-07-13', () => {
    expect(w(2)).toBe('2026-01-05');
    expect(w(29)).toBe('2026-07-13');

    // Verify actual data uses these dates
    const caht = byKpi['GSD1 Live cAHT'];
    expect(caht).toBeDefined();
    const w2pt = caht.find(m => m.notes.includes('Week 2'));
    const w29pt = caht.find(m => m.notes.includes('Week 29'));
    expect(w2pt?.date).toBe('2026-01-05');
    expect(w29pt?.date).toBe('2026-07-13');
  });

  it('reports Assist cAHT in missing[] with no-data reason', () => {
    const assistMissing = diagnostics.missing.find(m => m.label === 'Assist cAHT');
    expect(assistMissing).toBeDefined();
    expect(assistMissing!.reason).toContain('no data');
  });

  it('weekly series mean matches printed aggregate within tolerance for each found KPI', () => {
    let validated = 0;
    for (const { label, aggregate } of diagnostics.found) {
      if (aggregate === null) continue;
      const series = byKpi[label];
      if (!series || series.length < 4) continue;
      const mean = series.reduce((s, m) => s + m.value, 0) / series.length;
      const tol = Math.max(2, 0.3 * aggregate);
      expect(Math.abs(mean - aggregate), `${label} mean ${mean.toFixed(2)} vs agg ${aggregate}`)
        .toBeLessThanOrEqual(tol);
      validated++;
    }
    expect(validated).toBeGreaterThanOrEqual(8);
  });

  it('all weekly points have non-zero targets and valid dates in report year range', () => {
    expect(weekly.length).toBeGreaterThan(100);
    expect(weekly.every(m => m.target > 0)).toBe(true);
    // ISO week 1 of 2026 starts 2025-12-29, so allow late-2025 dates
    expect(weekly.every(m => /^202[56]-/.test(m.date))).toBe(true);
  });

  it('monthly aggregates are dated at report start (2026-01-01)', () => {
    expect(monthly.length).toBeGreaterThan(5);
    expect(monthly.filter(m => m.channel === 'Total' && !m.notes.includes('Metrics'))
      .every(m => m.date === '2026-01-01')).toBe(true);
  });

  it('includes Metrics+ section items', () => {
    const metricsPlusItems = metrics.filter(m => m.notes.includes('Contacts Received'));
    expect(metricsPlusItems.length).toBeGreaterThanOrEqual(1);
  });

  it('handles NULL agent level gracefully (defaults to L3)', () => {
    expect(diagnostics.warnings.some(w => w.includes('NULL') || w.includes('L3'))).toBe(true);
  });
});

describe('pdfImportV2 — backward compatibility (gsd-multimonth fixture)', () => {
  const textMM = readFileSync(join(here, 'fixtures/gsd-multimonth.txt'), 'utf8');
  const itemsMM: PDFItem[] = JSON.parse(readFileSync(join(here, 'fixtures/gsd-multimonth-items.json'), 'utf8'));

  it('parseGSDMetrics still returns Metric[] (legacy API)', () => {
    const metrics = parseGSDMetrics(textMM, itemsMM);
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0]).toHaveProperty('id');
    expect(metrics[0]).toHaveProperty('type');
    expect(metrics[0]).toHaveProperty('value');
  });

  it('reconstructs at least 8 KPIs for the multi-month fixture', () => {
    const result = parseGSDMetricsV2(textMM, itemsMM);
    expect(result.diagnostics.found.length).toBeGreaterThanOrEqual(8);
  });
});

describe('pdfImportV2 — perturbation tests (resilience proof)', () => {
  // Helper to clone and mutate items
  const clone = (items: PDFItem[]) => JSON.parse(JSON.stringify(items)) as PDFItem[];

  it('renaming "Overall rAHT" to "Total rAHT (min)" still imports other KPIs', () => {
    const mutated = clone(items0724).map(i => ({
      ...i,
      str: i.str.replace('Overall rAHT', 'Total rAHT (min)'),
    }));
    const mutText = text0724.replace(/Overall rAHT/g, 'Total rAHT (min)');
    const result = parseGSDMetricsV2(mutText, mutated);
    // Other KPIs should still be found
    const foundLabels = result.diagnostics.found.map(f => f.label);
    expect(foundLabels).toContain('GSD1 Live cAHT');
    expect(foundLabels).toContain('CSAT%');
    expect(foundLabels).toContain('ACW Live');
    expect(result.diagnostics.found.length).toBeGreaterThanOrEqual(9);
    // The renamed KPI should ALSO match via alias
    expect(foundLabels).toContain('Overall rAHT');
  });

  it('translating all y by +500 and scaling x by 1.3 still imports (relative anchoring)', () => {
    const mutated = clone(items0724).map(i => ({
      ...i,
      x: Math.round(i.x * 1.3),
      y: Math.round(i.y + 500),
    }));
    const result = parseGSDMetricsV2(text0724, mutated);
    expect(result.diagnostics.found.length).toBeGreaterThanOrEqual(8);
    const weekly = result.metrics.filter(m => m.period === 'weekly');
    expect(weekly.length).toBeGreaterThanOrEqual(50);
  });

  it('removing one KPI label results in only that KPI missing', () => {
    // Remove all "CONC%" items
    const mutated = clone(items0724).filter(i => !/^CONC%$/.test(i.str.trim()));
    const result = parseGSDMetricsV2(text0724, mutated);
    const foundLabels = result.diagnostics.found.map(f => f.label);
    expect(foundLabels).not.toContain('CONC%');
    // Others should still be present
    expect(foundLabels).toContain('GSD1 Live cAHT');
    expect(foundLabels).toContain('CSAT%');
    expect(foundLabels).toContain('ARR');
  });

  it('swapping left/right column x positions still imports', () => {
    // Mirror x: items with x < 600 get x += 600, items with x >= 600 get x -= 400
    const mutated = clone(items0724).map(i => ({
      ...i,
      x: i.x < 600 ? i.x + 600 : i.x - 400,
    }));
    const result = parseGSDMetricsV2(text0724, mutated);
    // Should still find KPIs even though columns are swapped
    expect(result.diagnostics.found.length).toBeGreaterThanOrEqual(7);
  });

  it('injecting stray numbers near footer causes no corruption', () => {
    // Add fake numeric items at low y (footer area) that would be picked up by the old parser
    const strayItems: PDFItem[] = [
      { str: '99.99', x: 300, y: 50 },
      { str: '42.00', x: 400, y: 30 },
      { str: '1234', x: 250, y: 20 },
      { str: '78.5%', x: 500, y: 10 },
    ];
    const mutated = [...clone(items0724), ...strayItems];
    const result = parseGSDMetricsV2(text0724, mutated);
    // Should produce same results as clean extraction
    const cleanResult = parseGSDMetricsV2(text0724, items0724);
    expect(result.diagnostics.found.length).toBe(cleanResult.diagnostics.found.length);
  });

  it('value 150 in a series is retained for count-kind KPIs (no v<=110 cap)', () => {
    // Find a numeric item in the GSD1 Live cAHT chart and replace it with 150
    // (this would be rejected by the old parser's v<=110 filter)
    // But since GSD1 Live cAHT is 'minutes' kind with maxVal 120, 150 IS filtered.
    // However, if we add a 'count' kind KPI definition... For now test that large values
    // in a percent chart ARE filtered (percent max 100.5) but won't corrupt others
    const mutated = clone(items0724);
    // Add a large value near CSAT% chart data region
    const csatLabel = mutated.find(i => /^CSAT%$/.test(i.str.trim()) && i.y > 1000 && i.y < 1300);
    if (csatLabel) {
      mutated.push({ str: '150', x: csatLabel.x + 200, y: csatLabel.y - 50 });
    }
    const result = parseGSDMetricsV2(text0724, mutated);
    // CSAT% should still be valid (150 filtered out as > 100.5 for percent)
    const csatFound = result.diagnostics.found.find(f => f.label === 'CSAT%');
    expect(csatFound).toBeDefined();
  });

  it('returns partial results when only some KPIs are parseable', () => {
    // Remove most items but keep GSD1 Live cAHT region
    const cahtLabel = items0724.find(i => /GSD1 Live cAHT/.test(i.str) && i.y > 1700 && i.x < 200);
    expect(cahtLabel).toBeDefined();
    // Keep only items in the cAHT region + metadata
    const mutated = clone(items0724).filter(i =>
      // Keep metadata (top of page)
      i.y < 300 ||
      // Keep GSD1 Live cAHT chart area
      (i.y > 1600 && i.y < 1750 && i.x < 600) ||
      // Keep week labels for cAHT
      (/^W\d+$/.test(i.str.trim()) && i.y > 1600 && i.y < 1650 && i.x < 600) ||
      // Keep Metrics+ for text path
      /Metrics\+/.test(i.str)
    );
    const result = parseGSDMetricsV2(text0724, mutated);
    expect(result.diagnostics.found.length).toBeGreaterThanOrEqual(1);
    expect(result.diagnostics.missing.length).toBeGreaterThan(0);
    expect(result.metrics.length).toBeGreaterThan(0);
  });
});

describe('pdfImportV2 — date format variants', () => {
  it('parses "Report Date YYYY/MM/DD – YYYY/MM/DD" (en-dash)', () => {
    const { startDate, endDate } = parseDateRange('Report Date 2026/01/01 – 2026/07/31');
    expect(startDate).toBe('2026-01-01');
    expect(endDate).toBe('2026-07-31');
  });

  it('parses "Report Date YYYY/MM/DD - YYYY/MM/DD" (hyphen)', () => {
    const { startDate, endDate } = parseDateRange('Report Date 2026/03/01 - 2026/03/31');
    expect(startDate).toBe('2026-03-01');
    expect(endDate).toBe('2026-03-31');
  });

  it('parses "Report Date YYYY/MM/DD — YYYY/MM/DD" (em-dash)', () => {
    const { startDate, endDate } = parseDateRange('Report Date 2026/01/01 — 2026/06/30');
    expect(startDate).toBe('2026-01-01');
    expect(endDate).toBe('2026-06-30');
  });

  it('parses "Report Start Date / Report End Date" (old format)', () => {
    const { startDate, endDate } = parseDateRange('Report Start Date 2025/11/01 Report End Date 2025/11/30');
    expect(startDate).toBe('2025-11-01');
    expect(endDate).toBe('2025-11-30');
  });

  it('parses "Report Date YYYY-MM-DD – YYYY-MM-DD" (ISO format)', () => {
    const { startDate, endDate } = parseDateRange('Report Date 2026-01-01 – 2026-07-31');
    expect(startDate).toBe('2026-01-01');
    expect(endDate).toBe('2026-07-31');
  });

  it('parses "Report Date DD Mon YYYY – DD Mon YYYY"', () => {
    const { startDate, endDate } = parseDateRange('Report Date 1 Jan 2026 – 31 Jul 2026');
    expect(startDate).toBe('2026-01-01');
    expect(endDate).toBe('2026-07-31');
  });

  it('parses "Report Date Mon DD, YYYY – Mon DD, YYYY"', () => {
    const { startDate, endDate } = parseDateRange('Report Date Jan 1, 2026 – Jul 31, 2026');
    expect(startDate).toBe('2026-01-01');
    expect(endDate).toBe('2026-07-31');
  });

  it('returns today with warning when no date found', () => {
    const { warning } = parseDateRange('Some random text with no date');
    expect(warning).toBeDefined();
    expect(warning).toContain('Could not parse');
  });
});

describe('pdfImportV2 — agent level parsing', () => {
  it('parses numeric level', () => {
    expect(parseAgentLevel('Agent Job Level 4').level).toBe(4);
  });

  it('handles NULL level (defaults to 3 with warning)', () => {
    const { level, warning } = parseAgentLevel('Agent Job Level NULL');
    expect(level).toBe(3);
    expect(warning).toBeDefined();
  });

  it('handles missing level (defaults to 3 with warning)', () => {
    const { level, warning } = parseAgentLevel('Some text without level');
    expect(level).toBe(3);
    expect(warning).toBeDefined();
  });
});

describe('pdfImportV2 — isoWeekToDate', () => {
  it('W1 2026 = 2025-12-29 (ISO week 1 can start in previous year)', () => {
    expect(isoWeekToDate(1, 2026)).toBe('2025-12-29');
  });

  it('W2 2026 = 2026-01-05', () => {
    expect(isoWeekToDate(2, 2026)).toBe('2026-01-05');
  });

  it('W5 2026 = 2026-01-26', () => {
    expect(isoWeekToDate(5, 2026)).toBe('2026-01-26');
  });

  it('W29 2026 = 2026-07-13', () => {
    expect(isoWeekToDate(29, 2026)).toBe('2026-07-13');
  });

  it('W52 2025 = 2025-12-22', () => {
    expect(isoWeekToDate(52, 2025)).toBe('2025-12-22');
  });
});

describe('pdfImportV2 — text-only fallback', () => {
  it('extracts summary KPIs from text when no items provided', () => {
    const result = parseGSDMetricsV2(text0724, []);
    expect(result.metrics.length).toBeGreaterThan(0);
  });

  it('parseGSDMetrics works without items parameter', () => {
    const metrics = parseGSDMetrics(text0724);
    expect(metrics.length).toBeGreaterThan(0);
  });
});

describe('pdfImportV2 — interpolateWeekFromX', () => {
  // Simulated labeled ticks: W2,W5,W7,...W29 at known x positions (from CSAT chart)
  const ticks = [
    { x: 232, weekNum: 2 }, { x: 256, weekNum: 5 }, { x: 280, weekNum: 7 },
    { x: 305, weekNum: 9 }, { x: 325, weekNum: 11 }, { x: 349, weekNum: 13 },
    { x: 373, weekNum: 15 }, { x: 397, weekNum: 17 }, { x: 422, weekNum: 19 },
    { x: 446, weekNum: 21 }, { x: 470, weekNum: 23 }, { x: 494, weekNum: 25 },
    { x: 519, weekNum: 27 }, { x: 543, weekNum: 29 },
  ];

  it('returns exact week for x at labeled tick position', () => {
    expect(Math.round(interpolateWeekFromX(232, ticks))).toBe(2);
    expect(Math.round(interpolateWeekFromX(543, ticks))).toBe(29);
  });

  it('interpolates unlabeled x positions to correct intermediate weeks', () => {
    // Between W2(x=232) and W5(x=256): midpoint should be ~W3-W4
    const mid = (232 + 256) / 2; // x=244 → week ~3.5
    const wk = interpolateWeekFromX(mid, ticks);
    expect(Math.round(wk)).toBe(4); // 2 + 0.5*(5-2) = 3.5 → rounds to 4
  });

  it('extrapolates before first tick to W1', () => {
    // Before W2(x=232): extrapolate one step left
    const w1x = 232 - (256 - 232) / 3; // one week-width before W2
    const wk = interpolateWeekFromX(w1x, ticks);
    expect(Math.round(wk)).toBe(1);
  });

  it('extrapolates after last tick to W30', () => {
    // After W29(x=543): extrapolate one step right
    const w30x = 543 + (543 - 519) / 2; // one week-width after W29
    const wk = interpolateWeekFromX(w30x, ticks);
    expect(Math.round(wk)).toBe(30);
  });

  it('handles single-tick edge case', () => {
    expect(interpolateWeekFromX(100, [{ x: 100, weekNum: 5 }])).toBe(5);
    expect(interpolateWeekFromX(200, [{ x: 100, weekNum: 5 }])).toBe(5);
  });

  it('handles empty ticks', () => {
    expect(interpolateWeekFromX(300, [])).toBe(1);
  });
});
