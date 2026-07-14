import { MockAdapter } from './mockAdapter';
import type { MetricsAdapter } from './types';

/**
 * Single place that decides which data source the app polls.
 *
 * Today only the mock source exists. To go live:
 *   1. Add an adapter that implements `MetricsAdapter` (e.g. `LiveAdapter`
 *      that fetches an aggregating endpoint fronting GoHighLevel / QuickBooks /
 *      Google Business — secrets stay server-side, never in this bundle).
 *   2. Add a `case 'live'` below.
 *   3. Set `VITE_DATA_SOURCE=live` in the environment.
 *
 * The UI imports `metricsAdapter` and nothing else — the source is invisible to it.
 */
const source = import.meta.env.VITE_DATA_SOURCE ?? 'mock';

function createAdapter(): MetricsAdapter {
  switch (source) {
    case 'mock':
      return new MockAdapter();
    // case 'live':
    //   return new LiveAdapter(import.meta.env.VITE_METRICS_ENDPOINT);
    default:
      console.warn(`Unknown VITE_DATA_SOURCE "${source}" — falling back to mock.`);
      return new MockAdapter();
  }
}

export const metricsAdapter: MetricsAdapter = createAdapter();

export type {
  DashboardMetrics,
  MetricsAdapter,
  MembershipGoal,
  MoneyMetrics,
  UtilizationMetrics,
  FunnelMetrics,
  AmbientMetrics,
  WeeklyDirective,
  OperationsMetrics,
} from './types';
