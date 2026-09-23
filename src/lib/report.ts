// Pure aggregation for the brand report. No I/O, so it is the first thing to
// put under unit tests.
//
// Everything is bucketed by when the reply was SENT, not when it was reviewed:
// the question a brand asks is "were the replies we got in August better?",
// and reviews happen days later and in batches.

import type { Severity } from './scores';
import { startOfTeamDay, TEAM_TIME_ZONE } from './time';

const DAY = 24 * 60 * 60_000;
const ROLLING_WEEKS = 4;
/** Below this many reviews in a window, a number is shown but flagged as thin. */
export const MIN_SAMPLE = 8;

export type ReviewFact = {
  score: number;
  sentAt: string;
  authorId: string;
  authorName: string;
  issues: string[];
};

export type IssueInfo = { key: string; label: string; severity: Severity };

const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TEAM_TIME_ZONE, weekday: 'short' });
const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Monday 00:00 (team timezone) of the week containing `at`. */
export function startOfTeamWeek(at: Date): Date {
  const day = startOfTeamDay(at);
  const back = WEEKDAY_INDEX[weekdayFmt.format(day)] ?? 0;
  // Step back by days, re-anchoring each time so a DST change mid-week is absorbed.
  return startOfTeamDay(new Date(day.getTime() - back * DAY + DAY / 2));
}

export function reportStart(weeks: number, now: Date = new Date()): Date {
  return startOfTeamWeek(new Date(startOfTeamWeek(now).getTime() - (weeks - 1) * 7 * DAY + DAY / 2));
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export type WeekPoint = {
  start: string;
  reviews: number;
  replies: number;
  average: number | null;
  /** Average of every review in this week and the three before it. */
  rolling: number | null;
  rollingReviews: number;
};

export function weeklyTrend(facts: ReviewFact[], replySentAts: string[], weeks: number, now = new Date()): WeekPoint[] {
  const first = reportStart(weeks, now).getTime();
  const starts = Array.from({ length: weeks }, (_, i) => startOfTeamWeek(new Date(first + i * 7 * DAY + DAY / 2)));
  const indexOf = (iso: string) => {
    const t = new Date(iso).getTime();
    for (let i = starts.length - 1; i >= 0; i -= 1) if (t >= starts[i].getTime()) return i;
    return -1;
  };

  const scores: number[][] = starts.map(() => []);
  const replies = starts.map(() => 0);
  for (const f of facts) {
    const i = indexOf(f.sentAt);
    if (i >= 0) scores[i].push(f.score);
  }
  for (const sentAt of replySentAts) {
    const i = indexOf(sentAt);
    if (i >= 0) replies[i] += 1;
  }

  return starts.map((start, i) => {
    const window = scores.slice(Math.max(0, i - ROLLING_WEEKS + 1), i + 1).flat();
    return {
      start: start.toISOString(),
      reviews: scores[i].length,
      replies: replies[i],
      average: mean(scores[i]),
      rolling: i >= ROLLING_WEEKS - 1 ? mean(window) : null,
      rollingReviews: window.length,
    };
  });
}

export type Comparison = { current: number | null; previous: number | null; currentN: number; previousN: number };

/** Last `span` weeks vs the `span` weeks before, by sent date. */
export function splitPeriods(facts: ReviewFact[], span: number, now = new Date()) {
  const cut = reportStart(span, now).getTime();
  const before = reportStart(span * 2, now).getTime();
  const current = facts.filter((f) => new Date(f.sentAt).getTime() >= cut);
  const previous = facts.filter((f) => {
    const t = new Date(f.sentAt).getTime();
    return t >= before && t < cut;
  });
  return { current, previous };
}

export function compareAverage(current: ReviewFact[], previous: ReviewFact[]): Comparison {
  return {
    current: mean(current.map((f) => f.score)),
    previous: mean(previous.map((f) => f.score)),
    currentN: current.length,
    previousN: previous.length,
  };
}

/** Share of reviewed replies with at least one issue of the given severity. */
export function compareSeverityRate(
  current: ReviewFact[], previous: ReviewFact[], issues: IssueInfo[], severity: Severity,
): Comparison {
  const keys = new Set(issues.filter((i) => i.severity === severity).map((i) => i.key));
  const rate = (xs: ReviewFact[]) => (xs.length ? xs.filter((f) => f.issues.some((k) => keys.has(k))).length / xs.length : null);
  return { current: rate(current), previous: rate(previous), currentN: current.length, previousN: previous.length };
}

export type IssueRow = IssueInfo & { current: number; previous: number; share: number };

/** How often each issue came up, recent period vs the one before, most frequent first. */
export function issueFrequency(current: ReviewFact[], previous: ReviewFact[], issues: IssueInfo[]): IssueRow[] {
  const count = (xs: ReviewFact[], key: string) => xs.filter((f) => f.issues.includes(key)).length;
  return issues
    .map((issue) => ({
      ...issue,
      current: count(current, issue.key),
      previous: count(previous, issue.key),
      share: current.length ? count(current, issue.key) / current.length : 0,
    }))
    .filter((row) => row.current + row.previous > 0)
    .sort((a, b) => b.current - a.current || b.previous - a.previous);
}

export type SpecialistRow = { authorId: string; name: string; average: number; reviews: number; critical: number };

export function bySpecialist(facts: ReviewFact[], issues: IssueInfo[]): SpecialistRow[] {
  const critical = new Set(issues.filter((i) => i.severity === 'critical').map((i) => i.key));
  const rows = new Map<string, { name: string; scores: number[]; critical: number }>();
  for (const f of facts) {
    const row = rows.get(f.authorId) ?? { name: f.authorName, scores: [], critical: 0 };
    row.scores.push(f.score);
    if (f.issues.some((k) => critical.has(k))) row.critical += 1;
    rows.set(f.authorId, row);
  }
  return [...rows.entries()]
    .map(([authorId, r]) => ({ authorId, name: r.name, average: mean(r.scores)!, reviews: r.scores.length, critical: r.critical }))
    .sort((a, b) => a.average - b.average);
}
