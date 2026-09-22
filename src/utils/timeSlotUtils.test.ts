import { describe, it, expect } from 'vitest';
import {
  calculateNextTimeSlot,
  formatTimeSlotDisplay,
  formatTimeHHMM,
  parseTimeToMinutes,
  calculateTimeSlotFromEnd,
  calculateTimeSlotFromStart,
  getStartMinutesFromTimeSlot,
  parseTimeSlotToRange,
} from './timeSlotUtils';

describe('timeSlotUtils', () => {
  it('formats normal daytime sequential time slots', () => {
    const slot = calculateNextTimeSlot(10, 0, 90);
    expect(slot.start).toBe('10:00');
    expect(slot.end).toBe('11:30');
    expect(slot.duration).toBe(90);
    expect(formatTimeSlotDisplay(slot)).toBe('10:00 - 11:30');
  });

  it('prevents 24:00+ hour overflow when session crosses midnight (BUG-29)', () => {
    // 23:00 + 90 mins should be 00:30, NOT 24:30
    const midnightSlot = calculateNextTimeSlot(23, 0, 90);
    expect(midnightSlot.start).toBe('23:00');
    expect(midnightSlot.end).toBe('00:30');
    expect(midnightSlot.end).not.toContain('24:');

    // 23:30 + 60 mins should be 00:30
    const lateSlot = calculateNextTimeSlot(23, 30, 60);
    expect(lateSlot.start).toBe('23:30');
    expect(lateSlot.end).toBe('00:30');

    // 22:00 + 180 mins should be 01:00, NOT 25:00
    const multiHourMidnightSlot = calculateNextTimeSlot(22, 0, 180);
    expect(multiHourMidnightSlot.start).toBe('22:00');
    expect(multiHourMidnightSlot.end).toBe('01:00');
  });

  it('calculates time slots from start and end dates correctly', () => {
    const baseDate = new Date('2026-09-04T14:30:00Z');
    const fromEnd = calculateTimeSlotFromEnd(baseDate, 60);
    expect(fromEnd.duration).toBe(60);
    expect(fromEnd.start).toBeDefined();
    expect(fromEnd.end).toBeDefined();

    const fromStart = calculateTimeSlotFromStart(baseDate, 45);
    expect(fromStart.duration).toBe(45);
  });

  it('parses time strings to minutes and ranges correctly', () => {
    expect(parseTimeToMinutes('08:30')).toBe(510);
    expect(getStartMinutesFromTimeSlot('08:30 AM - 10:00 AM')).toBe(510);
    
    const range = parseTimeSlotToRange('09:00 - 10:30');
    expect(range).not.toBeNull();
    expect(range?.startMins).toBe(540);
    expect(range?.endMins).toBe(630);
  });
});
