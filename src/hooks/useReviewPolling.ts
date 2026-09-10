import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { getPendingReviewKey } from '../store/storage';
import { consumeReview } from '../utils/reviewImport';

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls the review API while a shared review link is pending and merges any
 * manager comments into the matching STAR entries.
 *
 * The interval is created once; the latest entries are read through a ref so
 * editing STAR entries does not tear down and recreate the timer.
 * Returns the last user-facing notification (or null) and a dismiss function.
 */
export function useReviewPolling(): { notification: string | null; dismiss: () => void } {
  const { state, dispatch } = useApp();
  const [notification, setNotification] = useState<string | null>(null);
  const entriesRef = useRef(state.star);

  useEffect(() => { entriesRef.current = state.star; }, [state.star]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (!localStorage.getItem(getPendingReviewKey())) return;
      const entries = entriesRef.current;
      const outcome = await consumeReview(entries);
      if (cancelled) return;
      if (outcome.action === 'not-ready' || outcome.action === 'pending') return;
      if (outcome.action === 'error' && !outcome.message) return; // transient — silent retry

      if (outcome.importResult?.matched.length) {
        for (const { entryId, comment } of outcome.importResult.matched) {
          const entry = entriesRef.current.find((e) => e.id === entryId);
          if (entry) {
            dispatch({ type: 'UPDATE_STAR', payload: { ...entry, reviewComments: [...(entry.reviewComments || []), comment] } });
          }
        }
      }
      if (outcome.message) setNotification(outcome.message);
    };

    void poll();
    const interval = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [dispatch]);

  return { notification, dismiss: () => setNotification(null) };
}
