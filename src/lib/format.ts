/** Small, dependency-free formatting helpers shared across the board. */

/** Minus sign glyph (U+2212) reads better than a hyphen at large type sizes. */
const MINUS = '−';

export interface DeltaOptions {
  /** Render as a dollar amount ("$1,200"). */
  money?: boolean;
  /** Render as a percent ("16%"). */
  pct?: boolean;
  /** Trailing text, e.g. " MoM". */
  suffix?: string;
}

/** "+$680", "−8%", "+7" — signed, with the magnitude formatted per options. */
export function formatDelta(n: number, opts: DeltaOptions = {}): string {
  const sign = n > 0 ? '+' : n < 0 ? MINUS : '';
  const abs = Math.abs(n);
  const val = opts.money
    ? `$${abs.toLocaleString('en-US')}`
    : opts.pct
      ? `${abs}%`
      : `${abs}`;
  return `${sign}${val}${opts.suffix ?? ''}`;
}

/** "$12,400" */
export function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** "63%" */
export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

/** Sign → semantic color. Green = growth, red = decline, muted = flat. */
export type DeltaTone = 'up' | 'down' | 'flat';

export function deltaTone(n: number): DeltaTone {
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'flat';
}

/** Format a clock time from an ISO string or epoch, e.g. "2:14 PM". */
export function formatClock(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Whole days between now and an ISO target date (never negative). */
export function daysUntil(targetDate: string, now: Date = new Date()): number {
  const target = new Date(`${targetDate}T00:00:00`);
  const ms = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
