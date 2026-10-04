/**
 * Utility helpers for the delivery/rejection date selection feature.
 *
 * Business rules:
 * - Before 12:00 PM today → "Today" and "Yesterday" are available.
 * - After  12:00 PM today → Only "Today" is available.
 */

/** Returns the ISO date string (YYYY-MM-DD) for today in local time. */
export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns the ISO date string (YYYY-MM-DD) for yesterday in local time. */
export function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns whether "Yesterday" is currently an allowed option.
 * Only allowed strictly before 12:00 PM local time.
 */
export function isYesterdayAllowed(): boolean {
  return new Date().getHours() < 12;
}

/** Human-readable label for today's date, e.g. "Today (Oct 4)" */
export function todayLabel(): string {
  const d = new Date();
  return `Today (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
}

/** Human-readable label for yesterday's date, e.g. "Yesterday (Oct 3)" */
export function yesterdayLabel(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `Yesterday (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
}
