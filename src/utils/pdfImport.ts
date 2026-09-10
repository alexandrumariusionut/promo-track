import { Metric } from '../types';

import { extractWithItems, extractFromTextOnly, ParseResultV2, ParseDiagnostics } from './pdfImportV2';

/**
 * Parses GSD Scorecard PDF text into Metric objects.
 *
 * This is the PUBLIC API consumed by MetricsPage.tsx. It delegates to the
 * layout-resilient V2 parser (label-anchored, per-KPI independent extraction)
 * when positioned items are available, and falls back to the text-regex path
 * for text-only extractions.
 *
 * The GSD Scorecard PDF contains:
 * - Summary KPI row: 10+ values followed by KPI labels
 * - Weekly trend charts per KPI (W2–W29 etc.)
 * - Thresholds (Max/Min) per KPI
 * - Overall Rating row
 * - Report date range
 */
export function parseGSDMetrics(text: string, items?: PDFItem[]): Metric[] {
  const result = parseGSDMetricsV2(text, items);
  return result.metrics;
}

/**
 * Enhanced parser entry point returning metrics + diagnostics.
 * Use this when you need visibility into what was found/missed.
 */
export function parseGSDMetricsV2(text: string, items?: PDFItem[]): ParseResultV2 {
  // PRIMARY PATH: label-anchored extraction when positioned items are available
  if (items && items.length > 0) {
    return extractWithItems(items, text);
  }

  // FALLBACK: text-only regex extraction
  return extractFromTextOnly(text);
}

/** Re-export diagnostics type for consumers */
export type { ParseDiagnostics, ParseResultV2 };

/** A PDF text fragment with its page position (origin bottom-left, PDF units). */
export interface PDFItem {
  str: string;
  x: number;
  y: number;
}

export const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5MB

export async function extractPDFText(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_SIZE) throw new Error(`File too large (max ${MAX_IMPORT_SIZE / 1024 / 1024}MB)`);
  const pdfjsLib = await import('pdfjs-dist');
  // Use static worker from public/ to avoid dynamic import issues with Harmony builds
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', window.location.origin).href;
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

/** Minimal shape of a pdfjs text item (avoids depending on pdfjs types directly). */
interface PdfTextItemLike {
  str?: string;
  transform?: number[];
}

/**
 * Extracts PDF text fragments WITH their x/y page positions. Required for accurate
 * weekly-trend reconstruction (see extractWithItems), which cannot work from
 * the flattened text returned by extractPDFText.
 */
export async function extractPDFItems(file: File): Promise<PDFItem[]> {
  if (file.size > MAX_IMPORT_SIZE) throw new Error(`File too large (max ${MAX_IMPORT_SIZE / 1024 / 1024}MB)`);
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', window.location.origin).href;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const out: PDFItem[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      const it = item as PdfTextItemLike;
      if (typeof it.str === 'string' && it.str.trim() !== '' && it.transform) {
        out.push({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) });
      }
    }
  }
  return out;
}
