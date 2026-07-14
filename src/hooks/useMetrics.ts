import { useCallback, useEffect, useRef, useState } from 'react';
import { metricsAdapter, type DashboardMetrics } from '../data';

/**
 * Connection status for the board.
 * - `loading` — first fetch in flight, nothing to show yet.
 * - `live`    — last fetch succeeded; data is current.
 * - `stale`   — a poll failed but we still hold a previous good snapshot.
 * - `error`   — we have never successfully fetched anything.
 */
export type MetricsStatus = 'loading' | 'live' | 'stale' | 'error';

export interface UseMetricsResult {
  data: DashboardMetrics | null;
  status: MetricsStatus;
  /** When we last fetched successfully (ms epoch), or null if never. */
  lastSuccessAt: number | null;
  /** Message from the most recent failure, if any. */
  error: string | null;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function resolveInterval(): number {
  const raw = import.meta.env.VITE_POLL_INTERVAL_MS;
  const parsed = raw ? Number(raw) : NaN;
  // Guard against a bad env value silently hammering (or freezing) the source.
  if (!Number.isFinite(parsed) || parsed < 5_000) return DEFAULT_INTERVAL_MS;
  return parsed;
}

/**
 * Polls the metrics adapter on an interval and exposes graceful loading /
 * stale / error states. Critically for a kiosk: a failed poll NEVER clears the
 * last good data — the board keeps showing the previous numbers with a "stale"
 * indicator rather than going blank.
 *
 * @param intervalMs override the poll interval (defaults to VITE_POLL_INTERVAL_MS or 5 min).
 */
export function useMetrics(intervalMs: number = resolveInterval()): UseMetricsResult {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [status, setStatus] = useState<MetricsStatus>('loading');
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track whether we have ever succeeded, without re-triggering the effect.
  const hasDataRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const next = await metricsAdapter.getMetrics();
      hasDataRef.current = true;
      setData(next);
      setStatus('live');
      setLastSuccessAt(Date.now());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      // Keep prior data if we have any; only hard-fail on a cold start.
      setStatus(hasDataRef.current ? 'stale' : 'error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (!cancelled) void poll();
    };

    tick(); // fetch immediately on mount
    const id = window.setInterval(tick, intervalMs);

    // Refetch when the kiosk tab regains focus (e.g. after Chromium restart).
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [poll, intervalMs]);

  return { data, status, lastSuccessAt, error };
}
