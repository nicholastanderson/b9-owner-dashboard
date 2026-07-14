import type { DashboardMetrics, MetricsAdapter } from './types';
import sample from './mock/metrics.json';

/**
 * Mock data source. Returns realistic sample data from a bundled JSON file.
 *
 * It stamps `updatedAt` with the current time on every call so the board's
 * "last updated" clock visibly advances while developing, and it simulates a
 * small amount of latency. Swap this out for a real adapter (GoHighLevel,
 * QuickBooks, Google Business) by implementing `MetricsAdapter` and selecting
 * it in `src/data/index.ts` — no UI changes required.
 */
export class MockAdapter implements MetricsAdapter {
  /** Simulated network latency in ms. */
  private readonly latencyMs: number;

  constructor(latencyMs = 250) {
    this.latencyMs = latencyMs;
  }

  async getMetrics(): Promise<DashboardMetrics> {
    await delay(this.latencyMs);

    // Clone so the imported JSON module is never mutated.
    const data = structuredClone(sample) as DashboardMetrics;
    data.updatedAt = new Date().toISOString();
    return data;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
