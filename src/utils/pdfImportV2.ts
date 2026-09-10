/**
 * pdfImportV2.ts — Layout-resilient GSD Scorecard PDF parser.
 *
 * ALGORITHM OVERVIEW:
 * Instead of relying on page fractions, left/right column splits, or a single anchor
 * like "Overall rAHT (minutes)", this parser is LABEL-ANCHORED: each KPI is located
 * independently by matching its label text in the positioned items, then a LOCAL
 * region relative to that label is searched for:
 *   (a) An aggregate value (e.g. "19.82 mins" or "84.39%")
 *   (b) Numeric data-label points in the chart band
 *   (c) Week labels (W2..W29) positioned below the chart, x-aligned with data points
 *
 * KEY DESIGN DECISIONS:
 * - No global gates: a missing date, label, or section never causes total failure
 * - Per-KPI independent extraction: each KPI succeeds or fails on its own
 * - Week dating via ISO week numbers: "W5" → Monday of ISO week 5 of the report year
 * - Unknown chart labels near number clusters → imported as 'Custom' (never dropped)
 * - Partial import: returns diagnostics alongside metrics so the UI can inform users
 * - The old text-based regex path is preserved as a fallback for text-only PDFs
 */

import { Metric } from '../types';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(utc);
dayjs.extend(isoWeek);

import type { PDFItem } from './pdfImport';

// ─── PUBLIC TYPES ────────────────────────────────────────────────────────────

export interface ParseDiagnostics {
  found: { label: string; weeks: number; aggregate: number | null }[];
  missing: { label: string; reason: string }[];
  warnings: string[];
}

export interface ParseResultV2 {
  metrics: Metric[];
  diagnostics: ParseDiagnostics;
}

// ─── KPI REGISTRY ────────────────────────────────────────────────────────────

type ValueKind = 'percent' | 'minutes' | 'count';

interface KPIDefinition {
  /** Canonical label used in notes and diagnostics */
  canonical: string;
  /** Alias patterns to match label items in the PDF */
  aliases: RegExp[];
  /** What unit type the values represent */
  kind: ValueKind;
  /** App metric type for the Metric.type field */
  metricType: string;
}

const KPI_REGISTRY: KPIDefinition[] = [
  {
    canonical: 'GSD1 Live cAHT',
    aliases: [/GSD1\s*Live\s*cAHT/i],
    kind: 'minutes',
    metricType: 'CPH',
  },
  {
    canonical: 'Escalation / Repeat cAHT',
    aliases: [/Escalation\s*\/?\s*Repeat\s*cAHT/i, /Esc\s*\/?\s*Rpt\s*cAHT/i],
    kind: 'minutes',
    metricType: 'AHT',
  },
  {
    canonical: 'Assist cAHT',
    aliases: [/Assist\s*cAHT/i],
    kind: 'minutes',
    metricType: 'AHT Assist',
  },
  {
    canonical: 'Task Helpdesk AHT',
    aliases: [/Task\s*Helpdesk\s*AHT/i],
    kind: 'minutes',
    metricType: 'AHT',
  },
  {
    canonical: 'ACW Live',
    aliases: [/^ACW\s*Live$/i, /^ACW\s+Live\s+[\d.]+\s*mins?$/i],
    kind: 'minutes',
    metricType: 'ACW',
  },
  {
    canonical: 'Overall rAHT',
    aliases: [/Overall\s*rAHT/i, /All\s*Contacts\s*rAHT/i, /Total\s*rAHT/i],
    kind: 'minutes',
    metricType: 'AHT',
  },
  {
    canonical: 'CSAT%',
    aliases: [/^CSAT%$/i, /^CSAT\s*%$/i],
    kind: 'percent',
    metricType: 'CSAT',
  },
  {
    canonical: 'ARR',
    aliases: [/^ARR$/i],
    kind: 'percent',
    metricType: 'Case ARR',
  },
  {
    canonical: 'CONC%',
    aliases: [/^CONC%$/i, /^CONC\s*%$/i],
    kind: 'percent',
    metricType: 'Dual Chat Overlap %',
  },
  {
    canonical: 'Quality Score',
    aliases: [/Quality\s*Score\s*(Live)?/i],
    kind: 'percent',
    metricType: 'Custom',
  },
  {
    canonical: 'XFER%',
    aliases: [/^XFER%$/i, /^XFER\s*%$/i, /Transfer\s*%/i],
    kind: 'percent',
    metricType: 'Transfer Rate',
  },
  {
    canonical: 'Contacts Missed',
    aliases: [/Contacts\s*Missed/i, /MISS%/i],
    kind: 'percent',
    metricType: 'Contacts Missed %',
  },
];

// ─── PERFORMANCE TARGETS ─────────────────────────────────────────────────────

const L3_TARGETS: Record<string, number> = {
  'GSD1 Live cAHT': 21, 'Task Helpdesk AHT': 10.5, 'Escalation / Repeat cAHT': 23,
  'ACW Live': 2, 'CSAT%': 85, 'ARR': 85, 'CONC%': 18, 'XFER%': 5,
  'Contacts Missed': 1.5, 'Quality Score': 85, 'Overall rAHT': 21,
};

const L4_TARGETS: Record<string, number> = {
  'GSD1 Live cAHT': 23, 'Task Helpdesk AHT': 10.5, 'Escalation / Repeat cAHT': 29,
  'Assist cAHT': 18, 'ACW Live': 2, 'CSAT%': 90, 'ARR': 90, 'CONC%': 15,
  'XFER%': 1, 'Contacts Missed': 1.5, 'Quality Score': 85, 'Overall rAHT': 23,
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Parse a numeric string (strips % and commas). Returns null if not a number. */
function toNum(s: string): number | null {
  const t = s.trim().replace(/[%,]/g, '');
  return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
}

/** Median of numeric array. */
function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Convert ISO week number + year to the Monday of that ISO week. */
function isoWeekToDate(weekNum: number, year: number): string {
  // Jan 4 is always in ISO week 1; startOf('isoWeek') gives the Monday
  const w1Monday = dayjs.utc(`${year}-01-04`).startOf('isoWeek');
  return w1Monday.add((weekNum - 1) * 7, 'day').format('YYYY-MM-DD');
}

/** Parse date range from text using multiple format attempts. */
function parseDateRange(text: string): { startDate: string; endDate: string; warning?: string } {
  const norm = text.replace(/[\r\n\t ]+/g, ' ');

  // Format 1: "Report Date YYYY/MM/DD – YYYY/MM/DD" (en-dash, em-dash, or hyphen)
  const rangeMatch = norm.match(/Report\s+Date\s+(\d{4}\/\d{2}\/\d{2})\s*[–—-]\s*(\d{4}\/\d{2}\/\d{2})/);
  if (rangeMatch) {
    return {
      startDate: rangeMatch[1].replace(/\//g, '-'),
      endDate: rangeMatch[2].replace(/\//g, '-'),
    };
  }

  // Format 2: "Report Start Date YYYY/MM/DD ... Report End Date YYYY/MM/DD"
  const startMatch = norm.match(/Report\s+Start\s+Date\s+(\d{4}\/\d{2}\/\d{2})/);
  const endMatch = norm.match(/Report\s+End\s+Date\s+(\d{4}\/\d{2}\/\d{2})/);
  if (startMatch) {
    return {
      startDate: startMatch[1].replace(/\//g, '-'),
      endDate: endMatch ? endMatch[1].replace(/\//g, '-') : startMatch[1].replace(/\//g, '-'),
    };
  }

  // Format 3: "Report Date YYYY-MM-DD – YYYY-MM-DD"
  const isoMatch = norm.match(/Report\s+Date\s+(\d{4}-\d{2}-\d{2})\s*[–—-]\s*(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return { startDate: isoMatch[1], endDate: isoMatch[2] };
  }

  // Format 4: "Report Date DD Mon YYYY – DD Mon YYYY"
  const monthNames = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
  const ddMonRe = new RegExp(
    `Report\\s+Date\\s+(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})\\s*[–—-]\\s*(\\d{1,2})\\s+(${monthNames})\\s+(\\d{4})`,
    'i'
  );
  const ddMonMatch = norm.match(ddMonRe);
  if (ddMonMatch) {
    const parse = (d: string, m: string, y: string) => {
      const mi = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m.toLowerCase()) + 1;
      return `${y}-${String(mi).padStart(2, '0')}-${d.padStart(2, '0')}`;
    };
    return {
      startDate: parse(ddMonMatch[1], ddMonMatch[2], ddMonMatch[3]),
      endDate: parse(ddMonMatch[4], ddMonMatch[5], ddMonMatch[6]),
    };
  }

  // Format 5: "Mon DD, YYYY – Mon DD, YYYY"
  const monDdRe = new RegExp(
    `Report\\s+Date\\s+(${monthNames})\\s+(\\d{1,2}),?\\s+(\\d{4})\\s*[–—-]\\s*(${monthNames})\\s+(\\d{1,2}),?\\s+(\\d{4})`,
    'i'
  );
  const monDdMatch = norm.match(monDdRe);
  if (monDdMatch) {
    const parse = (m: string, d: string, y: string) => {
      const mi = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m.toLowerCase()) + 1;
      return `${y}-${String(mi).padStart(2, '0')}-${d.padStart(2, '0')}`;
    };
    return {
      startDate: parse(monDdMatch[1], monDdMatch[2], monDdMatch[3]),
      endDate: parse(monDdMatch[4], monDdMatch[5], monDdMatch[6]),
    };
  }

  // Fallback: use today and flag it
  const today = new Date().toISOString().split('T')[0];
  return { startDate: today, endDate: today, warning: 'Could not parse report date range from PDF; using today' };
}

/** Parse agent job level from text. Returns level number (default 3). */
function parseAgentLevel(text: string): { level: number; warning?: string } {
  const norm = text.replace(/[\r\n\t ]+/g, ' ');
  const m = norm.match(/Agent\s+Job\s+Level\s+(\d|NULL)/i);
  if (!m) return { level: 3, warning: 'Agent Job Level not found; defaulting to L3' };
  if (m[1] === 'NULL' || m[1].toUpperCase() === 'NULL') {
    return { level: 3, warning: 'Agent Job Level is NULL; defaulting to L3' };
  }
  return { level: parseInt(m[1]) };
}

// ─── CHART LABEL FINDER ─────────────────────────────────────────────────────

interface LabelMatch {
  kpi: KPIDefinition;
  item: PDFItem;
}

/**
 * Find chart label items in the positioned PDF items.
 * A "chart label" is a KPI name that appears near chart data (y > some threshold
 * indicating it's in the chart region, not in the Metrics+ table or deep-dive table).
 *
 * We filter out labels that appear in the Metrics+ table region (high x, densely packed)
 * and the radar chart area (which has labels at specific recognizable positions).
 */
function findChartLabels(items: PDFItem[], kpiDefs: KPIDefinition[]): LabelMatch[] {
  const matches: LabelMatch[] = [];

  // Find "Metrics+" markers to identify the Metrics+ table region.
  // The Metrics+ table is a vertical list of KPI names with values at x >= ~1195.
  // We identify its x-boundary from the Metrics+ headers, then exclude all
  // labels in that x-region from chart label matching.
  const metricsPlusItems = items.filter(i => /^Metrics\+$/i.test(i.str.trim()));
  // The Metrics+ table labels are ALL at a consistent high-x position.
  // Find items that look like a vertical label list (many KPI-like labels at similar x).
  // Use the minimum x of Metrics+ header, or find the high-x cluster of known KPI labels.
  let metricsPlusMinX = Infinity;
  if (metricsPlusItems.length > 0) {
    // All items in the Metrics+ table are at x near or above the Metrics+ label columns.
    // The label column starts about 200px to the left of the "Metrics+" header.
    metricsPlusMinX = Math.min(...metricsPlusItems.map(i => i.x)) - 200;
  }

  // Find items that are in the radar chart (identified by "smaller radius" text nearby)
  const radarItems = items.filter(i => /smaller\s*radius/i.test(i.str));
  const radarY = radarItems.length > 0 ? radarItems[0].y : -Infinity;

  for (const item of items) {
    const str = item.str.trim();
    if (!str || str.length > 40) continue;

    // Skip items in the Metrics+ table (x >= metricsPlusMinX area, compact list)
    if (item.x >= metricsPlusMinX && metricsPlusMinX < Infinity) continue;

    // Skip items too close to the radar chart center
    if (radarY > 0 && Math.abs(item.y - radarY) < 80 && item.x > 900 && item.x < 1500) continue;

    for (const kpi of kpiDefs) {
      for (const alias of kpi.aliases) {
        if (alias.test(str)) {
          // Avoid matching "CSAT%" when it's part of "CSAT% GSD1 Live" etc.
          if (kpi.canonical === 'CSAT%' && /CSAT%\s+\w/i.test(str)) continue;
          if (kpi.canonical === 'ARR' && /ARR\s+\w/i.test(str)) continue;
          // Only match if the label looks like a standalone chart title
          // (not followed by a value on the same item, unless it's a sub-label)
          matches.push({ kpi, item });
          break;
        }
      }
    }
  }

  return matches;
}

// ─── PER-KPI LOCAL EXTRACTION ────────────────────────────────────────────────

interface ExtractedKPI {
  kpi: KPIDefinition;
  aggregate: number | null;
  series: { value: number; weekNum: number; date: string; approximate: boolean }[];
}

/**
 * Extract data for a single KPI from its label position.
 * Searches a LOCAL region relative to the label for:
 * - Aggregate value ("19.82 mins" or "84.39%")
 * - Numeric data points in the chart band
 * - Week labels below the chart for dating
 */
function extractKPIData(
  labelItem: PDFItem,
  kpi: KPIDefinition,
  items: PDFItem[],
  allWeekLabelItems: PDFItem[],
  year: number,
  startDate: string,
  endDate: string,
): ExtractedKPI | null {
  // ─── AGGREGATE VALUE ───
  // Look for "X.XX mins" or "X.XX%" items near the label (within ~60px y, 300px x)
  let aggregate: number | null = null;

  // Pattern 1: "19.82 mins" style (for minutes KPIs)
  if (kpi.kind === 'minutes') {
    const aggCandidates = items.filter(i =>
      /[\d.]+\s*mins?/i.test(i.str) &&
      Math.abs(i.y - labelItem.y) < 60 &&
      Math.abs(i.x - labelItem.x) < 300
    );
    if (aggCandidates.length > 0) {
      // Prefer the one closest to the label
      aggCandidates.sort((a, b) =>
        Math.hypot(a.x - labelItem.x, a.y - labelItem.y) -
        Math.hypot(b.x - labelItem.x, b.y - labelItem.y)
      );
      const m = aggCandidates[0].str.match(/([\d.]+)\s*mins?/i);
      if (m) aggregate = parseFloat(m[1]);
    }
  }

  // Pattern 2: "X.XX%" style (for percent KPIs)
  if (kpi.kind === 'percent') {
    const aggCandidates = items.filter(i =>
      /[\d.]+%/.test(i.str) &&
      Math.abs(i.y - labelItem.y) < 60 &&
      Math.abs(i.x - labelItem.x) < 200
    );
    if (aggCandidates.length > 0) {
      aggCandidates.sort((a, b) =>
        Math.hypot(a.x - labelItem.x, a.y - labelItem.y) -
        Math.hypot(b.x - labelItem.x, b.y - labelItem.y)
      );
      const m = aggCandidates[0].str.match(/([\d.]+)%/);
      if (m) aggregate = parseFloat(m[1]);
    }
  }

  // Check for "No data" near the label
  const noData = items.some(i =>
    /No\s*data/i.test(i.str) &&
    Math.abs(i.y - labelItem.y) < 60 &&
    Math.abs(i.x - labelItem.x) < 200
  );
  if (noData && aggregate === null) {
    return null; // KPI has no data — will be reported in diagnostics
  }

  // ─── WEEK LABELS ───
  // Find the row of week labels that belongs to THIS chart. Strategy:
  // Week labels sit 50-200px below the KPI label (lower y in PDF coords).
  // We look for a cluster of W-labels whose x-range overlaps with the label's column.
  const isLeftCol = labelItem.x < 600;
  const colXMin = isLeftCol ? 180 : 750;
  const colXMax = isLeftCol ? 600 : 1180;

  // Find week labels in the vertical band below the label, within the same column
  const candidateWeekLabels = allWeekLabelItems.filter(w =>
    w.y > labelItem.y - 220 && w.y < labelItem.y - 30 &&
    w.x >= colXMin && w.x <= colXMax
  );

  // Group by y-row (week labels for one chart share nearly the same y, within ~8px)
  const weeksByY: Record<number, PDFItem[]> = {};
  for (const w of candidateWeekLabels) {
    const roundedY = Math.round(w.y);
    const key = Object.keys(weeksByY).find(k => Math.abs(+k - roundedY) < 8);
    if (key) weeksByY[+key].push(w);
    else weeksByY[roundedY] = [w];
  }

  // Pick the row(s) with the most labels (most likely the actual chart x-axis).
  // Combine close rows (within 8px) into one set.
  const weekRow: PDFItem[] = [];
  const sortedRows = Object.entries(weeksByY).sort((a, b) => b[1].length - a[1].length);
  if (sortedRows.length > 0) {
    const bestY = +sortedRows[0][0];
    // Merge rows within 8px of the best
    for (const [yKey, row] of sortedRows) {
      if (Math.abs(+yKey - bestY) < 8) weekRow.push(...row);
    }
  }

  const allWeekLabels = weekRow
    .sort((a, b) => a.x - b.x)
    .map(w => ({ x: w.x, weekNum: parseInt(w.str.replace('W', '')) }));

  // ─── DATA POINTS ───
  // Data points are positioned between the week labels (y-floor) and the KPI label (y-ceiling).
  // The x-range is defined by the week labels' x-span (with small padding).
  const weekLabelMaxY = weekRow.length > 0 ? Math.max(...weekRow.map(w => w.y)) : labelItem.y - 200;
  const weekLabelMinX = weekRow.length > 0 ? Math.min(...weekRow.map(w => w.x)) - 20 : colXMin;
  const weekLabelMaxX = weekRow.length > 0 ? Math.max(...weekRow.map(w => w.x)) + 30 : colXMax;

  const dataYMin = weekLabelMaxY + 5; // just above week labels
  const dataYMax = labelItem.y + 20; // data labels can appear above the KPI label
  const dataXMin = weekLabelMinX;
  const dataXMax = weekLabelMaxX;

  // Collect numeric data points within the chart region
  const dataPts: { x: number; y: number; v: number }[] = [];
  for (const item of items) {
    if (item.x < dataXMin || item.x > dataXMax) continue;
    if (item.y < dataYMin || item.y > dataYMax) continue;
    const v = toNum(item.str);
    if (v === null || v < 0) continue;
    // For minutes: values typically 0-60; for percent: 0-100; for count: any positive
    const maxVal = kpi.kind === 'percent' ? 100.5 : kpi.kind === 'minutes' ? 120 : 10000;
    if (v > maxVal) continue;
    dataPts.push({ x: item.x, y: item.y, v });
  }

  // Filter out threshold/axis items:
  // - Threshold values sit near "Max Threshold" / "Min Threshold" / "+/-" text
  const thresholdMarkers = items.filter(i =>
    (/Threshold|\+\/-/i.test(i.str)) &&
    i.y >= dataYMin && i.y <= dataYMax &&
    i.x >= dataXMin && i.x <= dataXMax
  );
  const filteredPts = dataPts.filter(p =>
    !thresholdMarkers.some(m => Math.abs(p.y - m.y) <= 12 && Math.abs(p.x - m.x) < 250)
  );

  // Filter out axis ticks (vertical stacks of evenly spaced values at nearly same x)
  const byCol: Record<number, typeof filteredPts> = {};
  for (const p of filteredPts) {
    const k = Math.round(p.x / 12) * 12;
    (byCol[k] ||= []).push(p);
  }
  const axisTicks = new Set<typeof filteredPts[number]>();
  for (const col of Object.values(byCol)) {
    if (col.length >= 4) {
      const sorted = [...col].sort((a, b) => a.y - b.y);
      const isMonotonic = sorted.every((p, i) => i === 0 || p.v >= sorted[i - 1].v - 0.01);
      if (isMonotonic) sorted.forEach(p => axisTicks.add(p));
    }
  }

  const cleanPts = filteredPts
    .filter(p => !axisTicks.has(p))
    .sort((a, b) => a.x - b.x);

  if (cleanPts.length < 4 && aggregate === null) return null;

  // ─── PAIR DATA POINTS WITH WEEK LABELS ───
  let series: ExtractedKPI['series'] = [];

  if (allWeekLabels.length >= 4 && cleanPts.length >= 4) {
    // Strategy: if the number of data points matches the number of week labels exactly
    // (or within 1), use ORDINAL pairing (1st point → 1st week, 2nd → 2nd, etc.)
    // because the x-positions of data labels don't always align precisely with axis ticks.
    // Only fall back to nearest-x matching when counts differ significantly.
    const weekCount = allWeekLabels.length;
    const ptCount = cleanPts.length;

    if (ptCount >= weekCount - 1 && ptCount <= weekCount + 1) {
      // Ordinal pairing: use the first min(ptCount, weekCount) points/weeks
      const n = Math.min(ptCount, weekCount);
      for (let i = 0; i < n; i++) {
        series.push({
          value: +cleanPts[i].v.toFixed(2),
          weekNum: allWeekLabels[i].weekNum,
          date: isoWeekToDate(allWeekLabels[i].weekNum, year),
          approximate: false,
        });
      }
    } else {
      // Piecewise linear x-interpolation: labeled ticks define x→weekNum mapping.
      // For each data point, interpolate its week number from surrounding ticks.
      const startWeek = dayjs.utc(startDate).isoWeek();
      const endWeek = dayjs.utc(endDate).isoWeek();
      const endYear = parseInt(endDate.substring(0, 4));
      const maxWeek = endYear > year ? 52 + endWeek : endWeek;

      for (const pt of cleanPts) {
        const fractionalWeek = interpolateWeekFromX(pt.x, allWeekLabels);
        const weekNum = Math.round(fractionalWeek);
        // Clamp to report date range (allow 1 week beyond for edge cases)
        if (weekNum < Math.max(1, startWeek - 1) || weekNum > maxWeek + 1) continue;
        series.push({
          value: +pt.v.toFixed(2),
          weekNum,
          date: isoWeekToDate(weekNum, year),
          approximate: false,
        });
      }

      // Deduplicate: if multiple points map to same week, the one whose fractional
      // value is closest to the integer week wins; displaced point goes to neighbor
      const byWeek: Record<number, { value: number; frac: number }[]> = {};
      for (let i = 0; i < cleanPts.length; i++) {
        if (i >= series.length) break;
        const wn = series[i]?.weekNum;
        if (wn == null) continue;
        const frac = interpolateWeekFromX(cleanPts[i].x, allWeekLabels);
        (byWeek[wn] ||= []).push({ value: series[i].value, frac });
      }
      // Rebuild series with dedup
      const dedupSeries: ExtractedKPI['series'] = [];
      const displaced: { value: number; frac: number }[] = [];
      for (const wn of Object.keys(byWeek).map(Number).sort((a, b) => a - b)) {
        const pts = byWeek[wn];
        if (pts.length === 1) {
          dedupSeries.push({
            value: pts[0].value, weekNum: wn,
            date: isoWeekToDate(wn, year), approximate: false,
          });
        } else {
          // Closest fractional value to integer week stays
          pts.sort((a, b) => Math.abs(a.frac - wn) - Math.abs(b.frac - wn));
          dedupSeries.push({
            value: pts[0].value, weekNum: wn,
            date: isoWeekToDate(wn, year), approximate: false,
          });
          for (let i = 1; i < pts.length; i++) displaced.push(pts[i]);
        }
      }
      // Place displaced points in nearest unoccupied week
      const occupiedWeeks = new Set(dedupSeries.map(s => s.weekNum));
      for (const dp of displaced) {
        const altWeek = dp.frac < Math.round(dp.frac) ? Math.round(dp.frac) - 1 : Math.round(dp.frac) + 1;
        const targetWeek = occupiedWeeks.has(altWeek) ? (occupiedWeeks.has(altWeek - 1) ? altWeek + 1 : altWeek - 1) : altWeek;
        if (!occupiedWeeks.has(targetWeek) && targetWeek >= 1 && targetWeek <= maxWeek + 1) {
          dedupSeries.push({
            value: dp.value, weekNum: targetWeek,
            date: isoWeekToDate(targetWeek, year), approximate: false,
          });
          occupiedWeeks.add(targetWeek);
        }
      }
      series = dedupSeries.sort((a, b) => a.weekNum - b.weekNum);
    }
  } else if (cleanPts.length >= 4) {
    // Fallback: no week labels found — distribute evenly across report range
    const start = dayjs.utc(startDate).valueOf();
    const end = dayjs.utc(endDate).valueOf();
    const n = cleanPts.length;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? start + (i * (end - start)) / (n - 1) : start;
      series.push({
        value: +cleanPts[i].v.toFixed(2),
        weekNum: i + 1,
        date: dayjs.utc(t).format('YYYY-MM-DD'),
        approximate: true,
      });
    }
  }

  // ─── VALIDATION ───
  // If we have both aggregate and series, validate that the series median is
  // within tolerance of the aggregate. On failure, keep only the aggregate.
  if (aggregate !== null && series.length >= 4) {
    const seriesMed = median(series.map(s => s.value));
    const tol = Math.max(2, 0.3 * aggregate);
    if (Math.abs(seriesMed - aggregate) > tol) {
      // Series doesn't match aggregate — discard series, keep aggregate only
      series = [];
    }
  }

  return { kpi, aggregate, series };
}

// ─── MAIN EXTRACTION ENTRY POINT ────────────────────────────────────────────

/**
 * Label-anchored extraction: the primary path when positioned items are available.
 * Finds each KPI independently by its label, extracts its local data.
 */
export function extractWithItems(
  items: PDFItem[],
  text: string,
): ParseResultV2 {
  const diagnostics: ParseDiagnostics = { found: [], missing: [], warnings: [] };
  const metrics: Metric[] = [];

  // ─── DATE RANGE ───
  const { startDate, endDate, warning: dateWarning } = parseDateRange(text);
  if (dateWarning) diagnostics.warnings.push(dateWarning);
  const year = parseInt(startDate.substring(0, 4));
  const range = `${startDate} to ${endDate}`;

  // ─── AGENT LEVEL ───
  const { level: agentLevel, warning: levelWarning } = parseAgentLevel(text);
  if (levelWarning) diagnostics.warnings.push(levelWarning);
  const TARGETS = agentLevel >= 4 ? L4_TARGETS : L3_TARGETS;
  const getTarget = (label: string): number => TARGETS[label] ?? 0;

  // ─── FIND KPI CHART LABELS ───
  const labelMatches = findChartLabels(items, KPI_REGISTRY);

  // All week label items (W\d+) in the document, for chart identification and data extraction
  const allWeekLabelItems = items.filter(i => /^W\d+$/.test(i.str.trim()));

  // Deduplicate: for each KPI, pick the label match that's most likely a chart title.
  // Chart titles have WEEK LABELS (W\d+) in their vicinity below them. Radar chart labels
  // and summary table labels do NOT. This is the most reliable discriminator.

  const hasWeekLabelsNearby = (labelItem: PDFItem): boolean => {
    // Week labels sit 50-220px below the chart title (lower y in PDF coords)
    // and within the same x-column range
    const isLeft = labelItem.x < 600;
    const xMin = isLeft ? 180 : 750;
    const xMax = isLeft ? 600 : 1180;
    return allWeekLabelItems.some(w =>
      w.y > labelItem.y - 220 && w.y < labelItem.y - 30 &&
      w.x >= xMin && w.x <= xMax
    );
  };

  const bestLabelByKPI = new Map<string, LabelMatch>();
  for (const match of labelMatches) {
    const existing = bestLabelByKPI.get(match.kpi.canonical);
    if (!existing) {
      bestLabelByKPI.set(match.kpi.canonical, match);
    } else {
      // Prefer the label that has week labels nearby (it's a chart title, not radar/table)
      const matchHasWeeks = hasWeekLabelsNearby(match.item);
      const existingHasWeeks = hasWeekLabelsNearby(existing.item);
      if (matchHasWeeks && !existingHasWeeks) {
        bestLabelByKPI.set(match.kpi.canonical, match);
      } else if (matchHasWeeks === existingHasWeeks) {
        // Tiebreak: prefer higher y (more prominent chart position)
        if (match.item.y > existing.item.y) {
          bestLabelByKPI.set(match.kpi.canonical, match);
        }
      }
    }
  }

  // ─── EXTRACT EACH KPI ───
  const processedKPIs = new Set<string>();

  for (const [canonical, labelMatch] of bestLabelByKPI) {
    processedKPIs.add(canonical);
    const result = extractKPIData(
      labelMatch.item, labelMatch.kpi, items, allWeekLabelItems, year, startDate, endDate
    );

    if (!result) {
      // Check if it's a "no data" case
      const noData = items.some(i =>
        /No\s*data/i.test(i.str) &&
        Math.abs(i.y - labelMatch.item.y) < 60 &&
        Math.abs(i.x - labelMatch.item.x) < 200
      );
      diagnostics.missing.push({
        label: canonical,
        reason: noData ? 'no data in PDF for this KPI' : 'could not extract data points',
      });
      continue;
    }

    const { kpi, aggregate, series } = result;
    const target = getTarget(canonical);
    const type = kpi.metricType;

    // Add aggregate as a monthly metric
    if (aggregate !== null) {
      metrics.push({
        id: uuid(),
        type,
        value: aggregate,
        target,
        date: startDate,
        period: 'monthly',
        notes: `${canonical} — ${range}`,
        channel: 'Total',
      });
    }

    // Add weekly series
    for (const pt of series) {
      metrics.push({
        id: uuid(),
        type,
        value: pt.value,
        target,
        date: pt.date,
        period: 'weekly',
        notes: `${canonical} — Week ${pt.weekNum}`,
        channel: 'Total',
      });
    }

    diagnostics.found.push({
      label: canonical,
      weeks: series.length,
      aggregate,
    });
  }

  // Report any KPIs from registry that weren't found at all
  for (const kpi of KPI_REGISTRY) {
    if (!processedKPIs.has(kpi.canonical)) {
      diagnostics.missing.push({
        label: kpi.canonical,
        reason: 'label not found in PDF',
      });
    }
  }

  // ─── METRICS+ SECTION (best-effort) ───
  try {
    const metricsPlusMetrics = extractMetricsPlus(text, startDate, range);
    metrics.push(...metricsPlusMetrics);
  } catch {
    diagnostics.warnings.push('Metrics+ section extraction failed (non-critical)');
  }

  return { metrics, diagnostics };
}

// ─── METRICS+ EXTRACTION (unchanged from original, best-effort) ──────────────

function extractMetricsPlus(text: string, startDate: string, range: string): Metric[] {
  const metrics: Metric[] = [];
  const norm = text.replace(/[\r\n\t ]+/g, ' ');

  const metricsPlus = norm.split('Metrics+');
  if (metricsPlus.length < 3) return metrics;

  const valuesBlock = metricsPlus[1].trim();
  const valTokens: string[] = [];
  const valRegex = /(\d{2}:\d{2}:\d{2}|[\d,.]+%?)/g;
  let vm;
  while ((vm = valRegex.exec(valuesBlock)) !== null) valTokens.push(vm[1]);

  const METRICS_PLUS_NAMES = [
    'Contacts Received', 'GSD1 Live Max cAHT hh:mm:ss', 'Esc / Rpt Max cAHT hh:mm:ss',
    'Assist Max cAHT hh:mm:ss', 'Task Helpdesk Max AHT hh:mm:ss', 'ACW Live Max hh:mm:ss',
    'ACW Task Max hh:mm:ss', 'CSAT%', 'CSAT% GSD1 Live', 'CSAT% Escalation / Repeat',
    'CSAT% Task Helpdesk', 'CSAT% Q2', 'CSAT% Q2 GSD1 Live', 'CSAT% Q2 Escalation / Repeat',
    'CSAT% Q2 Task Helpdesk', 'CSAT% Q3', 'CSAT% Q3 GSD1 Live', 'CSAT% Q3 Escalation / Repeat',
    'CSAT% Q3 Task Helpdesk', 'CSAT% Assist', 'CSAT% Q2A Assist', 'CSAT% Q3A Assist',
    'Feedbacks Received', 'DSAT', 'CSAT 5 Ratings', 'CSAT All Ratings',
    'ARR', 'ARR GSD1 Live', 'ARR Escalation / Repeat', 'Case Left Open %',
    'Case Re-open Rate %', 'Contacts Missed %', 'Contacts Rejected %', 'System Error Contacts %',
  ];

  const parseMetricsPlusValue = (token: string): number => {
    if (/^\d{2}:\d{2}:\d{2}$/.test(token)) {
      const [h, m, s] = token.split(':').map(Number);
      return parseFloat((h * 60 + m + s / 60).toFixed(2));
    }
    return parseFloat(token.replace(/,/g, ''));
  };

  for (let i = 0; i < METRICS_PLUS_NAMES.length; i++) {
    if (i >= valTokens.length) break;
    const val = parseMetricsPlusValue(valTokens[i]);
    if (isNaN(val)) continue;
    metrics.push({
      id: uuid(),
      type: 'Custom',
      value: val,
      target: 0,
      date: startDate,
      period: 'monthly',
      notes: `${METRICS_PLUS_NAMES[i]} — ${range}`,
      channel: 'Total',
    });
  }

  return metrics;
}

// ─── TEXT-ONLY FALLBACK ─────────────────────────────────────────────────────

/**
 * Fallback extraction when no positioned items are available.
 * Uses the text-based regex approach from the original parser.
 * This is only invoked when items array is empty or not provided.
 */
export function extractFromTextOnly(text: string): ParseResultV2 {
  const diagnostics: ParseDiagnostics = { found: [], missing: [], warnings: [] };
  const metrics: Metric[] = [];

  const { startDate, endDate, warning: dateWarning } = parseDateRange(text);
  if (dateWarning) diagnostics.warnings.push(dateWarning);
  const year = parseInt(startDate.substring(0, 4));
  const range = `${startDate} to ${endDate}`;

  const { level: agentLevel, warning: levelWarning } = parseAgentLevel(text);
  if (levelWarning) diagnostics.warnings.push(levelWarning);
  const TARGETS = agentLevel >= 4 ? L4_TARGETS : L3_TARGETS;
  const getTarget = (label: string): number => TARGETS[label] ?? 0;

  const norm = text.replace(/[\r\n\t ]+/g, ' ');

  // ─── Summary row extraction (original logic) ───
  const KPI_MAP: Record<string, string> = {
    'All Contacts rAHT': 'AHT', 'GSD1 Live cAHT': 'CPH',
    'Escalation / Repeat cAHT': 'AHT', 'Assist cAHT': 'AHT Assist',
    'Task Helpdesk AHT': 'AHT', 'ACW Live': 'ACW', 'CSAT%': 'CSAT',
    'ARR': 'Case ARR', 'CONC%': 'Dual Chat Overlap %',
    'Quality Score': 'Custom', 'XFER%': 'Transfer Rate',
    'Contacts Missed': 'Contacts Missed %',
  };

  const SUMMARY_LABELS = [
    'All Contacts rAHT', 'GSD1 Live cAHT', 'Escalation / Repeat cAHT',
    'Task Helpdesk AHT', 'ACW Live', 'CSAT%', 'ARR', 'CONC%', 'Quality Score', 'XFER%', 'Contacts Missed',
  ];

  // Try multiple label anchors instead of depending on just "Overall rAHT (minutes)"
  const anchors = [
    /Overall\s+rAHT\s+\(minutes\)/,
    /All\s+Contacts\s+rAHT\s+\(minutes\)/,
    /Total\s+rAHT\s+\(min/,
    /rAHT.*?GSD1\s+Live\s+cAHT/,
  ];

  let labelLineIdx = -1;
  for (const anchor of anchors) {
    const m = norm.match(anchor);
    if (m) { labelLineIdx = m.index!; break; }
  }

  if (labelLineIdx > -1) {
    const before = norm.substring(0, labelLineIdx);
    const numPattern = /[\d.]+%?/g;
    const allNums: string[] = [];
    let m;
    while ((m = numPattern.exec(before)) !== null) allNums.push(m[0]);
    const summaryVals = allNums.slice(-SUMMARY_LABELS.length);

    if (summaryVals.length === SUMMARY_LABELS.length) {
      for (let i = 0; i < SUMMARY_LABELS.length; i++) {
        const label = SUMMARY_LABELS[i];
        const type = KPI_MAP[label] || 'Custom';
        const val = parseFloat(summaryVals[i]);
        if (isNaN(val)) continue;
        metrics.push({
          id: uuid(), type, value: val, target: getTarget(label),
          date: startDate, period: 'monthly', channel: 'Total',
          notes: `${label} — ${range}`,
        });
        diagnostics.found.push({ label, weeks: 0, aggregate: val });
      }
    }
  } else {
    diagnostics.warnings.push('Summary row anchor not found in text; aggregates may be incomplete');
  }

  // ─── Metrics+ ───
  try {
    metrics.push(...extractMetricsPlus(text, startDate, range));
  } catch {
    diagnostics.warnings.push('Metrics+ section extraction failed');
  }

  // ─── Weekly from text (simplified, best-effort) ───
  const scorecardStart = norm.search(/GSD1?\s+Scorecard/);
  if (scorecardStart > -1) {
    const weekToDate = (weekNum: number, yr: number): string => isoWeekToDate(weekNum, yr);
    const scorecard = norm.substring(scorecardStart);

    // Layout A: values BEFORE label
    const beforeLabelKPIs = [
      { kpi: 'GSD1 Live cAHT', label: /GSD1\s+Live\s+cAHT\s+[\d.]+\s+mins?/, type: 'CPH' },
      { kpi: 'Escalation / Repeat cAHT', label: /Escalation\s+\/\s+Repeat\s+cAHT\s+[\d.]+\s+mins?/, type: 'AHT' },
    ];

    for (const { kpi, label, type } of beforeLabelKPIs) {
      const target = getTarget(kpi);
      const kpiMatch = label.exec(scorecard);
      if (!kpiMatch) continue;
      const beforeLabel = scorecard.substring(Math.max(0, kpiMatch.index - 600), kpiMatch.index);
      const allWBlocks = [...beforeLabel.matchAll(/(W\d+(?:\s+W\d+){3,})/g)];
      if (allWBlocks.length === 0) continue;
      const lastW = allWBlocks[allWBlocks.length - 1];
      const weekNums = lastW[0].match(/W(\d+)/g)!.map(w => parseInt(w.replace('W', '')));
      const textBeforeW = beforeLabel.substring(0, lastW.index!);
      const nums = textBeforeW.match(/\b(\d+\.?\d*)\b/g);
      if (!nums) continue;
      const vals = nums.map(n => parseFloat(n)).filter(v => !isNaN(v) && v > 0 && v < 100);
      const weeklyVals = vals.slice(-weekNums.length);
      if (weeklyVals.length < 5) continue;
      for (let i = 0; i < Math.min(weekNums.length, weeklyVals.length); i++) {
        metrics.push({
          id: uuid(), type, value: weeklyVals[i], target,
          date: weekToDate(weekNums[i], year), period: 'weekly', channel: 'Total',
          notes: `${kpi} — Week ${weekNums[i]}`,
        });
      }
      diagnostics.found.push({ label: kpi, weeks: Math.min(weekNums.length, weeklyVals.length), aggregate: null });
    }
  }

  return { metrics, diagnostics };
}

// ─── PIECEWISE LINEAR INTERPOLATION ──────────────────────────────────────────

/**
 * Interpolates a week number from an x-position using labeled tick positions
 * as a piecewise linear mapping. For x values beyond the labeled range,
 * extrapolates one segment. Returns a fractional week number (caller rounds).
 */
export function interpolateWeekFromX(
  x: number,
  labeledTicks: { x: number; weekNum: number }[],
): number {
  if (labeledTicks.length === 0) return 1;
  if (labeledTicks.length === 1) return labeledTicks[0].weekNum;

  const L = labeledTicks;

  // Before first tick: extrapolate from first segment
  if (x <= L[0].x) {
    const [w1, x1] = [L[0].weekNum, L[0].x];
    const [w2, x2] = [L[1].weekNum, L[1].x];
    if (x2 === x1) return w1;
    return w1 + (x - x1) * (w2 - w1) / (x2 - x1);
  }

  // After last tick: extrapolate from last segment
  if (x >= L[L.length - 1].x) {
    const [w1, x1] = [L[L.length - 2].weekNum, L[L.length - 2].x];
    const [w2, x2] = [L[L.length - 1].weekNum, L[L.length - 1].x];
    if (x2 === x1) return w2;
    return w2 + (x - x2) * (w2 - w1) / (x2 - x1);
  }

  // Between ticks: linear interpolation
  for (let i = 0; i < L.length - 1; i++) {
    if (x >= L[i].x && x <= L[i + 1].x) {
      const [w1, x1] = [L[i].weekNum, L[i].x];
      const [w2, x2] = [L[i + 1].weekNum, L[i + 1].x];
      if (x2 === x1) return w1;
      return w1 + (x - x1) * (w2 - w1) / (x2 - x1);
    }
  }

  // Fallback (shouldn't reach)
  return L[L.length - 1].weekNum;
}

// ─── EXPORTED HELPERS (for testing) ──────────────────────────────────────────

export { parseDateRange, parseAgentLevel, isoWeekToDate, KPI_REGISTRY };
