import { useEffect } from 'react';

const DEFAULT_RELOAD_MS = 30 * 60 * 1000; // 30 minutes

function resolveReloadInterval(): number {
  const raw = import.meta.env.VITE_RELOAD_INTERVAL_MS;
  const parsed = raw ? Number(raw) : NaN;
  // 0 (or anything sub-minute / invalid) disables the scheduled reload.
  if (!Number.isFinite(parsed) || parsed < 60_000) return DEFAULT_RELOAD_MS;
  return parsed;
}

/**
 * Periodically does a full `location.reload()` so a long-running kiosk picks up
 * new deploys (index.html is served no-cache; CI invalidates CloudFront). Data
 * freshness is handled separately by `useMetrics` polling — this is only about
 * loading a newer app bundle without anyone touching the Pi.
 *
 * Set VITE_RELOAD_INTERVAL_MS=0 to disable.
 */
export function useScheduledReload(intervalMs: number = resolveReloadInterval()): void {
  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = window.setTimeout(() => {
      window.location.reload();
    }, intervalMs);
    return () => window.clearTimeout(id);
  }, [intervalMs]);
}
