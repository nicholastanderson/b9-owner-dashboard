/**
 * Full-screen branded placeholder for the cold-start states — shown only when
 * there is no data to render yet (first load, or an error before any successful
 * fetch). Once we have a snapshot, the board renders and a failed poll just
 * flips the header to "STALE"; it never falls back to this screen.
 */
export function StatusScreen({ mode }: { mode: 'loading' | 'error' }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-page text-center">
      <div>
        <div className="font-display text-[64px] italic leading-none text-accent">
          BACK NINE GOLF
        </div>
        <div className="mt-3 text-2xl font-semibold uppercase tracking-[4px] text-text-muted">
          Pulse Board
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              mode === 'loading' ? 'animate-bn-pulse bg-accent' : 'bg-danger'
            }`}
          />
          <span className="text-xl uppercase tracking-[3px] text-text-label">
            {mode === 'loading' ? 'Connecting to data source…' : 'Data source unavailable'}
          </span>
        </div>

        {mode === 'error' && (
          <div className="mt-2 font-mono text-sm text-text-label">
            Retrying automatically — the board will appear once data arrives.
          </div>
        )}
      </div>
    </div>
  );
}
