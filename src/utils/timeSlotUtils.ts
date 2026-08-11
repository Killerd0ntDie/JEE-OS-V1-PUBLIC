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