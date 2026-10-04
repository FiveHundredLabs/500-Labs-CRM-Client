/**
 * Utility helpers for the delivery/rejection date selection feature.
 *
 * All business operations run in the CRM business timezone (Asia/Colombo, UTC+05:30).
 *
 * Business rules:
 * - Before 12:00 PM today → "Today" and "Yesterday" are available.
 * - After  12:00 PM today → Only "Today" is available.
 */

export const CRM_TIMEZONE = 'Asia/Colombo';

/** Returns the ISO date string (YYYY-MM-DD) for today in Asia/Colombo time. */
export function getTodayDateStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CRM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Returns the ISO date string (YYYY-MM-DD) for yesterday in Asia/Colombo time. */
export function getYesterdayDateStr(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CRM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Returns whether "Yesterday" is currently an allowed option.
 * Only allowed strictly before 12:00 PM Asia/Colombo time.
 */
export function isYesterdayAllowed(): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CRM_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const hp = parts.find((p) => p.type === 'hour');
    const hour = hp ? parseInt(hp.value, 10) : new Date().getHours();
    return hour < 12;
  } catch {
    return new Date().getHours() < 12;
  }
}

/** Human-readable label for today's date, e.g. "Today (Oct 4)" */
export function todayLabel(): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: CRM_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(new Date());
  return `Today (${formatted})`;
}

/** Human-readable label for yesterday's date, e.g. "Yesterday (Oct 3)" */
export function yesterdayLabel(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: CRM_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(d);
  return `Yesterday (${formatted})`;
}

/**
 * Formats an order's action/creation timestamp in Asia/Colombo timezone as "MMM dd" (e.g. "Oct 04").
 * Guarantees that users in any browser or device timezone see the exact same date as the database.
 */
export function formatOrderDisplayDate(dateVal?: string | Date | null): string {
  if (!dateVal) return '-';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: CRM_TIMEZONE,
      month: 'short',
      day: '2-digit',
    }).format(d);
  } catch {
    return '-';
  }
}

/**
 * Converts any date or ISO timestamp into "YYYY-MM-DD" in Asia/Colombo timezone.
 * Used for date filtering comparisons so client and server match 100%.
 */
export function toColomboDateString(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string' && dateVal.length === 10 && dateVal[4] === '-' && dateVal[7] === '-') {
    return dateVal;
  }
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: CRM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}
