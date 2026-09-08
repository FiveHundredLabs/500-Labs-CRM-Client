/**
 * Returns a date formatted as YYYY-MM-DD in local time
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns yesterday's date formatted as YYYY-MM-DD in local time
 */
export function getYesterdayDateString(date: Date = new Date()): string {
  const target = new Date(date);
  target.setDate(target.getDate() - 1);
  return getLocalDateString(target);
}

/**
 * Returns the Monday (start of current week) date string YYYY-MM-DD in local time.
 * (Week starts on Monday; if today is Sunday, Monday was 6 days ago).
 */
export function getStartOfCurrentWeekString(date: Date = new Date()): string {
  const target = new Date(date);
  const day = target.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const distanceToMonday = day === 0 ? 6 : day - 1;
  target.setDate(target.getDate() - distanceToMonday);
  return getLocalDateString(target);
}

/**
 * Validates whether an expense date is within the current week up to today.
 * Blocks previous weeks and future dates.
 */
export function validateExpenseDate(
  dateStr: string,
  now: Date = new Date()
): { isValid: boolean; error?: string; minDate: string; maxDate: string } {
  const startOfWeek = getStartOfCurrentWeekString(now);
  const today = getLocalDateString(now);
  const normalized = dateStr ? dateStr.slice(0, 10) : '';

  if (!normalized) {
    return { isValid: false, error: 'Please select a disbursement date.', minDate: startOfWeek, maxDate: today };
  }

  if (normalized > today) {
    return {
      isValid: false,
      error: `Future-dated expenses are not allowed. Date cannot be after today (${today}).`,
      minDate: startOfWeek,
      maxDate: today,
    };
  }

  if (normalized < startOfWeek) {
    return {
      isValid: false,
      error: `Expenses can only be recorded for the current week (between ${startOfWeek} and ${today}). Dates from prior weeks are not permitted.`,
      minDate: startOfWeek,
      maxDate: today,
    };
  }

  return { isValid: true, minDate: startOfWeek, maxDate: today };
}

/**
 * Validates whether a petty cash entry date is today or yesterday.
 * Blocks older dates and future dates.
 */
export function validatePettyCashDate(
  dateStr: string,
  now: Date = new Date()
): { isValid: boolean; error?: string; minDate: string; maxDate: string } {
  const yesterday = getYesterdayDateString(now);
  const today = getLocalDateString(now);
  const normalized = dateStr ? dateStr.slice(0, 10) : '';

  if (!normalized) {
    return { isValid: false, error: 'Please select a date.', minDate: yesterday, maxDate: today };
  }

  if (normalized > today) {
    return {
      isValid: false,
      error: `Future-dated petty cash entries are not allowed. Date cannot be after today (${today}).`,
      minDate: yesterday,
      maxDate: today,
    };
  }

  if (normalized < yesterday) {
    return {
      isValid: false,
      error: `Petty cash entries are strictly allowed only for yesterday (${yesterday}) and today (${today}). Older dates are not permitted.`,
      minDate: yesterday,
      maxDate: today,
    };
  }

  return { isValid: true, minDate: yesterday, maxDate: today };
}
