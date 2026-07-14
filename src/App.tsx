import { useMetrics } from './hooks/useMetrics';
import { useScheduledReload } from './hooks/useScheduledReload';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FitToScreen } from './components/FitToScreen';
import { KioskBoard } from './components/KioskBoard';
import { StatusScreen } from './components/StatusScreen';

export default function App() {
  const { data, status, lastSuccessAt } = useMetrics();

  // Long-running kiosk: reload periodically to pick up new deploys.
  useScheduledReload();

  return (
    <ErrorBoundary>
      {data ? (
        // Once we have a snapshot we always render the board. A later failed
        // poll only flips the header to "STALE" — the screen never goes blank.
        <FitToScreen>
          <KioskBoard metrics={data} status={status} lastSuccessAt={lastSuccessAt} />
        </FitToScreen>
      ) : (
        <StatusScreen mode={status === 'error' ? 'error' : 'loading'} />
      )}
    </ErrorBoundary>
  );
}
