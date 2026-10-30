import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

/**
 * Date formatting for a Bangladesh audience.
 *
 * Everything is rendered in Asia/Dhaka. Dates from the database are
 * date-only strings (no timezone), so they are parsed as local dates to
 * avoid the classic off-by-one when a UTC timestamp crosses midnight.
 */
export const TIMEZONE = 'Asia/Dhaka';

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  // Bare YYYY-MM-DD is a calendar date, not an instant.
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** "Fri, 20 Mar 2026" */
export function formatEventDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'EEE, d MMM yyyy') : '—';
}

/** "20 Mar 2026" */
export function formatDateShort(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'd MMM yyyy') : '—';
}

/** "20 Mar 2026, 7:30 pm" */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy, h:mm aaa") : '—';
}

/** "7:30 pm" from a bare HH:MM time column. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = toDate(`1970-01-01T${value}`);
  return parsed ? format(parsed, 'h:mm aaa') : value;
}

/** "3 days ago" */
export function relativeDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return `${formatDistanceToNowStrict(date)} ago`;
}

/** "in 12 days" / "today" / "3 days ago" */
export function countdown(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

/** Hours between now and an event date/time — used by refund tiers. */
export function hoursUntil(dateValue: string, timeValue?: string | null): number {
  const target = new Date(`${dateValue}T${timeValue ?? '00:00'}:00+06:00`);
  return (target.getTime() - Date.now()) / 3_600_000;
}

export function isoDate(value: Date = new Date()): string {
  return value.toISOString().slice(0, 10);
}
