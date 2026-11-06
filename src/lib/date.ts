/** Local calendar helpers. All wear logging is per local day. */

export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(fromIso: string, now: Date): number {
  const from = new Date(fromIso);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function lastWornLabel(lastWornAt: string | null, now: Date = new Date()): string {
  if (!lastWornAt) return 'never worn';
  const days = daysBetween(lastWornAt, now);
  if (days <= 0) return 'worn today';
  if (days === 1) return 'worn yesterday';
  if (days < 7) return `worn ${days} days ago`;
  if (days < 14) return 'worn last week';
  if (days < 60) return `worn ${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `worn ${Math.round(days / 30)} months ago`;
  return 'worn over a year ago';
}

export function wearLabel(count: number): string {
  if (count === 0) return 'never worn';
  if (count === 1) return 'worn once';
  return `worn ${count} times`;
}

export function plural(count: number, one: string, many?: string): string {
  return count === 1 ? one : many ?? `${one}s`;
}

export function timeGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'still up?';
  if (hour < 12) return 'good morning.';
  if (hour < 18) return 'good afternoon.';
  return 'good evening.';
}
