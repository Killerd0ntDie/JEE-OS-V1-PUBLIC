import { RevisionEngineInput, RevisionEngineOutput, RevisionCardItem, ChapterRevisionSummary } from './types';
import { FORMULA_BANK } from '../constants/formulaBank';
import { SpacedRepetitionEngine } from './SpacedRepetitionEngine';

export class RevisionEngine {
  private cacheHash: string = '';
  private cachedOutput: RevisionEngineOutput | null = null;

  public generateRevisionTelemetry(input: RevisionEngineInput): RevisionEngineOutput {
    const hash = this.computeHash(input);
    if (this.cachedOutput && this.cacheHash === hash) {
      return this.cachedOutput;
    }

    const { chapters, chapterTelemetryMap, sessions, mistakes = [], notes = [] } = input;
    const allTelemetry = Object.values(chapterTelemetryMap || {});

    const overdueChapters: ChapterRevisionSummary[] = [];
    const upcomingChapters: ChapterRevisionSummary[] = [];
    const masteredChapters: ChapterRevisionSummary[] = [];
    // BUGFIX: previously unstarted chapters were shoved into `masteredChapters` with a
    // fabricated 95%/"High" retention score. They get their own bucket now.
    const notStartedChapters: ChapterRevisionSummary[] = [];
    const allCards: RevisionCardItem[] = [];

    const smEngine = new SpacedRepetitionEngine();

    // Process chapters, formula cards, and active student mistake cards
    chapters.forEach(chap => {
      if (chap.chapterOnHold || chap.revisionOnHold) return;
      const telemetry = (chapterTelemetryMap || {})[chap.id];
      const isStartedOrMastered = telemetry 
        ? (telemetry.syllabusStage === 'In Progress' || telemetry.syllabusStage === 'Mastered')
        : (chap.status !== 'Not Started' && chap.syllabusStage !== 'Not Started' && (chap.completion > 0 || (chap.currentLecture && chap.currentLecture > 0) || chap.theoryComplete || chap.dppComplete || chap.pyqsComplete || chap.status === 'Mastered' || chap.status === 'Learning'));

      // Find matching student mistakes for this chapter
      const chapMistakes = (mistakes || []).filter(m => 
        (m.chapterId && m.chapterId === chap.id) || 
        (m.chapter && m.chapter.toLowerCase() === chap.name.toLowerCase())
      );

      // Find matching proof of work notes
      const chapNotes = (notes || []).filter(n =>
        (n.chapterId && n.chapterId === chap.id) ||
        (n.chapter && n.chapter.toLowerCase() === chap.name.toLowerCase())
      );

      const hasActiveWork = isStartedOrMastered || chapMistakes.length > 0;

      // BUGFIX: chapters that haven't been started have no memory to have decayed —
      // labeling them 'High'/95% retention is actively misleading (it previously made
      // the Retention Matrix show untouched chapters as if they were well-retained).
      // Give them an honest, distinct 'Not Started' state with no fabricated score.
      const retentionConfidence: ChapterRevisionSummary['retentionConfidence'] = hasActiveWork
        ? (telemetry?.retentionConfidence || (chapMistakes.some(m => m.revisionStatus === 'New') ? 'Low' : 'High'))
        : 'Not Started';
      const retentionScore: number | undefined = hasActiveWork
        ? (telemetry?.strategyRadar?.retentionConfidenceScore ?? (chapMistakes.length > 0 ? 50 : 70))
        : undefined;

      // Find matching formulas from FORMULA_BANK
      const bankEntry = FORMULA_BANK.find(fb => fb.chapterId === chap.id || fb.chapterName.toLowerCase() === chap.name.toLowerCase());
      const formulas = bankEntry?.formulas || [];

      // Find last study session for chapter (BUG-10: match strictly by chapter id/name to avoid subject bleed)
      const chapSessions = sessions.filter(s => 
        (s.chapterId && s.chapterId === chap.id) || 
        ((s as any).chapterName && (s as any).chapterName.toLowerCase() === chap.name.toLowerCase()) ||
        ((s as any).chapter && (s as any).chapter.toLowerCase() === chap.name.toLowerCase())
      );
      let lastSession: string | undefined = undefined;
      if (chapSessions.length > 0) {
        const sorted = [...chapSessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        lastSession = sorted[sorted.length - 1].startTime;
      }

      const totalCards = formulas.length + chapMistakes.length + chapNotes.length;

      const summaryItem: ChapterRevisionSummary = {
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject,
        retentionConfidence,
        retentionScore,
        overdueCardsCount: (hasActiveWork && retentionConfidence === 'Low') ? totalCards : 0,
        totalCardsCount: hasActiveWork ? totalCards : 0,
        lastRevisionDate: lastSession
      };

      if (!hasActiveWork) {
        notStartedChapters.push(summaryItem);
      } else if (retentionConfidence === 'Low') {
        overdueChapters.push(summaryItem);
      } else if (retentionConfidence === 'Medium') {
        upcomingChapters.push(summaryItem);
      } else {
        masteredChapters.push(summaryItem);
      }

      // BUGFIX: don't generate revision flashcards for chapters that have neither
      // started nor logged mistakes/notes — there's nothing to "revise" yet.
      if (!hasActiveWork) {
        return;
      }

      // 1. Generate formula card items with spaced repetition metadata
      formulas.forEach((f, idx) => {
        const cardId = `${chap.id}-f${idx}`;
        const dbState = chap.flashcardStates?.[cardId];
        
        // Fallback for legacy items without a dedicated DB SM2 state
        const sm2State = dbState || smEngine.legacyConfidenceToState(retentionConfidence as 'High' | 'Medium' | 'Low');
        
        // Dynamic Urgency Rank
        let urgencyRank = retentionConfidence === 'Low' ? 100 - (retentionScore ?? 0) : retentionConfidence === 'Medium' ? 60 - (retentionScore ?? 0) : 20 - (retentionScore ?? 0);
        let dynamicRetentionConfidence = retentionConfidence as 'High' | 'Medium' | 'Low';
        
        if (dbState) {
          // Override confidence based on interval
          if (dbState.interval < 3) {
            dynamicRetentionConfidence = 'Low';
            urgencyRank = 100 - Math.min(100, Math.max(0, (dbState.easeFactor - 1.3) * 50));
          } else if (dbState.interval <= 7) {
            dynamicRetentionConfidence = 'Medium';
            urgencyRank = 60 - Math.min(60, Math.max(0, (dbState.easeFactor - 1.3) * 30));
          } else {
            dynamicRetentionConfidence = 'High';
            urgencyRank = 20 - Math.min(20, Math.max(0, (dbState.easeFactor - 1.3) * 10));
          }
          
          // Boost urgency if overdue
          if (dbState.nextReviewDate) {
            const nextDate = new Date(dbState.nextReviewDate).getTime();
            const now = Date.now();
            if (now > nextDate) {
              const overdueDays = (now - nextDate) / (1000 * 60 * 60 * 24);
              urgencyRank += Math.min(50, overdueDays * 5); // Add up to 50 points for being overdue
            }
          }
        }
        
        const intervalStage = `${sm2State.interval}d`;
        const nextReviewDays = sm2State.interval;

        allCards.push({
          id: cardId,
          chapterId: chap.id,
          chapterName: chap.name,
          subject: chap.subject,
          cardType: 'formula',
          retentionConfidence: dynamicRetentionConfidence,
          retentionScore: retentionScore ?? 0,
          title: f.title,
          concept: f.concept,
          formula: f.formula,
          lastReviewedDate: dbState?.lastReviewDate || lastSession,
          nextReviewDays,
          intervalStage,
          recalledCount: dbState?.repetitions ?? (chap.completion >= 100 ? 5 : chap.completion > 0 ? 2 : 0),
          urgencyRank,
          sm2State
        });
      });

      // 2. Generate active mistake card items for spaced repetition
      chapMistakes.forEach(m => {
        const cardId = m.id.startsWith('m-') ? m.id : `m-${m.id}`;
        const dbState = chap.flashcardStates?.[cardId];

        let initialConfidence: 'High' | 'Medium' | 'Low' = 'Low';
        if (m.revisionStatus === 'Mastered') initialConfidence = 'High';
        else if (m.revisionStatus === 'Solved Again') initialConfidence = 'Medium';
        else if (m.revisionStatus === 'Reviewed') initialConfidence = 'Medium';
        else initialConfidence = 'Low';

        const sm2State = dbState || smEngine.legacyConfidenceToState(initialConfidence);

        let dynamicRetentionConfidence = initialConfidence;
        let urgencyRank = initialConfidence === 'Low' ? 95 : initialConfidence === 'Medium' ? 65 : 25;

        // Boost urgency for high impact/priority errors
        if (m.priority === 'High') urgencyRank += 15;
        if (m.masteryImpact === 'High') urgencyRank += 10;
        if (m.revisionStatus === 'New') urgencyRank += 10;

        if (dbState) {
          if (dbState.interval < 3) {
            dynamicRetentionConfidence = 'Low';
            urgencyRank = 100 - Math.min(100, Math.max(0, (dbState.easeFactor - 1.3) * 50));
          } else if (dbState.interval <= 7) {
            dynamicRetentionConfidence = 'Medium';
            urgencyRank = 60 - Math.min(60, Math.max(0, (dbState.easeFactor - 1.3) * 30));
          } else {
            dynamicRetentionConfidence = 'High';
            urgencyRank = 20 - Math.min(20, Math.max(0, (dbState.easeFactor - 1.3) * 10));
          }

          if (dbState.nextReviewDate) {
            const nextDate = new Date(dbState.nextReviewDate).getTime();
            const now = Date.now();
            if (now > nextDate) {
              const overdueDays = (now - nextDate) / (1000 * 60 * 60 * 24);
              urgencyRank += Math.min(50, overdueDays * 5);
            }
          }
        }

        const intervalStage = `${sm2State.interval}d`;
        const nextReviewDays = sm2State.interval;

        allCards.push({
          id: cardId,
          chapterId: chap.id,
          chapterName: chap.name,
          subject: chap.subject,
          cardType: 'mistake',
          mistakeId: m.id,
          retentionConfidence: dynamicRetentionConfidence,
          retentionScore: m.recoveryScore ?? (dynamicRetentionConfidence === 'High' ? 85 : dynamicRetentionConfidence === 'Medium' ? 55 : 25),
          title: m.topic ? `Error: ${m.topic}` : `Mistake: ${chap.name}`,
          concept: m.questionText || (m.studentMethod ? `Student Attempt: ${m.studentMethod}` : `Analysis of error in ${chap.name}`),
          formula: m.correctSolution || m.correctMethod || m.aiAdvice || 'Review core principle to avoid recurrence.',
          lastReviewedDate: dbState?.lastReviewDate || m.dateLogged,
          nextReviewDays,
          intervalStage,
          recalledCount: dbState?.repetitions ?? (m.revisionStatus === 'Mastered' ? 4 : m.revisionStatus === 'Solved Again' ? 2 : 0),
          urgencyRank,
          sm2State
        });
      });

      // 3. Generate note/proof of work card items
      chapNotes.forEach(n => {
        const cardId = n.id.startsWith('note-') ? n.id : `note-${n.id}`;
        const dbState = chap.flashcardStates?.[cardId];
        const sm2State = dbState || smEngine.legacyConfidenceToState('Medium');

        allCards.push({
          id: cardId,
          chapterId: chap.id,
          chapterName: chap.name,
          subject: chap.subject,
          cardType: 'note',
          noteId: n.id,
          retentionConfidence: dbState ? (dbState.interval < 3 ? 'Low' : dbState.interval <= 7 ? 'Medium' : 'High') : 'Medium',
          retentionScore: 60,
          title: n.category === 'Proof of Work' ? `Proof of Work: ${chap.name}` : `Revision Note: ${chap.name}`,
          concept: n.text,
          formula: n.text,
          lastReviewedDate: dbState?.lastReviewDate || n.timestamp,
          nextReviewDays: sm2State.interval,
          intervalStage: `${sm2State.interval}d`,
          recalledCount: dbState?.repetitions ?? 1,
          urgencyRank: 40,
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
        reviewedTodayCount: sessions.filter(s => {
          if (s.type !== 'Revision') return false;
          const timestamp = s.startTime || s.endTime;
          if (!timestamp) return false;
          return new Date(timestamp).toDateString() === new Date().toDateString();
        }).length
      }
    };

    this.cacheHash = hash;
    this.cachedOutput = output;
    return output;
  }

  private computeHash(input: RevisionEngineInput): string {
    const chapSig = input.chapters.map(c => `${c.id}:${c.status}:${c.completion}:${c.chapterOnHold}:${c.revisionOnHold}`).sort().join('|');
    const sessionCount = input.sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const mistakeCount = (input.mistakes || []).map(m => `${m.id}:${(m as any).status}:${m.revisionStatus}`).sort().join('|');
    const noteCount = (input.notes || []).length;
    const telemetryCount = Object.keys(input.chapterTelemetryMap || {}).length;
    const todayStr = new Date().toDateString();
    return `${chapSig}_s${sessionCount}_m${mistakeCount}_n${noteCount}_t${telemetryCount}_d${todayStr}`;
  }
}
