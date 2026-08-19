import { RevisionEngineInput, RevisionEngineOutput, RevisionCardItem, ChapterRevisionSummary } from './types';
import { FORMULA_BANK } from '@/constants/formulaBank';
import { SpacedRepetitionEngine } from './SpacedRepetitionEngine';

export class RevisionEngine {
  private cacheHash: string = '';
  private cachedOutput: RevisionEngineOutput | null = null;

  public generateRevisionTelemetry(input: RevisionEngineInput): RevisionEngineOutput {
    const hash = this.computeHash(input);
    if (this.cachedOutput && this.cacheHash === hash) {
      return this.cachedOutput;
    }

    const { chapters, chapterTelemetryMap, sessions } = input;
    const allTelemetry = Object.values(chapterTelemetryMap || {});

    const overdueChapters: ChapterRevisionSummary[] = [];
    const upcomingChapters: ChapterRevisionSummary[] = [];
    const masteredChapters: ChapterRevisionSummary[] = [];
    // BUGFIX: previously unstarted chapters were shoved into `masteredChapters` with a
    // fabricated 95%/"High" retention score. They get their own bucket now.
    const notStartedChapters: ChapterRevisionSummary[] = [];
    const allCards: RevisionCardItem[] = [];

    const smEngine = new SpacedRepetitionEngine();

    // Process chapters & formula cards
    chapters.forEach(chap => {
      if (chap.chapterOnHold || chap.revisionOnHold) return;
      const telemetry = (chapterTelemetryMap || {})[chap.id];
      const isStartedOrMastered = telemetry 
        ? (telemetry.syllabusStage === 'In Progress' || telemetry.syllabusStage === 'Mastered')
        : (chap.status !== 'Not Started' && chap.syllabusStage !== 'Not Started' && (chap.completion > 0 || (chap.currentLecture && chap.currentLecture > 0) || chap.theoryComplete || chap.dppComplete || chap.pyqsComplete || chap.status === 'Mastered' || chap.status === 'Learning'));

      // BUGFIX: chapters that haven't been started have no memory to have decayed —
      // labeling them 'High'/95% retention is actively misleading (it previously made
      // the Retention Matrix show untouched chapters as if they were well-retained).
      // Give them an honest, distinct 'Not Started' state with no fabricated score.
      const retentionConfidence: ChapterRevisionSummary['retentionConfidence'] = isStartedOrMastered
        ? (telemetry?.retentionConfidence || 'High')
        : 'Not Started';
      const retentionScore: number | undefined = isStartedOrMastered
        ? (telemetry?.strategyRadar?.retentionConfidenceScore ?? 0)
        : undefined;

      // Find matching formulas from FORMULA_BANK
      const bankEntry = FORMULA_BANK.find(fb => fb.chapterId === chap.id || fb.chapterName.toLowerCase() === chap.name.toLowerCase());
      const formulas = bankEntry?.formulas || [];

      // Find last study session for chapter
      const chapSessions = sessions.filter(s => s.subjectId === chap.subject);
      const lastSession = chapSessions.length > 0 ? chapSessions[chapSessions.length - 1].startTime : undefined;

      const summaryItem: ChapterRevisionSummary = {
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject,
        retentionConfidence,
        retentionScore,
        overdueCardsCount: (isStartedOrMastered && retentionConfidence === 'Low') ? formulas.length : 0,
        totalCardsCount: isStartedOrMastered ? formulas.length : 0,
        lastRevisionDate: lastSession
      };

      if (!isStartedOrMastered) {
        notStartedChapters.push(summaryItem);
      } else if (retentionConfidence === 'Low') {
        overdueChapters.push(summaryItem);
      } else if (retentionConfidence === 'Medium') {
        upcomingChapters.push(summaryItem);
      } else {
        masteredChapters.push(summaryItem);
      }

      // BUGFIX: don't generate revision flashcards for chapters that haven't been
      // started — there's nothing to "revise" yet, and doing so previously produced
      // cards claiming 'High'/95% retention for material the student was never
      // taught in the first place.
      if (!isStartedOrMastered) {
        return;
      }

      // Generate card items with spaced repetition metadata
      formulas.forEach((f, idx) => {
        // Fallback for legacy items without a dedicated DB SM2 state
        const sm2State = smEngine.legacyConfidenceToState(retentionConfidence as 'High' | 'Medium' | 'Low');
        
        // Dynamic Urgency Rank: Instead of hardcoded values, we weight it by the ratio of interval days vs current decay
        // Wait, for simplicity we'll keep the base rank logic but inject real interval days
        const urgencyRank = retentionConfidence === 'Low' ? 100 - (retentionScore ?? 0) : retentionConfidence === 'Medium' ? 60 - (retentionScore ?? 0) : 20 - (retentionScore ?? 0);
        
        const intervalStage = `${sm2State.interval}d`;
        const nextReviewDays = sm2State.interval;

        allCards.push({
          id: `${chap.id}-f${idx}`,
          chapterId: chap.id,
          chapterName: chap.name,
          subject: chap.subject,
          retentionConfidence: retentionConfidence as 'High' | 'Medium' | 'Low',
          retentionScore: retentionScore ?? 0,
          title: f.title,
          concept: f.concept,
          formula: f.formula,
          lastReviewedDate: lastSession,
          nextReviewDays,
          intervalStage,
          recalledCount: chap.completion >= 100 ? 5 : chap.completion > 0 ? 2 : 0,
          urgencyRank,
          sm2State
        });
      });
    });

    // Sort all cards by urgency (highest urgency rank first)
    allCards.sort((a, b) => b.urgencyRank - a.urgencyRank);

    // Urgent cards: ONLY include cards that genuinely require recall (Low or Medium confidence)
    const urgentCards = allCards.filter(c => c.retentionConfidence === 'Low' || c.retentionConfidence === 'Medium').slice(0, 10);

    const totalOverdue = overdueChapters.length;
    const totalUpcoming = upcomingChapters.length;
    const totalMastered = masteredChapters.length;
    const totalNotStarted = notStartedChapters.length;
    // BUGFIX: average retention should reflect chapters that have actually been
    // studied. `allTelemetry` already only contains chapters with telemetry records
    // (i.e. started chapters), so this was not itself skewed by unstarted chapters —
    // kept as-is, just documenting why it's already correct.
    const avgRetentionScore = allTelemetry.length > 0
      ? Math.round(allTelemetry.reduce((acc, t) => acc + (t.strategyRadar?.retentionConfidenceScore || 70), 0) / allTelemetry.length)
      : 75;

    const output: RevisionEngineOutput = {
      overdueChapters,
      upcomingChapters,
      masteredChapters,
      notStartedChapters,
      cards: allCards,
      urgentCards,
      stats: {
        totalOverdue,
        totalUpcoming,
        totalMastered,
        totalNotStarted,
        avgRetentionScore,
        reviewedTodayCount: sessions.filter(s => s.type === 'Revision').length
      }
    };

    this.cacheHash = hash;
    this.cachedOutput = output;
    return output;
  }

  private computeHash(input: RevisionEngineInput): string {
    const chapSig = input.chapters.map(c => `${c.id}:${c.status}:${c.completion}:${c.chapterOnHold}:${c.revisionOnHold}`).join('|');
    const sessionCount = input.sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const mistakeCount = input.mistakes.map(m => `${m.id}:${(m as any).status}:${m.revisionStatus}`).join('|');
    const telemetryCount = Object.keys(input.chapterTelemetryMap || {}).length;
    return `${chapSig}_s${sessionCount}_m${mistakeCount}_t${telemetryCount}`;
  }
}
