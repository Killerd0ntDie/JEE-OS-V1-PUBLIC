import { writeBatch } from 'firebase/firestore';
import { StudyBrainRuntime } from '@/runtime/StudyBrainRuntime';
import {
  BaseActions,
  ChapterActions,
  MistakeActions,
  MockTestActions,
  SessionActions,
  TimelineActions,
  MissionActions,
  UserActions
} from './domain';
import {
  TodayMission,
  SubjectId,
  TimelineBlock,
  Mistake,
  Chapter,
  StudySession,
  MentorProfile,
  DailyCheckin,
  WeeklyCheckin,
  MonthlyObjective,
  MockResult,
  XPState,
  Note
} from '@/types/index';
import { MockTest } from '@/types/mockTest';

export class StudyBrainActions {
  public runtime: StudyBrainRuntime;
  public userId: string;

  public readonly base: BaseActions;
  public readonly chapters: ChapterActions;
  public readonly mistakes: MistakeActions;
  public readonly mockTests: MockTestActions;
  public readonly sessions: SessionActions;
  public readonly timeline: TimelineActions;
  public readonly missions: MissionActions;
  public readonly user: UserActions;

  constructor(runtime: StudyBrainRuntime, userId: string) {
    this.runtime = runtime;
    this.userId = userId;

    this.base = new BaseActions(runtime, userId);
    this.chapters = new ChapterActions(runtime, userId);
    this.mistakes = new MistakeActions(runtime, userId);
    this.mockTests = new MockTestActions(runtime, userId);
    this.sessions = new SessionActions(runtime, userId);
    this.timeline = new TimelineActions(runtime, userId);
    this.missions = new MissionActions(runtime, userId);
    this.user = new UserActions(runtime, userId);

    // Cross-domain callback: timeline block completions tied to missions complete via MissionActions
    this.timeline.onCompleteTask = (taskId: string) => this.missions.completeTask(taskId);
  }

  public isGuestUser(): boolean {
    return this.base.isGuestUser();
  }

  public setUserId(newUid: string) {
    if (newUid && newUid !== this.userId) {
      this.userId = newUid;
      this.base.setUserId(newUid);
      this.chapters.setUserId(newUid);
      this.mistakes.setUserId(newUid);
      this.mockTests.setUserId(newUid);
      this.sessions.setUserId(newUid);
      this.timeline.setUserId(newUid);
      this.missions.setUserId(newUid);
      this.user.setUserId(newUid);
    }
  }

  public async runAtomicBatch(
    populateBatch: (batch: ReturnType<typeof writeBatch>) => void | Promise<void>,
    actionName: string
  ): Promise<void> {
    return this.base.runAtomicBatch(populateBatch, actionName);
  }

  public async safeDbCall<T>(operation: () => Promise<T>, actionName: string): Promise<T | void> {
    return this.base.safeDbCall(operation, actionName);
  }

  public triggerToast(title: string, message?: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') {
    this.base.triggerToast(title, message, type);
  }

  public getResetXpBase(): XPState {
    return this.base.getResetXpBase();
  }

  public isGodModeActive(): boolean {
    return this.base.isGodModeActive();
  }

  public evaluateAndUpdateStreak(xp: any, updatedSessions: StudySession[]) {
    return this.base.evaluateAndUpdateStreak(xp, updatedSessions);
  }

  // --- User & State Management ---
  async clearSyncError() {
    return this.user.clearSyncError();
  }

  async setActiveSubject(subject: SubjectId | 'all') {
    return this.user.setActiveSubject(subject);
  }

  async setRadarFocusedChapter(chapterId: string) {
    return this.user.setRadarFocusedChapter(chapterId);
  }

  async setEnergyLevel(level: 'High' | 'Medium' | 'Low') {
    return this.user.setEnergyLevel(level);
  }

  async awardPartialXP(missionId: string, elapsedSecs: number, focusScore: number) {
    return this.user.awardPartialXP(missionId, elapsedSecs, focusScore);
  }

  async deductCasinoWager(wagerAmount: number) {
    return this.user.deductCasinoWager(wagerAmount);
  }

  async setMissionModeActive(active: boolean) {
    return this.user.setMissionModeActive(active);
  }

  async setSettings(newSettings: any) {
    return this.user.setSettings(newSettings);
  }

  async updateSettings(newSettings: any) {
    return this.user.updateSettings(newSettings);
  }

  async resetHiddenMissions() {
    return this.user.resetHiddenMissions();
  }

  async resetXpAndLevel() {
    return this.user.resetXpAndLevel();
  }

  async purgeUserData() {
    return this.user.purgeUserData();
  }

  async resetAllProgress() {
    return this.user.resetAllProgress();
  }

  async updateMentorProfile(profile: Partial<MentorProfile>) {
    return this.user.updateMentorProfile(profile);
  }

  async completeMentorInterview(
    mentorData: Omit<MentorProfile, 'interviewCompleted'>,
    chapterUpdates?: Array<{
      id: string;
      status: 'Not Started' | 'In Progress' | 'Completed';
      confidence?: number;
      lecturesWatched?: number;
      totalLectures?: number;
      avgLectureDuration?: number;
      dppDone?: boolean | 'partial';
      pyqsDone?: boolean;
      completion?: number;
    }>
  ) {
    return this.user.completeMentorInterview(mentorData, chapterUpdates);
  }

  async submitDailyCheckin(checkin: DailyCheckin) {
    return this.user.submitDailyCheckin(checkin);
  }

  async submitWeeklyCheckin(checkin: WeeklyCheckin) {
    return this.user.submitWeeklyCheckin(checkin);
  }

  async setMonthlyObjective(objective: MonthlyObjective) {
    return this.user.setMonthlyObjective(objective);
  }

  async extendSession(hours: number) {
    return this.user.extendSession(hours);
  }

  // --- Missions ---
  async completeTask(
    taskId: string,
    durationSecs?: number,
    metrics?: {
      questions?: number;
      correct?: number;
      confidence?: number;
      focusScore?: number;
      idleTime?: number;
      focusInterruptions?: number;
    }
  ) {
    return this.missions.completeTask(taskId, durationSecs, metrics);
  }

  async deleteMission(taskId: string) {
    return this.missions.deleteMission(taskId);
  }

  async addCustomMission(missionData: Omit<TodayMission, 'id' | 'completed' | 'unlocked'>) {
    return this.missions.addCustomMission(missionData);
  }

  async addAiMission(missionData: Omit<TodayMission, 'id' | 'completed' | 'unlocked'>) {
    return this.missions.addAiMission(missionData);
  }

  async updateMissionDetails(taskId: string, updates: Partial<TodayMission>) {
    return this.missions.updateMissionDetails(taskId, updates);
  }

  async skipTask(taskId: string) {
    return this.missions.skipTask(taskId);
  }

  async addTodayMission(mission: TodayMission) {
    return this.missions.addTodayMission(mission);
  }

  async clearTodayMissions() {
    return this.missions.clearTodayMissions();
  }

  async rebalancePlan() {
    return this.missions.rebalancePlan();
  }

  async resetCustomMissions() {
    return this.missions.resetCustomMissions();
  }

  // --- Notes & Cockpit Memory Deck ---
  async addNote(noteData: Omit<Note, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
    return this.missions.addNote(noteData);
  }

  async addProofOfWorkNote(params: {
    text: string;
    subject: SubjectId;
    chapter: string;
    chapterId?: string;
    missionId?: string;
    xpWager?: number;
  }) {
    return this.missions.addProofOfWorkNote(params);
  }

  async deleteNote(noteId: string) {
    return this.missions.deleteNote(noteId);
  }

  // --- Chapters & Spaced Repetition ---
  async updateChapter(chapterIdOrObject: string | Chapter, updates?: Partial<Chapter>): Promise<void> {
    return this.chapters.updateChapter(chapterIdOrObject, updates);
  }

  openChapterEditModal(chapterId: string) {
    this.runtime.updateStateOptimistic({ activeEditChapterId: chapterId });
    this.chapters.openChapterEditModal(chapterId);
  }

  closeChapterEditModal() {
    this.runtime.updateStateOptimistic({ activeEditChapterId: null });
    this.chapters.closeChapterEditModal();
  }

  async addCustomChapter(input: {
    name: string;
    subject: SubjectId;
    unit: string;
    serialNumber?: string;
    totalLectures: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }) {
    return this.chapters.addCustomChapter(input);
  }

  async updateChapterProgress(
    chapterId: string,
    updates: Partial<Chapter> | number,
    theoryComplete?: boolean,
    dppComplete?: boolean,
    pyqsComplete?: boolean
  ) {
    return this.chapters.updateChapterProgress(chapterId, updates, theoryComplete, dppComplete, pyqsComplete);
  }

  async completeRevision(cardId: string, confidence: 'Low' | 'Medium' | 'High') {
    return this.chapters.completeRevision(cardId, confidence);
  }

  async gradeFlashcard(cardId: string, chapterId: string, quality: number) {
    return this.chapters.gradeFlashcard(cardId, chapterId, quality);
  }

  async gradeFlashcardsBatch(grades: Array<{ cardId: string; chapterId: string; quality: number }>) {
    return this.chapters.gradeFlashcardsBatch(grades);
  }

  async toggleChapterStatus(chapterId: string) {
    return this.chapters.toggleChapterStatus(chapterId);
  }

  async updateChapterStatus(chapterId: string, status: Chapter['status']) {
    return this.chapters.updateChapterStatus(chapterId, status);
  }

  async updateChapterData(chapterId: string, updates: Partial<Chapter>) {
    return this.chapters.updateChapterData(chapterId, updates);
  }

  async deleteChapter(chapterId: string) {
    return this.chapters.deleteChapter(chapterId);
  }

  async updateChapterDetailedDiagnosis(chapterId: string, updates: Partial<Chapter>) {
    return this.chapters.updateChapterDetailedDiagnosis(chapterId, updates);
  }

  // --- Mistakes ---
  async addMistake(mistake: Omit<Mistake, 'id'>) {
    return this.mistakes.addMistake(mistake);
  }

  async addMistakesBatch(mistakes: Array<Omit<Mistake, 'id'> | Mistake>) {
    return this.mistakes.addMistakesBatch(mistakes);
  }

  async updateMistakeStatus(mistakeId: string, status: Mistake['revisionStatus']) {
    return this.mistakes.updateMistakeStatus(mistakeId, status);
  }

  async deleteMistake(mistakeId: string) {
    return this.mistakes.deleteMistake(mistakeId);
  }

  async updateMistakeTestResult(mistakeId: string, isCorrect: boolean) {
    return this.mistakes.updateMistakeTestResult(mistakeId, isCorrect);
  }

  // --- Mock Tests ---
  async addMockResult(result: Omit<MockResult, 'id'> | MockResult): Promise<MockResult> {
    return this.mockTests.addMockResult(result);
  }

  async addCustomMockTest(testData: MockTest) {
    return this.mockTests.addCustomMockTest(testData);
  }

  async deleteCustomMockTest(testId: string) {
    return this.mockTests.deleteCustomMockTest(testId);
  }

  async deleteChapterCustomMockTests(testIdsToDelete: string[]) {
    return this.mockTests.deleteChapterCustomMockTests(testIdsToDelete);
  }

  async deleteMockResult(resultId: string) {
    return this.mockTests.deleteMockResult(resultId);
  }

  // --- Timeline & Planner ---
  async toggleTimelineBlockComplete(blockId: string) {
    return this.timeline.toggleTimelineBlockComplete(blockId);
  }

  async addCustomTimelineBlock(block: Omit<TimelineBlock, 'id'>): Promise<void>;
  async addCustomTimelineBlock(subject: string, chapter: string, activity: string, time: string): Promise<void>;
  async addCustomTimelineBlock(blockOrSubject: string | Omit<TimelineBlock, 'id'>, arg1?: string, arg2?: string, arg3?: string) {
    return (this.timeline as any).addCustomTimelineBlock(blockOrSubject, arg1, arg2, arg3);
  }

  async updateCustomTimelineBlock(id: string, updates: Partial<TimelineBlock>) {
    return this.timeline.updateCustomTimelineBlock(id, updates);
  }

  async deleteCustomTimelineBlock(id: string) {
    return this.timeline.deleteCustomTimelineBlock(id);
  }

  async updateWeeklyGoals(weeklyGoals: { weekIndex: number; title: string; focus: string; status: 'Completed' | 'Active' | 'Upcoming' }[]) {
    return this.timeline.updateWeeklyGoals(weeklyGoals);
  }

  async updateScheduleBlock(id: string, updates: { dayIndex?: number; timeSlot?: string; scheduledDate?: string; scheduledTime?: string }) {
    return this.timeline.updateScheduleBlock(id, updates);
  }

  // --- Sessions & Coach ---
  async completeStudySession(sessionData: Partial<Omit<StudySession, 'id'>> & {
    focusTime?: number;
    questions?: number;
    correct?: number;
    idleTime?: number;
    focusInterruptions?: number;
    focusScore?: number;
  }) {
    return this.sessions.completeStudySession(sessionData);
  }

  async recordStudySession(data: {
    subject?: string;
    chapter?: string;
    duration: number;
    questionsSolved?: number;
    questionsCorrect?: number;
    accuracy?: number;
    mode?: string;
    timestamp?: string;
  }) {
    return this.sessions.recordStudySession(data);
  }

  async undoLatestMission(gracePeriodMinutes = 50) {
    return this.sessions.undoLatestMission(gracePeriodMinutes);
  }

  async runCoachAnalysis(question?: string) {
    return this.sessions.runCoachAnalysis(question);
  }
}
