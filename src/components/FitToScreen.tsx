import { useEffect, useState, type ReactNode } from 'react';

/**
 * Renders children at a fixed logical size (default 1920×1080) and scales the
 * whole thing to fit the actual screen with `transform: scale`, letterboxed and
 * centered on the page background.
 *
 * Why this instead of fluid/responsive CSS: a kiosk has exactly one job — look
 * pixel-perfect on whatever panel it's plugged into (720p, 1080p, 4K, or the
 * 1280×800 DSI panel) with zero scroll and zero cropping. Designing once at a
 * fixed 16:9 canvas and scaling is far more predictable than re-flowing every
 * element, and it can never produce a scrollbar.
 */
interface FitToScreenProps {
  width?: number;
  height?: number;
  children: ReactNode;
}

export function FitToScreen({ width = 1920, height = 1080, children }: FitToScreenProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      const s = Math.min(window.innerWidth / width, window.innerHeight / height);
      setScale(s > 0 ? s : 1);
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, [width, height]);

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-page">
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
