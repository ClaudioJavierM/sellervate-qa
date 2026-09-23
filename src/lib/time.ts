// The team works from Spain, so "yesterday" means yesterday in Madrid, not in
// UTC or in whatever timezone the server happens to run.
export const TEAM_TIME_ZONE = 'Europe/Madrid';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Midnight of the team's calendar day containing `at`, as a UTC instant. */
export function startOfTeamDay(at: Date = new Date()): Date {
  const offset = zoneOffsetMs(at, TEAM_TIME_ZONE);
  const local = new Date(at.getTime() + offset);
  const midnightLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnightLocal - offset);
}

export type Window = 'yesterday' | 'today' | 'week';
export const WINDOWS: { key: Window; label: string }[] = [
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
];

export function windowRange(window: Window, now: Date = new Date()): { from: Date; to: Date } {
  const today = startOfTeamDay(now);
  switch (window) {
    case 'today':
      return { from: today, to: now };
    case 'week':
      return { from: new Date(today.getTime() - 7 * DAY), to: now };
    default:
      return { from: startOfTeamDay(new Date(today.getTime() - DAY / 2)), to: today };
  }
}

export function parseWindow(value: unknown): Window {
  return value === 'today' || value === 'week' ? value : 'yesterday';
}

/** "3h 20m", "45m", "1d 6h" */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / MINUTE));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TEAM_TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TEAM_TIME_ZONE, day: 'numeric', month: 'short' });

/** "Today 14:32", "Yesterday 09:05", "12 Sep 11:40" */
export function formatSentAt(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const today = startOfTeamDay(now).getTime();
  const time = timeFmt.format(at);
  if (at.getTime() >= today) return `Today ${time}`;
  if (at.getTime() >= startOfTeamDay(new Date(today - DAY / 2)).getTime()) return `Yesterday ${time}`;
  return `${dateFmt.format(at)} ${time}`;
}

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}
