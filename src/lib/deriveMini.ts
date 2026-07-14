import type { DashboardMetrics } from '../data';
import { daysUntil } from './format';

/**
 * View model for the 800×480 mini board (7″ DSI panel). Where the full board
 * shows current state, the mini leads with a PROJECTION — "at this pace, where
 * do we land on Jan 1?" — plus this week's directive and an action queue.
 * Mirrors the Claude Design `KioskMini` renderVals, including its color thresholds.
 */

/** Traffic-light status for an action-queue tile. */
export type Signal = 'good' | 'warn' | 'bad';

export interface MiniView {
  daysRemaining: number;
  members: number;
  trailingPace: number;
  neededPerWeek: number;

  projected: number;
  onTrack: boolean;
  projectionSignal: Signal; // good | bad
  projectionVerdict: string; // "↑ ON TRACK FOR 100" | "96 — SHORT BY 4"
  nowPctWidth: string;
  projectedPctWidth: string;

  week: {
    target: number;
    done: number;
    daysLeft: number;
    signal: Signal;
    /** One entry per target member; true = closed. */
    dots: boolean[];
  };

  actions: {
    trialsToCall: { value: number; signal: Signal; sub: string };
    inbox: { value: number; signal: Signal; avgResponse: string; responseSignal: Signal };
    lastSignup: { days: number; signal: Signal; sub: string };
    social: { queued: number; signal: Signal; sub: string };
  };
}

const band = (value: number, good: number, warn: number): Signal =>
  value <= good ? 'good' : value <= warn ? 'warn' : 'bad';

export function deriveMiniView(m: DashboardMetrics, now: Date = new Date()): MiniView {
  const { goal, weekly, operations } = m;

  const daysRemaining = daysUntil(goal.targetDate, now);
  const weeksLeft = daysRemaining / 7;
  const projected = Math.round(goal.activeMembers + goal.trailingPacePerWeek * weeksLeft);
  const onTrack = projected >= goal.target;

  const weekMet = weekly.done >= weekly.target;
  const weekSignal: Signal = weekMet ? 'good' : weekly.done > 0 ? 'warn' : 'bad';
  const dots = Array.from({ length: Math.max(0, weekly.target) }, (_, i) => i < weekly.done);

  const respHrs = operations.avgResponseHours;
  const avgResponse = respHrs < 1 ? `${Math.round(respHrs * 60)}m` : `${respHrs}h`;

  const signup = operations.daysSinceLastSignup;
  const runway = operations.socialRunwayDays;

  return {
    daysRemaining,
    members: goal.activeMembers,
    trailingPace: goal.trailingPacePerWeek,
    neededPerWeek: goal.neededPerWeek,

    projected,
    onTrack,
    projectionSignal: onTrack ? 'good' : 'bad',
    projectionVerdict: onTrack
      ? '↑ ON TRACK FOR 100'
      : `${projected} — SHORT BY ${goal.target - projected}`,
    nowPctWidth: `${Math.min(100, goal.activeMembers)}%`,
    projectedPctWidth: `${Math.min(100, projected)}%`,

    week: {
      target: weekly.target,
      done: weekly.done,
      daysLeft: weekly.daysLeft,
      signal: weekSignal,
      dots,
    },

    actions: {
      trialsToCall: {
        value: operations.trialsToCall,
        signal: operations.trialsToCall === 0 ? 'good' : operations.trialsToCall <= 2 ? 'warn' : 'bad',
        sub: operations.trialsToCall === 0 ? 'all followed up' : 'follow up within 24h',
      },
      inbox: {
        value: operations.gmailInbox,
        signal: band(operations.gmailInbox, 5, 15),
        avgResponse,
        responseSignal: band(respHrs, 4, 12),
      },
      lastSignup: {
        days: signup,
        signal: band(signup, 3, 7),
        sub: signup <= 3 ? 'momentum good' : signup <= 7 ? 'cooling off' : 'stalled — push',
      },
      social: {
        queued: operations.socialQueued,
        // higher runway is better, so invert the banding
        signal: runway >= 5 ? 'good' : runway >= 2 ? 'warn' : 'bad',
        sub: runway >= 2 ? `${runway}d covered` : 'nothing scheduled',
      },
    },
  };
}
