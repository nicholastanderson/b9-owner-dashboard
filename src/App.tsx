import { useMetrics } from './hooks/useMetrics';
import { useScheduledReload } from './hooks/useScheduledReload';
import { useBoardVariant } from './hooks/useBoardVariant';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FitToScreen } from './components/FitToScreen';
import { KioskBoard } from './components/KioskBoard';
import { KioskMini } from './components/KioskMini';
import { StatusScreen } from './components/StatusScreen';

export default function App() {
  const { data, status, lastSuccessAt } = useMetrics();
  const variant = useBoardVariant();

  // Long-running kiosk: reload periodically to pick up new deploys.
  useScheduledReload();

  if (!data) {
    // Cold start / never-fetched: branded splash, not a blank screen.
    return (
      <ErrorBoundary>
        <StatusScreen mode={status === 'error' ? 'error' : 'loading'} />
      </ErrorBoundary>
    );
  }

  // Once we have a snapshot we always render the board. A later failed poll
  // only flips the header to "STALE" — the screen never goes blank.
  return (
    <ErrorBoundary>
      {variant === 'mini' ? (
        <FitToScreen width={800} height={480}>
          <KioskMini metrics={data} status={status} />
        </FitToScreen>
      ) : (
        <FitToScreen width={1920} height={1080}>
          <KioskBoard metrics={data} status={status} lastSuccessAt={lastSuccessAt} />
        </FitToScreen>
      )}
    </ErrorBoundary>
  );
}
