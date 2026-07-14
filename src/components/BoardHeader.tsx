import type { MetricsStatus } from '../hooks/useMetrics';
import { formatClock } from '../lib/format';

interface BoardHeaderProps {
  status: MetricsStatus;
  lastSuccessAt: number | null;
}

/** Brand lockup + live/stale connection indicator and "updated" time. */
export function BoardHeader({ status, lastSuccessAt }: BoardHeaderProps) {
  const stale = status === 'stale';
  const updatedLabel = lastSuccessAt ? formatClock(lastSuccessAt) : '—';

  return (
    <>
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-4">
          <div className="font-display text-[34px] italic leading-none tracking-[0.5px]">
            BACK NINE GOLF
          </div>
          <div className="text-base font-semibold uppercase tracking-[3px] text-text-label">
            Membership Dashboard
          </div>
        </div>

        <div className="flex items-center gap-[10px] text-[15px] uppercase tracking-[1.5px] text-text-label">
          <span
            className={`h-2 w-2 rounded-full ${
              stale ? 'bg-danger' : 'animate-bn-pulse bg-accent'
            }`}
          />
          {stale ? 'STALE · LAST UPDATE ' : 'LIVE · UPDATED '}
          {updatedLabel}
        </div>
      </div>

      <div className="mt-4 h-[2px] bg-gradient-to-r from-accent from-0% via-accent/[0.15] via-[55%] to-accent/0" />
    </>
  );
}
