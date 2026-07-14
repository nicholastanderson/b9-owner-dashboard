import type { DeltaTone } from '../lib/format';

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
