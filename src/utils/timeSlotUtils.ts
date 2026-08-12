/**
 * Standardized time slot calculation utilities
 * Ensures consistent time slot formatting and calculation across all components
 */

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
  duration: number; // minutes
}

/**
 * Format a date to HH:MM string
 */
export function formatTimeHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Parse HH:MM string to minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate time slot based on duration and end time (actual completion)
 */
export function calculateTimeSlotFromEnd(endTime: Date, durationMinutes: number): TimeSlot {
  const startTime = new Date(endTime.getTime() - durationMinutes * 60000);
  return {
    start: formatTimeHHMM(startTime),
    end: formatTimeHHMM(endTime),
    duration: durationMinutes
  };
}

/**
 * Calculate time slot based on duration and start time (scheduled)
 */
export function calculateTimeSlotFromStart(startTime: Date, durationMinutes: number): TimeSlot {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  return {
    start: formatTimeHHMM(startTime),
    end: formatTimeHHMM(endTime),
    duration: durationMinutes
  };
}

/**
 * Format time slot as display string "HH:MM - HH:MM"
 */
export function formatTimeSlotDisplay(timeSlot: TimeSlot): string {
  return `${timeSlot.start} - ${timeSlot.end}`;
}

/**
 * Calculate next time slot given current time and duration
 * (used for sequential scheduling)
 */
export function calculateNextTimeSlot(currentHour: number, currentMinute: number, durationMinutes: number): TimeSlot {
  const startMins = currentHour * 60 + currentMinute;
  const endMins = startMins + durationMinutes;
  
  const endHour = Math.floor(endMins / 60);
  const endMinute = endMins % 60;
  
  return {
    start: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
    end: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
    duration: durationMinutes
  };
}

/**
 * Get current time slot for a session that just completed
 * This is the standard way to calculate actual session times
 */
export function getCurrentSessionTimeSlot(durationMinutes: number): TimeSlot {
  const now = new Date();
  return calculateTimeSlotFromEnd(now, durationMinutes);
}

/**
 * Parse a single time string (e.g., "12:15" or "1:30 PM") into minutes since midnight.
 * Automatically adds 24 hours to logical late-night times (00:00 - 05:59) to keep them at the end of the day.
 */
function parseSingleTimeToMinutes(hStr: string, mStr: string, ampm?: string): number {
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (ampm) {
    const isPM = ampm.toLowerCase() === 'pm';
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
  }
  // Logical day mapping: Treat 00:00 to 05:59 as late night (add 24h)
  if (h < 6) h += 24;
  return h * 60 + m;
}

/**
 * Extract the start time in minutes from a time slot string.
 */
export function getStartMinutesFromTimeSlot(timeSlot?: string): number {
  if (!timeSlot) return 9999;
  const singleMatch = timeSlot.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
  if (!singleMatch) return 9999;
  return parseSingleTimeToMinutes(singleMatch[1], singleMatch[2], singleMatch[3]);
}

/**
 * Parse a full time slot range string into start and end minutes.
 */
export function parseTimeSlotToRange(timeStr?: string): { startMins: number, endMins: number } | null {
  if (!timeStr) return null;
  // Match full range "HH:MM [AM/PM] - HH:MM [AM/PM]"
  const rangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
  if (rangeMatch) {
    return {
      startMins: parseSingleTimeToMinutes(rangeMatch[1], rangeMatch[2], rangeMatch[3]),
      endMins: parseSingleTimeToMinutes(rangeMatch[4], rangeMatch[5], rangeMatch[6])
    };
  }
  
  // Try single time (fallback)
  const singleMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
  if (singleMatch) {
    const startMins = parseSingleTimeToMinutes(singleMatch[1], singleMatch[2], singleMatch[3]);
    return { startMins, endMins: startMins + 60 };
  }

  return null;
}