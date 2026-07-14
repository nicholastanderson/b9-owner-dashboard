import type { DashboardMetrics } from '../data';
import type { MetricsStatus } from '../hooks/useMetrics';
import { deriveMiniView, type Signal } from '../lib/deriveMini';
import { signalBorderClass, signalTextClass } from './tone';
import { CornerBrackets } from './CornerBrackets';

interface KioskMiniProps {
  metrics: DashboardMetrics;
  status: MetricsStatus;
}

/** Soft background + border classes for the weekly-directive band. */
function weekBandClasses(signal: Signal): string {
  switch (signal) {
    case 'good':
      return 'bg-accent/[0.08] border-accent/30';
    case 'warn':
      return 'bg-amber/[0.08] border-amber/35';
    default:
      return 'bg-danger/10 border-danger/40';
  }
}

/** Literal fill+border classes for a "closed" progress dot (JIT-safe). */
function dotOnClasses(signal: Signal): string {
  switch (signal) {
    case 'good':
      return 'bg-accent border-accent';
    case 'warn':
      return 'bg-amber border-amber';
    default:
      return 'bg-danger border-danger';
  }
}

/** One action-queue tile. */
function ActionTile({
  label,
  signal,
  children,
  sub,
  subClass = 'text-text-muted',
}: {
  label: string;
  signal: Signal;
  children: React.ReactNode;
  sub: string;
  subClass?: string;
}) {
  return (
    <div
      className={`flex flex-1 flex-col justify-between rounded-lg border border-white/[0.06] border-t-[3px] bg-surface px-3 py-[10px] ${signalBorderClass(
        signal,
      )}`}
    >
      <div className="text-xs uppercase tracking-[1.5px] text-text-label">{label}</div>
      {children}
      <div className={`text-[13px] ${subClass}`}>{sub}</div>
    </div>
  );
}

/**
 * The 800×480 mini board for the 7″ DSI panel. Projection-led: where we land on
 * Jan 1 at the current pace, this week's close directive, and a four-tile
 * action queue. Rendered inside FitToScreen(800×480).
 */
export function KioskMini({ metrics, status }: KioskMiniProps) {
  const v = deriveMiniView(metrics);
  const stale = status === 'stale';
  const projColor = signalTextClass(v.projectionSignal);
  const projSoft = v.onTrack ? 'rgba(150,203,57,0.22)' : 'rgba(226,86,74,0.22)';

  return (
    <div className="relative flex h-[480px] w-[800px] flex-col gap-3 overflow-hidden bg-ink px-[22px] pb-4 pt-[18px] text-white">
      <CornerBrackets size={22} inset={10} />

      {/* header */}
      <div className="flex items-center justify-between">
        <span className="font-display text-xl italic tracking-[0.5px]">BACK NINE GOLF</span>
        <span className="flex items-center gap-[7px] text-xs uppercase tracking-[1.5px] text-text-label">
          {stale ? 'STALE · ' : ''}GOAL 100 · JAN 1, 2027 · {v.daysRemaining}D LEFT
          <span
            className={`ml-[6px] h-[7px] w-[7px] rounded-full ${
              stale ? 'bg-danger' : 'animate-bn-pulse bg-accent'
            }`}
          />
        </span>
      </div>

      {/* forecast hero */}
      <div className="flex items-center gap-[22px]">
        <div className="flex-none">
          <div className="text-sm font-semibold uppercase tracking-[3px] text-text-muted">
            Projected Jan 1 · at current pace
          </div>
          <div className="flex items-end gap-2">
            <span className={`font-display text-[118px] italic leading-[0.78] ${projColor}`}>
              {v.projected}
            </span>
            <span className="mb-[6px] font-display text-[52px] italic leading-none text-[#5c6773]">
              /100
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex justify-between text-sm uppercase tracking-[1px]">
            <span className="font-semibold text-white">{v.members} now</span>
            <span className={`font-semibold ${projColor}`}>{v.projectionVerdict}</span>
          </div>
          {/* bar: solid current over ghost projection */}
          <div className="relative h-[22px] overflow-hidden rounded border border-white/[0.08] bg-track">
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: v.projectedPctWidth, background: projSoft }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-dark to-accent"
              style={{ width: v.nowPctWidth }}
            />
          </div>
          <div className="text-[13px] tracking-[0.5px] text-text-muted">
            Trailing pace <span className="text-white">{v.trailingPace}/wk</span> · need{' '}
            <span className="text-white">{v.neededPerWeek}/wk</span> to reach 100
          </div>
        </div>
      </div>

      {/* weekly directive */}
      <div
        className={`flex items-center justify-between rounded-lg border px-[18px] py-[10px] ${weekBandClasses(
          v.week.signal,
        )}`}
      >
        <div className="flex items-baseline gap-[14px]">
          <span className="text-[15px] font-bold uppercase tracking-[3px] text-text-muted">
            This Week
          </span>
          <span
            className={`font-display text-[34px] italic leading-none ${signalTextClass(
              v.week.signal,
            )}`}
          >
            CLOSE {v.week.target}
          </span>
          <span className="text-xl text-text-soft">
            {v.week.done} done · {v.week.daysLeft} days left
          </span>
        </div>
        <div className="flex gap-[7px]">
          {v.week.dots.map((on, i) => (
            <span
              key={i}
              className={`h-5 w-5 rounded-full border-2 ${
                on ? dotOnClasses(v.week.signal) : 'border-white/25 bg-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      {/* action queue */}
      <div className="flex flex-1 gap-3">
        <ActionTile label="Trials to Call" signal={v.actions.trialsToCall.signal} sub={v.actions.trialsToCall.sub}>
          <div className={`font-display text-[40px] italic leading-[0.9] ${signalTextClass(v.actions.trialsToCall.signal)}`}>
            {v.actions.trialsToCall.value}
          </div>
        </ActionTile>

        <ActionTile
          label="Gmail Inbox"
          signal={v.actions.inbox.signal}
          sub={`avg reply ${v.actions.inbox.avgResponse}`}
          subClass={signalTextClass(v.actions.inbox.responseSignal)}
        >
          <div className="flex items-baseline gap-[5px]">
            <span className={`font-display text-[40px] italic leading-[0.9] ${signalTextClass(v.actions.inbox.signal)}`}>
              {v.actions.inbox.value}
            </span>
            <span className="text-base text-text-muted">emails</span>
          </div>
        </ActionTile>

        <ActionTile label="Last Signup" signal={v.actions.lastSignup.signal} sub={v.actions.lastSignup.sub}>
          <div className="flex items-baseline gap-[5px]">
            <span className={`font-display text-[40px] italic leading-[0.9] ${signalTextClass(v.actions.lastSignup.signal)}`}>
              {v.actions.lastSignup.days}
            </span>
            <span className="text-base text-text-muted">days ago</span>
          </div>
        </ActionTile>

        <ActionTile
          label="Social Runway"
          signal={v.actions.social.signal}
          sub={v.actions.social.sub}
          subClass={signalTextClass(v.actions.social.signal)}
        >
          <div className="flex items-baseline gap-[5px]">
            <span className={`font-display text-[40px] italic leading-[0.9] ${signalTextClass(v.actions.social.signal)}`}>
              {v.actions.social.queued}
            </span>
            <span className="text-base text-text-muted">queued</span>
          </div>
        </ActionTile>
      </div>
    </div>
  );
}
