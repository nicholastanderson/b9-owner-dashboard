import type { ReactNode } from 'react';
import type { BoardView } from '../lib/derive';
import { toneTextClass } from './tone';

/** Accent-bar + label heading for a metric column. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[14px] flex items-center gap-[10px]">
      <span className="inline-block h-4 w-[6px] bg-accent" />
      <span className="text-[19px] font-bold uppercase tracking-[4px] text-text-soft">
        {children}
      </span>
    </div>
  );
}

/** Small uppercase metric label. */
function StatLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-base uppercase tracking-[2px] text-text-label">{children}</div>
  );
}

const Divider = () => <div className="h-px bg-white/[0.06]" />;

/** The three glanceable columns: Money, Utilization, Funnel. */
export function MetricColumns({ view }: { view: BoardView }) {
  const { money, utilization, funnel } = view;

  return (
    <div className="mt-[22px] flex flex-1">
      {/* MONEY */}
      <div className="flex flex-1 flex-col pr-10">
        <SectionLabel>Money</SectionLabel>
        <div className="flex flex-col gap-4">
          <div>
            <StatLabel>Monthly Recurring Revenue</StatLabel>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[52px] italic leading-[1.05]">{money.mrr}</span>
              <span className={`text-xl font-semibold ${toneTextClass(money.mrrTone)}`}>
                {money.mrrDelta}
              </span>
            </div>
          </div>
          <Divider />
          <div>
            <StatLabel>Net Member Movement · MTD</StatLabel>
            <div className="flex items-baseline gap-3">
              <span
                className={`font-display text-[52px] italic leading-[1.05] ${toneTextClass(
                  money.netMovementTone,
                )}`}
              >
                {money.netMovement}
              </span>
              <span className="text-xl text-text-muted">
                {money.newCount} new · {money.cancelCount} cancelled
              </span>
            </div>
          </div>
          <Divider />
          <div>
            <StatLabel>Revenue MTD vs Last Month</StatLabel>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[52px] italic leading-[1.05]">
                {money.revenueMtd}
              </span>
              <span className={`text-xl font-semibold ${toneTextClass(money.revenueTone)}`}>
                {money.revenueDelta}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-px bg-white/[0.07]" />

      {/* UTILIZATION */}
      <div className="flex flex-1 flex-col px-10">
        <SectionLabel>Utilization</SectionLabel>
        <div className="flex flex-col gap-4">
          <div>
            <StatLabel>Bookings Today</StatLabel>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[52px] italic leading-[1.05]">
                {utilization.bookingsToday}
              </span>
              <span className="text-xl text-text-muted">{utilization.bayHours} bay-hrs</span>
            </div>
          </div>
          <Divider />
          <div>
            <StatLabel>Bay Occupancy · Today</StatLabel>
            <div className="flex items-center gap-[14px]">
              <span className="font-display text-[52px] italic leading-[1.05] text-accent">
                {utilization.occupancyLabel}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-[3px] bg-track">
                <div className="h-full bg-accent" style={{ width: utilization.occupancyWidth }} />
              </div>
            </div>
          </div>
          <Divider />
          <div>
            <StatLabel>Bookings This Week vs Last</StatLabel>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[52px] italic leading-[1.05]">
                {utilization.bookingsThisWeek}
              </span>
              <span className={`text-xl font-semibold ${toneTextClass(utilization.bookingsTone)}`}>
                {utilization.bookingsDelta}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-px bg-white/[0.07]" />

      {/* FUNNEL */}
      <div className="flex flex-1 flex-col pl-10">
        <SectionLabel>Funnel</SectionLabel>
        <div className="flex flex-col gap-4">
          <div>
            <StatLabel>New Leads This Week</StatLabel>
            <div className="font-display text-[52px] italic leading-[1.05]">{funnel.leads}</div>
          </div>
          <Divider />
          <div>
            <StatLabel>Demo / Trial Bookings</StatLabel>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[52px] italic leading-[1.05]">
                {funnel.trialsBooked}
              </span>
              <span className="text-xl text-text-muted">booked this week</span>
            </div>
          </div>
          <Divider />
          <div>
            <StatLabel>Trials → Members</StatLabel>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[52px] italic leading-[1.05] text-accent">
                {funnel.trialsConverted}
              </span>
              <span className="text-xl text-text-muted">
                converted · {funnel.conversionRate} rate
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
