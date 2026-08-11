/**
 * Returns YYYY-MM-DD in the user's local timezone.
 * Avoids the UTC-shift bug where new Date().toISOString() returns yesterday's date
 * between 00:00 and 05:30 AM in IST (+05:30).
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateKey(date: Date = new Date()): string {
  return toLocalDateString(date);
}
