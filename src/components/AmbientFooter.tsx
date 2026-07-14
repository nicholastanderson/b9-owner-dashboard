import type { BoardView } from '../lib/derive';
import { useRotatingIndex } from '../hooks/useRotatingIndex';

/** Google-rating card + the rotating "today's needle-mover" prompt. */
export function AmbientFooter({ view }: { view: BoardView }) {
  const { ambient } = view;
  const index = useRotatingIndex(ambient.needleMovers.length);
  const needle = ambient.needleMovers[index];

  return (
    <div className="mt-5 flex items-stretch gap-5">
      <div className="flex min-w-[300px] items-center gap-4 rounded-lg border border-white/[0.08] bg-surface px-6 py-[14px]">
        <span className="font-display text-[46px] italic leading-none text-accent">
          {ambient.rating}
        </span>
        <div>
          <div className="text-xl tracking-[2px] text-gold">★★★★★</div>
          <div className="text-base uppercase tracking-[1.5px] text-text-muted">
            Google · {ambient.reviews} reviews
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-[18px] rounded-lg border border-accent/20 bg-gradient-to-r from-accent/10 to-accent/[0.02] px-6 py-[14px]">
        <span className="whitespace-nowrap text-[15px] font-bold uppercase tracking-[3px] text-accent">
          Today's Needle-Mover
        </span>
        {/* key forces a re-mount so each line fades in on rotation. */}
        <span
          key={index}
          className="animate-[fadeIn_0.5s_ease] text-2xl font-medium leading-[1.15] text-[#e9eef2]"
        >
          {needle}
        </span>
      </div>
    </div>
  );
}
