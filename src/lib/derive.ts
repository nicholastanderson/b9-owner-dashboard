import type { DashboardMetrics } from '../data';
import {
  daysUntil,
  deltaTone,
  formatCurrency,
  formatDelta,
  formatPercent,
  type DeltaTone,
} from './format';

/**
 * Turns raw `DashboardMetrics` into the fully-derived view model the board
 * renders. All "business logic" — percentages, on-pace vs behind, delta colors,
 * conversion rates, days remaining — lives here so components stay dumb and the
 * rules are testable in one place. Mirrors the Claude Design `renderVals`.
 */
export interface BoardView {
  onPace: boolean;
  hero: {
    members: number;
    goal: number;
    pctLabel: string; // "40%"
    pctWidth: string; // CSS width, "40%"
    remainingLabel: string; // "60 more"
    daysRemaining: number;
  };
  pace: {
    label: string; // "ON PACE" | "BEHIND PACE"
    netThisWeek: string; // "+3"
    neededPerWeek: number; // 2.1
    detail: string; // "+0.9 ahead of pace"
    tone: DeltaTone; // drives accent vs danger
  };
  money: {
    mrr: string;
    mrrDelta: string;
    mrrTone: DeltaTone;
    netMovement: string;
    netMovementTone: DeltaTone;
    newCount: number;
    cancelCount: number;
    revenueMtd: string;
    revenueDelta: string;
    revenueTone: DeltaTone;
  };
  utilization: {
    bookingsToday: number;
    bayHours: number;
    occupancyLabel: string; // "63%"
    occupancyWidth: string; // "63%"
    bookingsThisWeek: number;
    bookingsDelta: string;
    bookingsTone: DeltaTone;
  };
  funnel: {
    leads: number;
    trialsBooked: number;
    trialsConverted: number;
    conversionRate: string; // "67%"
  };
  ambient: {
    rating: number;
    reviews: number;
    needleMovers: string[];
  };
}

export function deriveBoardView(m: DashboardMetrics, now: Date = new Date()): BoardView {
  const { goal, money, utilization, funnel, ambient } = m;

  const pctNum = goal.target > 0 ? Math.round((goal.activeMembers / goal.target) * 100) : 0;
  const onPace = goal.netThisWeek >= goal.neededPerWeek;
  const paceGap = Number((goal.netThisWeek - goal.neededPerWeek).toFixed(1));

  const conversionRate =
    funnel.trialsBooked > 0
      ? formatPercent((funnel.trialsConverted / funnel.trialsBooked) * 100)
      : '—';

  return {
    onPace,
    hero: {
      members: goal.activeMembers,
      goal: goal.target,
      pctLabel: `${pctNum}%`,
      pctWidth: `${Math.min(100, pctNum)}%`,
      remainingLabel: `${Math.max(0, goal.target - goal.activeMembers)} more`,
      daysRemaining: daysUntil(goal.targetDate, now),
    },
    pace: {
      label: onPace ? 'ON PACE' : 'BEHIND PACE',
      netThisWeek: formatDelta(goal.netThisWeek),
      neededPerWeek: goal.neededPerWeek,
      detail: `${formatDelta(paceGap)} ${onPace ? 'ahead of pace' : 'under pace'}`,
      tone: onPace ? 'up' : 'down',
    },
    money: {
      mrr: formatCurrency(money.mrr),
      mrrDelta: formatDelta(money.mrrDeltaMoM, { money: true, suffix: ' MoM' }),
      mrrTone: deltaTone(money.mrrDeltaMoM),
      netMovement: formatDelta(money.netMemberMovementMtd),
      netMovementTone: deltaTone(money.netMemberMovementMtd),
      newCount: money.newMembersMtd,
      cancelCount: money.cancelledMtd,
      revenueMtd: formatCurrency(money.revenueMtd),
      revenueDelta: formatDelta(money.revenueDeltaPctVsLastMonth, { pct: true, suffix: ' vs LM' }),
      revenueTone: deltaTone(money.revenueDeltaPctVsLastMonth),
    },
    utilization: {
      bookingsToday: utilization.bookingsToday,
      bayHours: utilization.bayHoursToday,
      occupancyLabel: formatPercent(utilization.bayOccupancyPct),
      occupancyWidth: `${Math.min(100, Math.max(0, utilization.bayOccupancyPct))}%`,
      bookingsThisWeek: utilization.bookingsThisWeek,
      bookingsDelta: formatDelta(utilization.bookingsDeltaPctWoW, { pct: true, suffix: ' WoW' }),
      bookingsTone: deltaTone(utilization.bookingsDeltaPctWoW),
    },
    funnel: {
      leads: funnel.newLeadsThisWeek,
      trialsBooked: funnel.trialsBooked,
      trialsConverted: funnel.trialsConverted,
      conversionRate,
    },
    ambient: {
      rating: ambient.googleRating,
      reviews: ambient.googleReviews,
      needleMovers: ambient.needleMovers.length > 0 ? ambient.needleMovers : ['—'],
    },
  };
}
