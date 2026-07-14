import { describe, expect, it } from 'vitest';
import { MockAdapter } from './mockAdapter';

describe('MockAdapter', () => {
  const adapter = new MockAdapter(0); // no simulated latency in tests

  it('resolves to the bundled sample metrics', async () => {
    const m = await adapter.getMetrics();
    expect(m.goal.activeMembers).toBe(40);
    expect(m.goal.target).toBe(100);
    expect(m.money.mrr).toBe(12400);
  });

  it('stamps a fresh ISO updatedAt on every call', async () => {
    const before = Date.now();
    const m = await adapter.getMetrics();
    const stamped = new Date(m.updatedAt).getTime();
    expect(Number.isNaN(stamped)).toBe(false);
    expect(stamped).toBeGreaterThanOrEqual(before);
  });

  it('returns an independent object each call (never mutates the source)', async () => {
    const a = await adapter.getMetrics();
    a.goal.activeMembers = 999;
    const b = await adapter.getMetrics();
    expect(b.goal.activeMembers).toBe(40);
  });
});
