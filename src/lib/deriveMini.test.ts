import { describe, expect, it } from 'vitest';
import type { DashboardMetrics } from '../data';
import { deriveMiniView } from './deriveMini';
import sample from '../data/mock/metrics.json';

const mock = sample as DashboardMetrics;

const withMock = (patch: (m: DashboardMetrics) => void): DashboardMetrics => {
  const m = structuredClone(mock);
  patch(m);
  return m;
};

// Pin "now" to exactly 4 weeks before the goal date so the projection math is
// deterministic: weeksLeft = 4, projected = 40 + 2.6 * 4 = 50.4 → 50.
const NOW = new Date('2026-12-04T00:00:00');

describe('deriveMiniView (projection)', () => {
  const view = deriveMiniView(mock, NOW);

  it('projects the Jan-1 total from the trailing pace', () => {
    expect(view.daysRemaining).toBe(28);
    expect(view.projected).toBe(50);
    expect(view.onTrack).toBe(false);
    expect(view.projectionSignal).toBe('bad');
    expect(view.projectionVerdict).toBe('50 — SHORT BY 50');
  });

  it('reports ON TRACK when the projection reaches the target', () => {
    const view = deriveMiniView(withMock((m) => (m.goal.trailingPacePerWeek = 20)), NOW);
    expect(view.onTrack).toBe(true);
    expect(view.projectionSignal).toBe('good');
    expect(view.projectionVerdict).toBe('↑ ON TRACK FOR 100');
  });
});

describe('deriveMiniView (weekly directive)', () => {
  it('flags the week good when the close target is met', () => {
    const view = deriveMiniView(mock, NOW);
    expect(view.week.signal).toBe('good');
    expect(view.week.dots).toEqual([true, true]);
  });

  it('flags the week bad when nothing has closed yet', () => {
    const view = deriveMiniView(withMock((m) => (m.weekly.done = 0)), NOW);
    expect(view.week.signal).toBe('bad');
    expect(view.week.dots).toEqual([false, false]);
  });

  it('flags the week warn when partially done', () => {
    const view = deriveMiniView(
      withMock((m) => {
        m.weekly.target = 3;
        m.weekly.done = 1;
      }),
      NOW,
    );
    expect(view.week.signal).toBe('warn');
    expect(view.week.dots).toEqual([true, false, false]);
  });
});

describe('deriveMiniView (action queue signals)', () => {
  it('bands the mock fixture as all-good', () => {
    const { actions } = deriveMiniView(mock, NOW);
    expect(actions.trialsToCall.signal).toBe('good');
    expect(actions.trialsToCall.sub).toBe('all followed up');
    expect(actions.inbox.signal).toBe('good');
    expect(actions.inbox.avgResponse).toBe('2h');
    expect(actions.inbox.responseSignal).toBe('good');
    expect(actions.lastSignup.signal).toBe('good');
    expect(actions.social.signal).toBe('good');
    expect(actions.social.sub).toBe('7d covered');
  });

  it('renders sub-hour response times in minutes', () => {
    const { actions } = deriveMiniView(
      withMock((m) => (m.operations.avgResponseHours = 0.5)),
      NOW,
    );
    expect(actions.inbox.avgResponse).toBe('30m');
  });

  it('escalates trials-to-call as the backlog grows', () => {
    expect(deriveMiniView(withMock((m) => (m.operations.trialsToCall = 2)), NOW).actions.trialsToCall.signal).toBe('warn');
    expect(deriveMiniView(withMock((m) => (m.operations.trialsToCall = 5)), NOW).actions.trialsToCall.signal).toBe('bad');
  });

  it('inverts the banding for social runway (more is better)', () => {
    expect(deriveMiniView(withMock((m) => (m.operations.socialRunwayDays = 3)), NOW).actions.social.signal).toBe('warn');
    const empty = deriveMiniView(withMock((m) => (m.operations.socialRunwayDays = 0)), NOW).actions.social;
    expect(empty.signal).toBe('bad');
    expect(empty.sub).toBe('nothing scheduled');
  });
});
