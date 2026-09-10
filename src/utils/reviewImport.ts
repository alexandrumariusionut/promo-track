/**
 * Shared logic for consuming manager review comments.
 * Handles matching, retry counting, unmatched stashing, and outcome reporting.
 */
import { STAREntry, ReviewComment } from '../types';
import { checkReviewStatus, getReviewSession } from './reviewApi';
import { getPendingReviewKey, getRetryCountKey, getUnmatchedReviewKey } from '../store/storage';

// --- Constants ---
const MAX_RETRY_ATTEMPTS = 5;

// --- Types ---
export interface MatchedComment {
  entryId: string;
  comment: ReviewComment;
}

export interface ImportResult {
  matched: MatchedComment[];
  unmatched: Array<{ sharedEntryId: string; title: string; text: string }>;
}

export interface ConsumeOutcome {
  action: 'applied' | 'retry' | 'capped' | 'no-comments' | 'not-ready' | 'pending' | 'error';
  message: string;
  severity: 'success' | 'warning' | 'info' | 'error';
  importResult?: ImportResult;
}

// --- Helpers ---

/**
 * Match comments to current entries by id (primary) then by exact unambiguous title (fallback).
 */
export function matchComments(
  comments: Record<string, { text: string; date?: string }>,
  currentEntries: STAREntry[],
  sharedEntries: Array<{ id: string; title: string }>,
  sessionId: string,
): ImportResult {
  const matched: MatchedComment[] = [];
  const unmatched: ImportResult['unmatched'] = [];

  // Build a title → current entry map (only for unambiguous titles)
  const titleToEntries = new Map<string, STAREntry[]>();
  for (const entry of currentEntries) {
    const key = entry.title.trim().toLowerCase();
    const list = titleToEntries.get(key) || [];
    list.push(entry);
    titleToEntries.set(key, list);
  }

  const currentById = new Map(currentEntries.map(e => [e.id, e]));

  for (const [sharedEntryId, commentData] of Object.entries(comments)) {
    if (!commentData?.text) continue;

    const sharedEntry = sharedEntries.find(e => e.id === sharedEntryId);
    const sharedTitle = sharedEntry?.title || 'Unknown entry';

    // Primary match: by id
    let targetEntry = currentById.get(sharedEntryId);

    // Fallback: exact title match, only if unambiguous
    if (!targetEntry && sharedEntry) {
      const titleKey = sharedEntry.title.trim().toLowerCase();
      const candidates = titleToEntries.get(titleKey);
      if (candidates && candidates.length === 1) {
        targetEntry = candidates[0];
      }
    }

    if (targetEntry) {
      const newComment: ReviewComment = {
        id: `review-${sessionId}-${sharedEntryId}`,
        text: commentData.text,
        date: commentData.date || new Date().toISOString(),
        source: 'manager',
      };
      // Skip if already imported
      const existing = targetEntry.reviewComments || [];
      if (!existing.some(ec => ec.id === newComment.id)) {
        matched.push({ entryId: targetEntry.id, comment: newComment });
      }
    } else {
      unmatched.push({ sharedEntryId, title: sharedTitle, text: commentData.text });
    }
  }

  return { matched, unmatched };
}

/**
 * Get the current retry count for the review import.
 */
export function getRetryCount(): number {
  const raw = localStorage.getItem(getRetryCountKey());
  return raw ? parseInt(raw, 10) || 0 : 0;
}

function incrementRetryCount(): number {
  const next = getRetryCount() + 1;
  localStorage.setItem(getRetryCountKey(), String(next));
  return next;
}

function clearRetryCount(): void {
  localStorage.removeItem(getRetryCountKey());
}

/**
 * Store unmatched comments for last-resort visibility.
 */
export function stashUnmatchedComments(unmatched: ImportResult['unmatched']): void {
  localStorage.setItem(getUnmatchedReviewKey(), JSON.stringify(unmatched));
}

/**
 * Get stashed unmatched comments.
 */
export function getUnmatchedComments(): ImportResult['unmatched'] {
  const raw = localStorage.getItem(getUnmatchedReviewKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Clear stashed unmatched comments (when user dismisses).
 */
export function clearUnmatchedComments(): void {
  localStorage.removeItem(getUnmatchedReviewKey());
}

/**
 * Determine if an error is definitive (404 = session gone) vs transient.
 */
function isDefinitive404(error: unknown): boolean {
  if (error instanceof Response) return error.status === 404;
  if (error instanceof Error) return error.message.includes('not found') || error.message.includes('Not found');
  return false;
}

/**
 * Main consume logic: poll status, match comments, return outcome.
 * Does NOT dispatch — caller is responsible for applying matched comments.
 */
export async function consumeReview(
  currentEntries: STAREntry[],
): Promise<ConsumeOutcome> {
  const sessionId = localStorage.getItem(getPendingReviewKey());
  if (!sessionId) {
    return { action: 'error', message: '', severity: 'info' };
  }

  // Readiness guard: if no local entries, skip applying (polling continues)
  if (currentEntries.length === 0) {
    return { action: 'not-ready', message: '', severity: 'info' };
  }

  try {
    const result = await checkReviewStatus(sessionId);

    if (result.status !== 'reviewed') {
      return { action: 'pending', message: '', severity: 'info' };
    }

    const comments: Record<string, { text: string; date?: string }> = result.comments || {};

    // No comments at all — manager completed without feedback
    if (Object.keys(comments).length === 0) {
      localStorage.removeItem(getPendingReviewKey());
      clearRetryCount();
      return {
        action: 'no-comments',
        message: 'Manager completed review without comments.',
        severity: 'info',
      };
    }

    // Fetch the full session to get the shared entries snapshot for title matching
    let sharedEntries: Array<{ id: string; title: string }> = [];
    try {
      const fullSession = await getReviewSession(sessionId);
      sharedEntries = (fullSession.entries || []).map((e: { id: string; title: string }) => ({
        id: e.id,
        title: e.title,
      }));
    } catch (e) {
      console.warn('[reviewImport] Could not fetch full session for title matching, falling back to id-only:', e);
      // Fall back to id-only matching using comment keys as sharedEntryIds
      sharedEntries = Object.keys(comments).map(id => ({ id, title: '' }));
    }

    const importResult = matchComments(comments, currentEntries, sharedEntries, sessionId);

    if (importResult.matched.length > 0) {
      // Success — remove pending key
      localStorage.removeItem(getPendingReviewKey());
      clearRetryCount();
      const msg = importResult.unmatched.length > 0
        ? `Manager review received — ${importResult.matched.length} comment(s) added to your entries, ${importResult.unmatched.length} could not be matched`
        : `Manager review received — ${importResult.matched.length} comment(s) added to your entries`;

      // If some unmatched, stash them for visibility
      if (importResult.unmatched.length > 0) {
        stashUnmatchedComments(importResult.unmatched);
      }

      return { action: 'applied', message: msg, severity: 'success', importResult };
    }

    // matched === 0 but comments exist — retry logic
    const retryCount = incrementRetryCount();
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      // Cap reached — stash and remove key
      localStorage.removeItem(getPendingReviewKey());
      clearRetryCount();
      stashUnmatchedComments(importResult.unmatched);
      return {
        action: 'capped',
        message: 'Review received but comments could not be matched to current entries. Feedback saved — view from STAR Entries page.',
        severity: 'warning',
        importResult,
      };
    }

    return {
      action: 'retry',
      message: 'Review received but comments could not be matched to your current entries yet — will retry',
      severity: 'warning',
      importResult,
    };
  } catch (error) {
    // Definitive 404: session deleted/expired — remove key
    if (isDefinitive404(error)) {
      localStorage.removeItem(getPendingReviewKey());
      clearRetryCount();
      return {
        action: 'error',
        message: 'Review session expired or was deleted.',
        severity: 'error',
      };
    }

    // Transient error: do NOT remove the key, just log and retry
    console.warn('[reviewImport] Transient error polling review status, will retry:', error);
    return {
      action: 'error',
      message: '',
      severity: 'info',
    };
  }
}
