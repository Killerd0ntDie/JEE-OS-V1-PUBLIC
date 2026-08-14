import { StudySession } from '@/types';

/**
 * Helper to build a YYYY-MM-DD map of total study minutes from study sessions.
 */
export function getDailyMinutesMap(studySessions: StudySession[] = []): Map<string, number> {
  const map = new Map<string, number>();
  (studySessions || []).forEach(session => {
    if (!session.startTime) return;
    if (session.type === 'Break' as any) return;
    const d = new Date(session.startTime);
    if (isNaN(d.getTime())) return;
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = map.get(dateKey) || 0;
    const duration = Math.max(0, session.duration || 0);
    map.set(dateKey, existing + duration);
  });
  return map;
}

/**
 * Returns today's total study time in minutes.
 */
export function getTodayStudyMinutes(studySessions: StudySession[] = []): number {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const map = getDailyMinutesMap(studySessions);
  return map.get(todayKey) || 0;
}

/**
 * Calculates current active consecutive streak in days.
 * Only counts days where total study time meets or exceeds minStreakMinutes.
 * Resets to 0 if neither today nor yesterday met the minimum threshold.
 */
export function calculateCurrentStreak(studySessions: StudySession[] = [], minStreakMinutes: number = 30): number {
  const effectiveThreshold = Math.max(1, Number(minStreakMinutes) || 30);
  const map = getDailyMinutesMap(studySessions);
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const todayMins = map.get(todayKey) || 0;
  let checkDate = new Date(todayDate);

  if (todayMins < effectiveThreshold) {
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const yesterdayMins = map.get(yesterdayKey) || 0;

    if (yesterdayMins < effectiveThreshold) {
      return 0;
    }
  }

  let streak = 0;
  while (true) {
    const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const mins = map.get(dateKey) || 0;
    if (mins >= effectiveThreshold) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
