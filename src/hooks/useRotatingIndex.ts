import { useEffect, useState } from 'react';

/**
 * Cycles 0..count-1 on an interval. Used to rotate the needle-mover line.
 * Resets to 0 whenever `count` changes so we never point past the array.
 */
export function useRotatingIndex(count: number, intervalMs = 12_000): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, intervalMs]);

  return count > 0 ? index % count : 0;
}
