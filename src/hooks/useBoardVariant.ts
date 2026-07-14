import { useEffect, useState } from 'react';

export type BoardVariant = 'full' | 'mini';

/**
 * Chooses which board layout to render:
 *   - `full` — the 1920×1080 wall board.
 *   - `mini` — the dense 800×480 layout for the 7″ DSI panel.
 *
 * Defaults to auto-detecting by screen size (small panels get the mini board),
 * so a single deploy is correct on both a big display and the little panel.
 * Force it with VITE_BOARD=full | mini | auto.
 */
export function useBoardVariant(): BoardVariant {
  const forced = import.meta.env.VITE_BOARD;
  const [variant, setVariant] = useState<BoardVariant>(() => pick(forced));

  useEffect(() => {
    if (forced === 'full' || forced === 'mini') return; // fixed by config
    const compute = () => setVariant(pick(forced));
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [forced]);

  return variant;
}

function pick(forced: string | undefined): BoardVariant {
  if (forced === 'full' || forced === 'mini') return forced;
  // A short OR narrow screen (e.g. the 800×480 panel) gets the mini board.
  const small = window.innerWidth <= 1000 || window.innerHeight <= 600;
  return small ? 'mini' : 'full';
}
