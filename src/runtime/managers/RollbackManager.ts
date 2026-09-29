import { Chapter, TodayMission } from '../../types/index';

/**
 * Encapsulates fine-grained optimistic rollback logic, restoring only the
 * specific entity that failed to sync without clobbering concurrent optimistic updates.
 */
export class RollbackManager {
  /**
   * Restores only the specific chapter that failed.
   */
  public static rollbackChapter(
    currentChapters: Chapter[],
    chapterId: string,
    fallbackChapter: Chapter | null
  ): Chapter[] {
    return fallbackChapter
      ? currentChapters.map(c => (c.id === chapterId ? fallbackChapter : c))
      : currentChapters.filter(c => c.id !== chapterId);
  }

  /**
   * Restores only the specific mission that failed.
   */
  public static rollbackMission(
    currentMissions: TodayMission[],
    missionId: string,
    fallbackMission: TodayMission | null
  ): TodayMission[] {
    return fallbackMission
      ? currentMissions.map(m => (m.id === missionId ? fallbackMission : m))
      : currentMissions.filter(m => m.id !== missionId);
  }
}
