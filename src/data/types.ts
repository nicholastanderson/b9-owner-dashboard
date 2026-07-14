/**
 * Domain model for the Pulse Board.
 *
 * These types are the contract between the data layer and the UI. Every data
 * source (mock JSON today; GoHighLevel / QuickBooks / Google Business later)
 * must produce a `DashboardMetrics`. The UI never talks to a source directly —
 * it only ever sees this shape, so sources can be swapped without touching a
 * single component.
 *
 * Keep these fields RAW and semantic (counts, dollars, ISO dates). All display
 * derivation (percentages, "on pace" vs "behind", colors, formatting) lives in
 * `src/lib/derive.ts`, not here.
 */

/** Progress toward the 100-members-by-Jan-1-2027 goal. */
export interface MembershipGoal {
  /** Current active members. */
  activeMembers: number;
  /** The target member count (100). */
  target: number;
  /** ISO date (YYYY-MM-DD) the target must be hit by. */
  targetDate: string;
  /** Net members gained this week (new minus cancelled). Can be negative. */
  netThisWeek: number;
  /** Members-per-week needed from now to hit the goal on time. */
  neededPerWeek: number;
  /**
   * Trailing weekly acquisition rate used to PROJECT the Jan-1 total (the
   * 800×480 mini board's hero). Smoothed over recent weeks, so it can differ
   * from this week's raw `netThisWeek`.
   */
  trailingPacePerWeek: number;
}

/** This week's acquisition directive (mini board). */
export interface WeeklyDirective {
  /** Members to close this week to stay on pace. */
  target: number;
  /** Members closed so far this week. */
  done: number;
  /** Days left in the current week. */
  daysLeft: number;
}

/**
 * Operational "act on this now" signals for the mini board's action queue.
 * These come from operational tools (CRM trial list, Gmail, social scheduler)
 * rather than the headline money/funnel sources.
 */
export interface OperationsMetrics {
  /** Trials awaiting a follow-up call. */
  trialsToCall: number;
  /** Unread/open emails in the shared inbox. */
  gmailInbox: number;
  /** Average first-response time to inbound, in hours. */
  avgResponseHours: number;
  /** Days since the most recent new-member signup. */
  daysSinceLastSignup: number;
  /** Social posts queued/scheduled. */
  socialQueued: number;
  /** Days of scheduled social content remaining. */
  socialRunwayDays: number;
}

/** Money row — MRR, net member movement, revenue. */
export interface MoneyMetrics {
  /** Monthly recurring revenue, in dollars. */
  mrr: number;
  /** Change in MRR vs last month, in dollars. Signed. */
  mrrDeltaMoM: number;
  /** Net member movement month-to-date (new minus cancelled). Signed. */
  netMemberMovementMtd: number;
  /** New members month-to-date. */
  newMembersMtd: number;
  /** Cancelled members month-to-date. */
  cancelledMtd: number;
  /** Revenue month-to-date, in dollars. */
  revenueMtd: number;
  /** Revenue MTD vs the same point last month, as a percent. Signed. */
  revenueDeltaPctVsLastMonth: number;
}

/** Utilization row — bays and bookings. */
export interface UtilizationMetrics {
  bookingsToday: number;
  /** Total bay-hours booked today. */
  bayHoursToday: number;
  /** Bay occupancy today, 0–100. */
  bayOccupancyPct: number;
  bookingsThisWeek: number;
  /** Bookings this week vs last week, as a percent. Signed. */
  bookingsDeltaPctWoW: number;
}

/** Funnel row — leads, trials, conversions. */
export interface FunnelMetrics {
  newLeadsThisWeek: number;
  /** Demo / trial bookings this week. */
  trialsBooked: number;
  /** Trials that converted to members. */
  trialsConverted: number;
}

/** Ambient row — reputation + the rotating "needle-mover" prompts. */
export interface AmbientMetrics {
  /** Google rating, e.g. 4.8. */
  googleRating: number;
  /** Total Google review count. */
  googleReviews: number;
  /**
   * One or more "today's needle-mover" lines. The footer rotates through them
   * on an interval. Order is priority order.
   */
  needleMovers: string[];
}

/** Everything the board needs for one render. */
export interface DashboardMetrics {
  /** When this snapshot was produced at the source, ISO 8601. */
  updatedAt: string;
  goal: MembershipGoal;
  money: MoneyMetrics;
  utilization: UtilizationMetrics;
  funnel: FunnelMetrics;
  ambient: AmbientMetrics;
  /** This week's close directive (used by the 800×480 mini board). */
  weekly: WeeklyDirective;
  /** Operational action-queue signals (used by the 800×480 mini board). */
  operations: OperationsMetrics;
}

/**
 * The one interface every data source implements. Add a class next to the mock
 * adapter (e.g. `GoHighLevelAdapter`) and select it in `src/data/index.ts`.
 */
export interface MetricsAdapter {
  /** Fetch the latest metrics. Should reject on failure so the UI can go stale. */
  getMetrics(): Promise<DashboardMetrics>;
}
