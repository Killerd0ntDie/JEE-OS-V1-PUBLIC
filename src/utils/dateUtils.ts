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

/**
 * Returns an array of upcoming valid JEE exam target years dynamically calculated
 * based on the current date.
 * 
 * If the current month is June (5) or later, the exam for the current year is assumed
 * to be over, and the valid target years start from the next year.
 * 
 * @param count The number of target years to generate (default: 3)
 * @returns Array of target years as strings, e.g. ['2027', '2028', '2029']
 */
export function getValidTargetYears(count: number = 3): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 5 = June)

  // JEE Advanced is usually late May. If we are in June or later, the current year's exam is over.
  const startYear = currentMonth >= 5 ? currentYear + 1 : currentYear;

  const validYears: string[] = [];
  for (let i = 0; i < count; i++) {
    validYears.push((startYear + i).toString());
  }

  return validYears;
}
