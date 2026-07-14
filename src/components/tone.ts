import type { DeltaTone } from '../lib/format';
import type { Signal } from '../lib/deriveMini';

/** Text color class for a signed-delta tone. Green grows, red declines. */
export function toneTextClass(tone: DeltaTone): string {
  switch (tone) {
    case 'up':
      return 'text-accent';
    case 'down':
      return 'text-danger';
    default:
      return 'text-text-muted';
  }
}

/** Text color class for an action-queue traffic-light signal. */
export function signalTextClass(signal: Signal): string {
  switch (signal) {
    case 'good':
      return 'text-accent';
    case 'warn':
      return 'text-amber';
    default:
      return 'text-danger';
  }
}

/** Border color class (used for the tile top-accent stripe). */
export function signalBorderClass(signal: Signal): string {
  switch (signal) {
    case 'good':
      return 'border-t-accent';
    case 'warn':
      return 'border-t-amber';
    default:
      return 'border-t-danger';
  }
}
