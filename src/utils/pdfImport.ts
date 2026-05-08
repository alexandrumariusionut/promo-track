import { Metric } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Parses GSD Scorecard PDF text into Metric objects.
 *
 * The GSD Scorecard PDF contains:
 * - Summary KPI row: 10+ values followed by KPI labels
 * - Weekly trend charts per KPI (W10–W14 etc.)
 * - Thresholds (Max/Min) per KPI
 * - Overall Rating row
 * - Report date range
 */
export function parseGSDMetrics(text: string): Metric[] {
  const metrics: Metric[] = [];

  // Normalize: collapse ALL whitespace (including newlines) into single spaces
  const norm = text.replace(/[\r\n\t ]+/g, ' ');

  // --- Extract date range ---
  const startMatch = norm.match(/Report Start Date\s+(\d{4}\/\d{2}\/\d{2})/);
  const endMatch = norm.match(/Report End Date\s+(\d{4}\/\d{2}\/\d{2})/);
  const startDate = startMatch ? startMatch[1].replace(/\//g, '-') : new Date().toISOString().split('T')[0];
  const endDate = endMatch ? endMatch[1].replace(/\//g, '-') : startDate;
  const year = parseInt(startDate.substring(0, 4));
  const range = `${startDate} to ${endDate}`;

  // --- KPI name → app metric type mapping ---
  const KPI_MAP: Record<string, string> = {
    'All Contacts rAHT': 'AHT',
    'GSD1 Live cAHT': 'CPH',
    'Escalation / Repeat cAHT': 'AHT',
    'Assist cAHT': 'AHT Assist',
    'Task Helpdesk AHT': 'AHT',
    'ACW Live': 'ACW',
    'CSAT%': 'CSAT',
    'ARR': 'Case ARR',
    'CONC%': 'Dual Chat Overlap %',
    'Quality Score': 'Custom',
    'XFER%': 'Transfer Rate',
    'Contacts Missed': 'Contacts Missed %',
  };

  // Summary KPI labels in the order they appear in the PDF (11 values)
  // Note: Assist cAHT is excluded — it shows "No data" and has no numeric value in the summary row
  const SUMMARY_LABELS = [
    'All Contacts rAHT', 'GSD1 Live cAHT', 'Escalation / Repeat cAHT',
    'Task Helpdesk AHT', 'ACW Live', 'CSAT%', 'ARR', 'CONC%', 'Quality Score', 'XFER%', 'Contacts Missed',
  ];

  // --- Performance Expectations by level ---
  // Detect agent level from PDF: "Agent Job Level 3" or "Agent Job Level 4"
  const levelMatch = norm.match(/Agent Job Level\s+(\d)/);
  const agentLevel = levelMatch ? parseInt(levelMatch[1]) : 3;

  const L3_TARGETS: Record<string, number> = {
    'GSD1 Live cAHT': 21, 'Task Helpdesk AHT': 10.5, 'Escalation / Repeat cAHT': 23,
    'ACW Live': 2, 'CSAT%': 85, 'ARR': 85, 'CONC%': 18, 'XFER%': 5,
    'Contacts Missed': 1.5, 'Quality Score': 85, 'All Contacts rAHT': 21,
    // Assist cAHT: NA for L3
  };

  const L4_TARGETS: Record<string, number> = {
    'GSD1 Live cAHT': 23, 'Task Helpdesk AHT': 10.5, 'Escalation / Repeat cAHT': 29,
    'Assist cAHT': 18, 'ACW Live': 2, 'CSAT%': 90, 'ARR': 90, 'CONC%': 15,
    'XFER%': 1, 'Contacts Missed': 1.5, 'Quality Score': 85, 'All Contacts rAHT': 23,
  };

  const TARGETS = agentLevel >= 4 ? L4_TARGETS : L3_TARGETS;

  const getTarget = (kpiLabel: string): number => TARGETS[kpiLabel] ?? 0;

  const add = (type: string, value: number, target: number, date: string, period: Metric['period'], channel: string, notes: string) => {
    metrics.push({ id: uuid(), type, value, target, date, period, notes, channel });
  };

  // --- Extract summary KPI values ---
  // The PDF has a row of values followed by labels like "All Contacts rAHT (minutes) GSD1 Live cAHT (minutes) ..."
  // After normalization, find the label pattern and extract values before it.
  const labelMatch = norm.match(/Overall\s+rAHT\s+\(minutes\)/);
  if (labelMatch) {
    const labelLineIdx = labelMatch.index!;
    const before = norm.substring(0, labelLineIdx);
    const numPattern = /[\d.]+%?/g;
    const allNums: string[] = [];
    let m;
    while ((m = numPattern.exec(before)) !== null) allNums.push(m[0]);

    // The summary values are the last 10 numbers before the label line
    // But they appear twice (once in overview, once in scorecard). Use the last occurrence.
    const summaryVals = allNums.slice(-SUMMARY_LABELS.length);

    if (summaryVals.length === SUMMARY_LABELS.length) {
      for (let i = 0; i < SUMMARY_LABELS.length; i++) {
        const label = SUMMARY_LABELS[i];
        const type = KPI_MAP[label] || 'Custom';
        const val = parseFloat(summaryVals[i]);
        if (isNaN(val)) continue;
        const notes = label === 'All Contacts rAHT' ? `rAHT — ${range}` :
          label.includes('cAHT') || label.includes('AHT') ? `${label} — ${range}` :
          label === 'Quality Score' ? `Quality Score — ${range}` : range;
        add(type, val, getTarget(label), startDate, 'monthly', 'Total', notes);
      }
    }
  }

  // --- Extract ACW Live separately (not in the 10-value summary row) ---
  const acwMatch = norm.match(/ACW\s+Live\s+([\d.]+)\s+mins?/);
  if (acwMatch) {
    add('ACW', parseFloat(acwMatch[1]), getTarget('ACW Live'), startDate, 'monthly', 'Total', `ACW Live — ${range}`);
  }

  // --- Extract weekly trends ---
  // The scorecard has KPI sections with weekly values followed by W-labels (W10...W19).
  // Two text layouts exist:
  //   A) "[values] W10...W19 [threshold] [KPI label]" (GSD1 Live cAHT, Esc/Rpt cAHT)
  //   B) "[KPI label] [threshold] [values] W10...W19" (all others)

  // Helper: convert week number + year to an ISO date (Monday of that week)
  const weekToDate = (weekNum: number, yr: number): string => {
    const jan4 = new Date(yr, 0, 4); // Jan 4 is always in week 1
    const dayOfWeek = jan4.getDay() || 7; // Mon=1..Sun=7
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
    return monday.toISOString().split('T')[0];
  };

  // Find the scorecard section
  const scorecardStart = norm.search(/GSD1?\s+Scorecard/);
  if (scorecardStart > -1) {
    const scorecard = norm.substring(scorecardStart);

    // --- Layout A: values BEFORE label ---
    // Pattern: "[values] W10...W19 [threshold] [KPI label]"
    const beforeLabelKPIs: { kpi: string; label: RegExp }[] = [
      { kpi: 'GSD1 Live cAHT', label: /GSD1\s+Live\s+cAHT\s+[\d.]+\s+mins?/ },
      { kpi: 'Escalation / Repeat cAHT', label: /Escalation\s+\/\s+Repeat\s+cAHT\s+[\d.]+\s+mins?/ },
    ];

    for (const { kpi, label } of beforeLabelKPIs) {
      const type = KPI_MAP[kpi] || 'Custom';
      const target = getTarget(kpi);
      const kpiMatch = label.exec(scorecard);
      if (!kpiMatch) continue;

      // Look before the label for: [values] W10...W19
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
        add(type, weeklyVals[i], target, weekToDate(weekNums[i], year), 'weekly', 'Total', `${kpi} — Week ${weekNums[i]}`);
      }
    }

    // --- Layout B: values AFTER label ---
    // Pattern: "[KPI label] [threshold +/- X] [values] W10...W19"
    const afterLabelKPIs: { kpi: string; label: RegExp; isPercent: boolean }[] = [
      { kpi: 'ACW Live', label: /ACW\s+Live\s+[\d.]+\s+mins?\s+Max/, isPercent: false },
      { kpi: 'Task Helpdesk AHT', label: /Task\s+Helpdesk\s+AHT\s+[\d.]+\s+mins?\s+Max/, isPercent: false },
      { kpi: 'CSAT%', label: /CSAT%\s+[\d.]+%\s+Min/, isPercent: true },
      { kpi: 'ARR', label: /ARR\s+[\d.]+%\s+Min/, isPercent: true },
      { kpi: 'CONC%', label: /CONC%\s+[\d.]+%\s+Min/, isPercent: true },
      { kpi: 'XFER%', label: /XFER%\s+[\d.]+%\s+Min/, isPercent: true },
      { kpi: 'Quality Score', label: /Quality\s+Score\s+[\d.]+%\s+Min/, isPercent: true },
      { kpi: 'Contacts Missed', label: /Contacts\s+Missed\s+[\d.]+%/, isPercent: true },
    ];

    for (const { kpi, label, isPercent } of afterLabelKPIs) {
      const type = KPI_MAP[kpi] || 'Custom';
      const target = getTarget(kpi);
      const kpiMatch = label.exec(scorecard);
      if (!kpiMatch) continue;

      // Search forward from AFTER the label match for W-blocks with valid values
      // Limit range to before the next KPI label to avoid cross-contamination
      const searchStart = kpiMatch.index + kpiMatch[0].length;
      let searchEnd = searchStart + 1500;

      // Find the next KPI label after this one to bound the search
      const nextKPILabels = [/ARR\s+[\d.]+%\s+Min/, /CONC%\s+[\d.]+%/, /XFER%\s+[\d.]+%/, /Quality\s+Score\s+[\d.]+%/, /Contacts\s+Missed\s+[\d.]+%/, /Metrics\+/];
      for (const nextLabel of nextKPILabels) {
        const nextMatch = nextLabel.exec(scorecard.substring(searchStart));
        if (nextMatch && searchStart + nextMatch.index < searchEnd) {
          searchEnd = searchStart + nextMatch.index;
          break;
        }
      }

      const searchRange = scorecard.substring(searchStart, searchEnd);
      const wBlockRe = /(W\d+(?:\s+W\d+){3,})/g;
      let bestVals: number[] = [];
      let bestWeeks: number[] = [];
      let wm;

      while ((wm = wBlockRe.exec(searchRange)) !== null) {
        const weekNums = wm[0].match(/W(\d+)/g)!.map(w => parseInt(w.replace('W', '')));
        const textBeforeW = searchRange.substring(0, wm.index);

        // Extract values after the last "+/-" marker (skips threshold values)
        const thresholdIdx = textBeforeW.lastIndexOf('+/-');
        let searchFrom: string;
        if (thresholdIdx > -1) {
          const afterPM = textBeforeW.substring(thresholdIdx + 3);
          const skipVal = afterPM.match(/^\s*-?[\d.]+%?\s*/);
          searchFrom = skipVal ? afterPM.substring(skipVal[0].length) : afterPM;
        } else {
          searchFrom = textBeforeW;
        }

        let vals: number[] = [];
        if (isPercent) {
          const matches = searchFrom.match(/([\d.]+)%/g);
          if (matches) vals = matches.map(v => parseFloat(v));
        } else {
          const matches = searchFrom.match(/\b(\d+\.?\d*)\b/g);
          if (matches) vals = matches.map(n => parseFloat(n)).filter(v => !isNaN(v) && v > 0 && v < 100);
        }

        if (vals.length >= 5) {
          // When no threshold was found, values start from the beginning — take first N
          // When threshold was found, values are at the end (after threshold noise) — take last N
          bestVals = thresholdIdx > -1 ? vals.slice(-weekNums.length) : vals.slice(0, weekNums.length);
          bestWeeks = weekNums;
          // For CSAT%: keep searching for a later W-block with percentage values
          if (kpi !== 'CSAT%') break;
        }
      }

      if (bestVals.length < 5) continue;
      for (let i = 0; i < Math.min(bestWeeks.length, bestVals.length); i++) {
        add(type, bestVals[i], target, weekToDate(bestWeeks[i], year), 'weekly', 'Total', `${kpi} — Week ${bestWeeks[i]}`);
      }
    }
  }

  // --- Extract Overall Rating ---
  const overallMatch = norm.match(/([\d.]+%)\s+([\d.]+%)\s+([\d.]+%)\s+Overall Rating\s+overall/);
  if (overallMatch) {
    add('Custom', parseFloat(overallMatch[1]), 0, startDate, 'monthly', 'Total', `Overall Rating — ${range}`);
    add('Custom', parseFloat(overallMatch[2]), 0, startDate, 'monthly', 'Chat', `Overall Rating Chat — ${range}`);
    add('Custom', parseFloat(overallMatch[3]), 0, startDate, 'monthly', 'Task', `Overall Rating Task — ${range}`);
  }

  // --- Extract Metrics+ section ---
  // The PDF has two "Metrics+" markers: values appear between them, names after the second
  const metricsPlus = norm.split('Metrics+');
  if (metricsPlus.length >= 3) {
    const valuesBlock = metricsPlus[1].trim();
    const namesBlock = metricsPlus[2].trim();

    // Parse values: numbers, percentages, or hh:mm:ss durations
    const valTokens: string[] = [];
    const valRegex = /(\d{2}:\d{2}:\d{2}|[\d.]+%?)/g;
    let vm;
    while ((vm = valRegex.exec(valuesBlock)) !== null) valTokens.push(vm[1]);

    // Parse names: each name is separated by known metric name boundaries
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

    // Convert hh:mm:ss to minutes, percentages to numeric, plain numbers as-is
    const parseMetricsPlusValue = (token: string): number => {
      if (/^\d{2}:\d{2}:\d{2}$/.test(token)) {
        const [h, m, s] = token.split(':').map(Number);
        return parseFloat((h * 60 + m + s / 60).toFixed(2));
      }
      return parseFloat(token);
    };

    for (let i = 0; i < METRICS_PLUS_NAMES.length; i++) {
      if (i >= valTokens.length) break;
      const val = parseMetricsPlusValue(valTokens[i]);
      if (isNaN(val)) continue;
      add('Custom', val, 0, startDate, 'monthly', 'Total', `${METRICS_PLUS_NAMES[i]} — ${range}`);
    }
  }

  return metrics;
}

export const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5MB

export async function extractPDFText(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_SIZE) throw new Error(`File too large (max ${MAX_IMPORT_SIZE / 1024 / 1024}MB)`);
  const pdfjsLib = await import('pdfjs-dist');
  // Use bundled worker instead of CDN to avoid supply chain risk
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ('str' in item ? item.str : '')).join('\n') + '\n';
  }
  return text;
}
