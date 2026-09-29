// Format morning slot dynamically based on dayStartTime
export const formatMorningSlot = (startTime: string = "07:00"): string => {
  const parts = startTime.split(':');
  const h = parseInt(parts[0], 10) || 7;
  const m = parseInt(parts[1], 10) || 0;
  const totalMins = h * 60 + m;
  const endTotalMins = totalMins + 150;
  const endH = Math.floor((endTotalMins % 1440) / 60);
  const endM = endTotalMins % 60;
  const sStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  const eStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  return `Morning (${sStr} - ${eStr})`;
};

// Dynamic break duration based on preceding session length
export const getBreakDuration = (sessionDurationMins: number): number => {
  if (sessionDurationMins <= 30) return 5;
  if (sessionDurationMins <= 60) return 10;
  if (sessionDurationMins <= 90) return 15;
  return 20;
};

export const parseTimeVal = (val: string | undefined, fallback: number): number => {
  const p = parseInt(val || '', 10);
  return Number.isNaN(p) ? fallback : p;
};

export const getTimeMins = (tStr: string, dayStartHour: number = 7): number => {
  const parts = (tStr || '').split(':');
  let h = parseTimeVal(parts[0], 23);
  const m = parseTimeVal(parts[1], 0);
  if (h < dayStartHour) h += 24;
  return h * 60 + m;
};

export const getSlotMins = (slot: string | undefined, dayStartHour: number = 7): number => {
  if (!slot) return 9999;
  const match = slot.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);
  if (!match) return 9999;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  if (h < dayStartHour) h += 24;
  return h * 60 + m;
};
