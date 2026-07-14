import type { DashboardMetrics } from '../data';
import type { MetricsStatus } from '../hooks/useMetrics';
import { deriveBoardView } from '../lib/derive';
import { CornerBrackets } from './CornerBrackets';
import { BoardHeader } from './BoardHeader';
import { Hero } from './Hero';
import { MetricColumns } from './MetricColumns';
import { AmbientFooter } from './AmbientFooter';

interface KioskBoardProps {
  metrics: DashboardMetrics;
  status: MetricsStatus;
  lastSuccessAt: number | null;
}

/** The full 1920×1080 board. Rendered inside FitToScreen so it scales to fit. */
export function KioskBoard({ metrics, status, lastSuccessAt }: KioskBoardProps) {
  const view = deriveBoardView(metrics);

  return (
    <div className="relative flex h-[1080px] w-[1920px] flex-col overflow-hidden bg-ink px-[60px] pb-[44px] pt-[52px] text-white">
      <CornerBrackets />
      <BoardHeader status={status} lastSuccessAt={lastSuccessAt} />
      <Hero view={view} />
      <div className="mt-[26px] h-px bg-white/[0.07]" />
      <MetricColumns view={view} />
      <AmbientFooter view={view} />
    </div>
  );
}
