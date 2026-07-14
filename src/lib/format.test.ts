import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  deltaTone,
  formatClock,
  formatCurrency,
  formatDelta,
  formatPercent,
} from './format';

// U+2212, the glyph the formatter uses for negatives (not an ASCII hyphen).
const MINUS = '−';

describe('formatDelta', () => {
  it('prefixes a plus sign for positive plain numbers', () => {
    expect(formatDelta(7)).toBe('+7');
  });

  it('uses the minus glyph for negative numbers', () => {
    expect(formatDelta(-8)).toBe(`${MINUS}8`);
  });

  it('renders zero with no sign', () => {
    expect(formatDelta(0)).toBe('0');
  });

  it('formats money with a grouped thousands separator', () => {
    expect(formatDelta(1200, { money: true })).toBe('+$1,200');
  });

  it('formats percents', () => {
    expect(formatDelta(-8, { pct: true })).toBe(`${MINUS}8%`);
  });

  it('appends a suffix after the value', () => {
    expect(formatDelta(680, { money: true, suffix: ' MoM' })).toBe('+$680 MoM');
  });
});

describe('formatCurrency', () => {
  it('adds a dollar sign and thousands separators', () => {
    expect(formatCurrency(12400)).toBe('$12,400');
  });

  it('rounds to whole dollars', () => {
    expect(formatCurrency(12400.6)).toBe('$12,401');
  });
});

describe('formatPercent', () => {
  it('rounds to a whole percent', () => {
    expect(formatPercent(66.666)).toBe('67%');
    expect(formatPercent(63)).toBe('63%');
  });
});

describe('deltaTone', () => {
  it('maps sign to a semantic tone', () => {
    expect(deltaTone(5)).toBe('up');
    expect(deltaTone(-5)).toBe('down');
    expect(deltaTone(0)).toBe('flat');
  });
});

describe('formatClock', () => {
  it('renders an h:mm AM/PM clock', () => {
    // Local-timezone dependent, so assert shape rather than an exact time.
    expect(formatClock(new Date('2026-07-14T14:14:00'))).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
  });
});

describe('daysUntil', () => {
  it('counts whole days to a future date', () => {
    expect(daysUntil('2027-01-01', new Date('2026-12-30T00:00:00'))).toBe(2);
  });

  it('never returns a negative number for past dates', () => {
    expect(daysUntil('2020-01-01', new Date('2026-07-14T00:00:00'))).toBe(0);
  });

  it('returns 0 on the target day itself', () => {
    expect(daysUntil('2026-07-14', new Date('2026-07-14T10:00:00'))).toBe(0);
  });
});
