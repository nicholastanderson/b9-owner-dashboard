import type { BoardView } from '../lib/derive';

/**
 * The dominant top block: active-members X/100 with progress bar (left), and
 * the weekly-pace card + days-remaining card (right). Green when on pace, red
 * only when behind — red is reserved for behind-pace / churn.
 */
export function Hero({ view }: { view: BoardView }) {
  const { hero, pace, onPace } = view;

  return (
    <div className="mt-[26px] flex gap-10">
      {/* left: members + progress */}
      <div className="flex flex-[1.55] flex-col justify-center">
        <div className="text-[22px] font-semibold uppercase tracking-[4px] text-text-muted">
          Active Members · Goal by Jan 1, 2027
        </div>

        <div className="mt-1 flex items-end gap-2">
          <span className="font-display text-[210px] italic leading-[0.82] text-white">
            {hero.members}
          </span>
          <span className="mb-[14px] font-display text-[96px] italic leading-none text-[#5c6773]">
            /{hero.goal}
          </span>
          <span className="mb-[30px] ml-[22px] font-display text-[40px] italic text-accent">
            {hero.pctLabel}
          </span>
        </div>

        <div className="relative mt-[14px] h-[30px] overflow-hidden rounded border border-white/[0.08] bg-track">
          <div
            className="absolute inset-0 bg-gradient-to-r from-accent-dark to-accent shadow-[0_0_24px_rgba(150,203,57,0.4)]"
            style={{ width: hero.pctWidth }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[15px] uppercase tracking-[1px] text-text-label">
          <span>{hero.members} now</span>
          <span>{hero.remainingLabel} to go</span>
          <span>{hero.goal} members</span>
        </div>
      </div>

      {/* right: pace + days */}
      <div className="flex flex-1 flex-col gap-[18px]">
        <div
          className={`flex flex-1 flex-col justify-center rounded-lg border px-6 py-5 ${
            onPace ? 'border-accent/35 bg-accent/10' : 'border-danger/40 bg-danger/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[18px] font-semibold uppercase tracking-[3px] text-text-muted">
              Weekly Pace
            </span>
            <span
              className={`rounded-full px-[14px] py-[6px] text-base font-bold tracking-[2px] text-ink ${
                onPace ? 'bg-accent' : 'bg-danger'
              }`}
            >
              {pace.label}
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-[14px]">
            <span
              className={`font-display text-[74px] italic leading-none ${
                onPace ? 'text-accent' : 'text-danger'
              }`}
            >
              {pace.netThisWeek}
            </span>
            <span className="text-[22px] text-text-soft">net members this week</span>
          </div>

          <div className="mt-0.5 text-[19px] tracking-[0.5px] text-text-muted">
            Need <span className="font-semibold text-white">{pace.neededPerWeek}/wk</span> to hit 100
            · {pace.detail}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-surface px-6 py-[18px]">
          <div>
            <div className="text-[18px] font-semibold uppercase tracking-[3px] text-text-muted">
              Days Remaining
            </div>
            <div className="mt-0.5 text-[19px] text-text-muted">until Jan 1, 2027</div>
          </div>
          <span className="font-display text-[78px] italic leading-none text-white">
            {hero.daysRemaining}
          </span>
        </div>
      </div>
    </div>
  );
}
