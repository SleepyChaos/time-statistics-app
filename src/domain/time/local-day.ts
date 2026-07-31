export const HOURS_PER_DAY = 24;
export const VISIBLE_HOURS = 6;

export function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function addLocalDays(timestamp: number, days: number) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

export function defaultVisibleStartHour(timestamp: number) {
  const currentHour = new Date(timestamp).getHours();
  return Math.min(HOURS_PER_DAY - VISIBLE_HOURS, Math.max(0, currentHour - 3));
}

