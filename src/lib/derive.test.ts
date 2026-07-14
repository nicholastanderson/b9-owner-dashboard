import { describe, expect, it } from 'vitest';
import type { DashboardMetrics } from '../data';
import { deriveBoardView } from './derive';
import sample from '../data/mock/metrics.json';

const mock = sample as DashboardMetrics;

// A clone helper so per-test tweaks never bleed into other tests.
const withMock = (patch: (m: DashboardMetrics) => void): DashboardMetrics => {
  const m = structuredClone(mock);
  patch(m);
  return m;
};

describe('deriveBoardView (happy path from the mock fixture)', () => {
  const view = deriveBoardView(mock, new Date('2026-07-14T12:00:00'));

  it('derives the hero goal progress', () => {
    expect(view.hero.members).toBe(40);
    expect(view.hero.goal).toBe(100);
    expect(view.hero.pctLabel).toBe('40%');
    expect(view.hero.pctWidth).toBe('40%');
    expect(view.hero.remainingLabel).toBe('60 more');
    expect(view.hero.daysRemaining).toBeGreaterThan(0);
  });

  it('marks on-pace when net this week meets the needed rate', () => {
    expect(view.onPace).toBe(true);
    expect(view.pace.label).toBe('ON PACE');
    expect(view.pace.netThisWeek).toBe('+3');
    expect(view.pace.detail).toBe('+0.9 ahead of pace');
    expect(view.pace.tone).toBe('up');
  });

  it('derives the money row', () => {
    expect(view.money.mrr).toBe('$12,400');
    expect(view.money.mrrDelta).toBe('+$680 MoM');
    expect(view.money.mrrTone).toBe('up');
    expect(view.money.netMovement).toBe('+7');
    expect(view.money.revenueMtd).toBe('$8,240');
    expect(view.money.revenueDelta).toBe('+16% vs LM');
  });

  it('derives utilization with a clamped occupancy bar', () => {
    expect(view.utilization.occupancyLabel).toBe('63%');
    expect(view.utilization.occupancyWidth).toBe('63%');
    expect(view.utilization.bookingsDelta).toBe('+19% WoW');
  });

  it('computes the trial conversion rate', () => {
    // 4 of 6 trials converted → 67%.
    expect(view.funnel.conversionRate).toBe('67%');
  });

  it('passes ambient reputation and needle-movers through', () => {
    expect(view.ambient.rating).toBe(4.8);
    expect(view.ambient.reviews).toBe(127);
    expect(view.ambient.needleMovers).toHaveLength(4);
  });
});

describe('deriveBoardView (edge cases)', () => {
  it('marks behind-pace when net this week is under the needed rate', () => {
    const view = deriveBoardView(withMock((m) => (m.goal.netThisWeek = 1)));
    expect(view.onPace).toBe(false);
    expect(view.pace.label).toBe('BEHIND PACE');
    expect(view.pace.detail).toContain('under pace');
    expect(view.pace.tone).toBe('down');
  });

  it('guards against a zero membership target', () => {
    const view = deriveBoardView(withMock((m) => (m.goal.target = 0)));
    expect(view.hero.pctLabel).toBe('0%');
    expect(view.hero.remainingLabel).toBe('0 more');
  });

  it('clamps the progress bar width to 100%', () => {
    const view = deriveBoardView(withMock((m) => (m.goal.activeMembers = 150)));
    expect(view.hero.pctWidth).toBe('100%');
  });

  it('shows an em dash when no trials were booked', () => {
    const view = deriveBoardView(withMock((m) => (m.funnel.trialsBooked = 0)));
    expect(view.funnel.conversionRate).toBe('—');
  });

  it('falls back to a single em dash when there are no needle-movers', () => {
    const view = deriveBoardView(withMock((m) => (m.ambient.needleMovers = [])));
    expect(view.ambient.needleMovers).toEqual(['—']);
  });
});
