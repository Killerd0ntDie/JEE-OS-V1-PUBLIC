import { RevisionEngineInput, RevisionEngineOutput, RevisionCardItem, ChapterRevisionSummary } from './types';
import { FORMULA_BANK } from '../constants/formulaBank';
import { SpacedRepetitionEngine } from './SpacedRepetitionEngine';
import { Chapter } from '../types/index';
import { ChapterTelemetry } from '../chapterInfo/types';
import { buildRevisionPlan } from './revisionPlan';

/**
 * Determines whether a syllabus chapter is running (in progress) or completed/mastered,
 * strictly excluding untouched unstarted chapters from revision and drill queues.
 */
export function isChapterKnownOrRunning(
  chap: Chapter,
  telemetry?: ChapterTelemetry,
  mistakesCount = 0
): boolean {
  if (chap.chapterOnHold || chap.revisionOnHold) return false;

  // 1. Telemetry indicators
  if (telemetry) {
    if (telemetry.syllabusStage === 'In Progress' || telemetry.syllabusStage === 'Mastered') {
      return true;
    }
    if (telemetry.isMastered || telemetry.theoryComplete || telemetry.dppComplete || telemetry.pyqsComplete) {
      return true;
    }
    if ((telemetry.currentLecture && telemetry.currentLecture > 0) || (telemetry.masteryScore && telemetry.masteryScore > 0)) {
      return true;
    }
  }

  // 2. Chapter status indicators
  if (chap.status && chap.status !== 'Not Started') {
    return true;
  }

  // 3. Syllabus stage indicators
  if (chap.syllabusStage && chap.syllabusStage !== 'Not Started' && chap.syllabusStage !== 'Unknown') {
    return true;
  }

  // 4. Progress metrics
  if (
    (chap.completion && chap.completion > 0) ||
    (chap.currentLecture && chap.currentLecture > 0) ||
    chap.theoryComplete ||
    chap.dppComplete ||
    chap.pyqsComplete ||
    (chap.solvedQuestions && chap.solvedQuestions > 0) ||
    (chap.revisionCount && chap.revisionCount > 0)
  ) {
    return true;
  }

  // 5. Active student errors logged against chapter
  if (mistakesCount > 0) {
    return true;
  }

  return false;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CHAPTER_ALIASES: Record<string, string[]> = {
  'chemical bonding': ['chemical bonding and molecular structure', 'bonding', 'chemical bonding & molecular structure'],
  'chemical bonding and molecular structure': ['chemical bonding', 'chemical bonding & molecular structure'],
  'structure of atom': ['atomic structure', 'structure of atom', 'atom structure'],
  'atomic structure': ['structure of atom', 'atomic structure'],
  'classification of elements and periodicity in properties': ['periodic table', 'periodicity', 'periodic table and periodicity', 'periodic properties'],
  'periodic table and periodicity': ['classification of elements', 'periodic table', 'periodic table & periodicity', 'classification of elements and periodicity in properties'],
  'chemical thermodynamics': ['thermodynamics', 'chemical thermodynamics and energetics'],
  'thermodynamics': ['chemical thermodynamics', 'thermodynamics'],
  'equilibrium': ['chemical equilibrium', 'ionic equilibrium', 'chemical and ionic equilibrium'],
  'redox reactions': ['redox', 'redox reactions and electrochemistry'],
  'solutions': ['liquid solutions', 'solutions and colligative properties'],
  'states of matter': ['gaseous state', 'states of matter gases and liquids'],
  'rotational motion': ['system of particles and rotational motion', 'rotational dynamics', 'rotational mechanics'],
  'work energy and power': ['work power energy', 'work power and energy', 'work energy power'],
  'work power and energy': ['work energy and power', 'work energy power'],
  'oscillations': ['oscillations and simple harmonic motion', 'simple harmonic motion', 'shm'],
  'semiconductors': ['semiconductor electronics', 'semiconductor devices', 'semiconductor electronics materials devices and simple circuits']
};

/**
 * Resolves a syllabus chapter to its corresponding entry in FORMULA_BANK,
 * strictly prioritizing normalized subject + chapter title and alias mappings
 * before considering secondary fuzzy token matches.
 */
export function findMatchingBankChapter(chap: Chapter) {
  const chapNameNorm = normalizeTitle(chap.name || '');
  const chapSubject = (chap.subject || '').toLowerCase().trim();

  // 1. Direct normalized name match within same subject
  const directName = FORMULA_BANK.find(fb => 
    (!chapSubject || fb.subject === chapSubject) && 
    normalizeTitle(fb.chapterName) === chapNameNorm
  );
  if (directName) return directName;

  // 2. Alias mapping match
  const aliases = CHAPTER_ALIASES[chapNameNorm] || [];
  if (aliases.length > 0) {
    const aliasMatch = FORMULA_BANK.find(fb => {
      if (chapSubject && fb.subject !== chapSubject) return false;
      const fbNorm = normalizeTitle(fb.chapterName);
      return aliases.some(a => fbNorm === a || fbNorm.includes(a) || a.includes(fbNorm));
    });
    if (aliasMatch) return aliasMatch;
  }

  // 3. Substring inclusion match (e.g. 'Kinematics' in 'Kinematics (Motion in 1D & 2D)')
  const inclusionMatch = FORMULA_BANK.find(fb => {
    if (chapSubject && fb.subject !== chapSubject) return false;
    const fbNorm = normalizeTitle(fb.chapterName);
    return fbNorm.includes(chapNameNorm) || chapNameNorm.includes(fbNorm);
  });
  if (inclusionMatch) return inclusionMatch;

  // 4. Token overlap match (at least one substantial token >= 4 chars matches)
  const chapTokens = chapNameNorm.split(' ').filter(t => t.length >= 4);
  const tokenMatch = FORMULA_BANK.find(fb => {
    if (chapSubject && fb.subject !== chapSubject) return false;
    const fbTokens = normalizeTitle(fb.chapterName).split(' ').filter(t => t.length >= 4);
    return chapTokens.some(ct => fbTokens.includes(ct));
  });
  if (tokenMatch) return tokenMatch;

  // 5. Strict verified ID fallback ONLY if subject matches AND names are compatible
  const chapIdLower = (chap.id || '').toLowerCase().trim();
  const directId = FORMULA_BANK.find(fb => 
    (!chapSubject || fb.subject === chapSubject) && 
    fb.chapterId.toLowerCase() === chapIdLower
  );
  if (directId) {
    // Only return directId if names are not completely divergent
    const fbNorm = normalizeTitle(directId.chapterName);
    const fbTokens = fbNorm.split(' ').filter(t => t.length >= 4);
    const hasOverlap = chapTokens.length === 0 || chapTokens.some(t => fbTokens.includes(t));
    if (hasOverlap) return directId;
  }

  return undefined;
}

export class RevisionEngine {
  private cacheHash: string = '';
  private cachedOutput: RevisionEngineOutput | null = null;

  public generateRevisionTelemetry(input: RevisionEngineInput): RevisionEngineOutput {
    const hash = this.computeHash(input);
    if (this.cachedOutput && this.cacheHash === hash) {
      return this.cachedOutput;
    }

    const { chapters, chapterTelemetryMap, sessions, mistakes = [], notes = [] } = input;
    const plan = buildRevisionPlan({
      chapters,
      mistakes,
      notes,
      sessions
    });

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
      const telemetry = chapterTelemetryMap?.[chap.id];

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

      const hasActiveWork = isChapterKnownOrRunning(chap, telemetry, chapMistakes.length);

      // Find last study session for chapter (BUG-10: match strictly by chapter id/name to avoid subject bleed)
      const chapSessions = sessions.filter(s => 
        (s.chapterId && s.chapterId === chap.id) || 
        ((s as any).chapterName && (s as any).chapterName.toLowerCase() === chap.name.toLowerCase()) ||
        ((s as any).chapter && (s as any).chapter.toLowerCase() === chap.name.toLowerCase())
      );
      let lastSession: string | undefined ;
      if (chapSessions.length > 0) {
        const sorted = [...chapSessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        lastSession = sorted[sorted.length - 1].startTime;
      }
      const canonicalLastRev = chap.lastRevisedAt || chap.revisionProgress?.lastRevisedAt || lastSession;
      const isRevisedToday = Boolean(
        (canonicalLastRev && new Date(canonicalLastRev).toDateString() === new Date().toDateString()) ||
        chap.lastRevisionDaysAgo === 0 ||
        chap.revisionProgress?.lastRevisedDaysAgo === 0
      );

      // BUGFIX: chapters that haven't been started have no memory to have decayed —
      // labeling them 'High'/95% retention is actively misleading.
      const isDueInPlan = plan.dueChapters.some(d => d.chapterId === chap.id);
      const rawRetentionConfidence = isRevisedToday
        ? 'High'
        : (telemetry?.retentionConfidence || (chapMistakes.some(m => m.revisionStatus === 'New') ? 'Low' : 'High'));
      const retentionConfidence: ChapterRevisionSummary['retentionConfidence'] = hasActiveWork
        ? (isRevisedToday ? 'High' : isDueInPlan ? 'Low' : (rawRetentionConfidence === 'Low' ? 'Medium' : rawRetentionConfidence))
        : 'Not Started';
      const retentionScore: number | undefined = hasActiveWork
        ? (isRevisedToday ? 90 : (telemetry?.strategyRadar?.retentionConfidenceScore ?? (isDueInPlan ? 45 : chapMistakes.length > 0 ? 50 : 70)))
        : undefined;

      // Find matching formulas from FORMULA_BANK
      const bankEntry = findMatchingBankChapter(chap);
      const formulas = bankEntry?.formulas || [];

      const totalCards = formulas.length + chapMistakes.length + chapNotes.length;

      const summaryItem: ChapterRevisionSummary = {
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject,
        retentionConfidence,
        retentionScore,
        overdueCardsCount: (hasActiveWork && retentionConfidence === 'Low') ? totalCards : 0,
        totalCardsCount: hasActiveWork ? totalCards : 0,
        lastRevisionDate: canonicalLastRev
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
        
        if (dbState && !isRevisedToday) {
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
        } else if (isRevisedToday) {
          dynamicRetentionConfidence = 'High';
          urgencyRank = 20;
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
          examNote: f.examNote,
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

        if (dbState && !isRevisedToday) {
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
        } else if (isRevisedToday) {
          dynamicRetentionConfidence = m.revisionStatus === 'Mastered' ? 'High' : 'Medium';
          urgencyRank = 25;
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

    // Backfill formulas from FORMULA_BANK ONLY when chapters is empty (isolated engine test fallback).
    // When chapters is provided (actual student syllabus), strictly NEVER backfill unstarted chapters!
    if (chapters.length === 0) {
      FORMULA_BANK.forEach(bankChapter => {
        const alreadyHasCards = allCards.some(c => c.chapterId === bankChapter.chapterId);
        if (alreadyHasCards) return;

        bankChapter.formulas.forEach((f, idx) => {
          const cardId = `${bankChapter.chapterId}-f${idx}`;
          allCards.push({
            id: cardId,
            chapterId: bankChapter.chapterId,
            chapterName: bankChapter.chapterName,
            subject: bankChapter.subject,
            cardType: 'formula',
            retentionConfidence: 'Medium',
            retentionScore: 60,
            title: f.title,
            concept: f.concept,
            formula: f.formula,
            examNote: f.examNote,
            nextReviewDays: 1,
            intervalStage: '1d',
            recalledCount: 0,
            urgencyRank: 30,
            sm2State: {
              repetitions: 0,
              easeFactor: 2.5,
              interval: 1
            }
          });
        });
      });
    }

    // Sort all cards by urgency (highest urgency rank first)
    allCards.sort((a, b) => b.urgencyRank - a.urgencyRank);

    // Urgent cards: ONLY include genuine formulas and mistakes (strictly NO proof-of-work notes)
    // from running and completed chapters
    const urgentCards = allCards
      .filter(c => c.cardType !== 'note' && (c.retentionConfidence === 'Low' || c.retentionConfidence === 'Medium'))
      .slice(0, 10);

    // If urgentCards has fewer than 5 items, backfill with high-yield formula cards from allCards (strictly running/completed)
    if (urgentCards.length < 5) {
      const formulaCards = allCards.filter(c => c.cardType === 'formula' && !urgentCards.some(u => u.id === c.id));
      urgentCards.push(...formulaCards.slice(0, 10 - urgentCards.length));
    }

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
      dueChapters: plan.dueChapters,
      upcomingDueChapters: plan.upcomingChapters,
      dueCards: plan.dueCards,
      revisionQueue: plan.revisionQueue,
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
        }).length,
        pendingMistakesCount: plan.stats.pendingMistakesCount
      }
    };

    this.cacheHash = hash;
    this.cachedOutput = output;
    return output;
  }

  private computeHash(input: RevisionEngineInput): string {
    const chapSig = input.chapters.map(c => 
      `${c.id}:${c.status}:${c.completion}:${c.chapterOnHold}:${c.revisionOnHold}:${c.revisionCount || 0}:${c.nextRevisionDueAt || ''}:${c.lastRevisedAt || ''}:${Object.keys(c.flashcardStates || {}).length}`
    ).sort().join('|');
    const sessionCount = input.sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const mistakeCount = (input.mistakes || []).map(m => `${m.id}:${(m as any).status}:${m.revisionStatus}`).sort().join('|');
    const noteCount = (input.notes || []).length;
    const telemetryCount = Object.keys(input.chapterTelemetryMap || {}).length;
    const todayStr = new Date().toDateString();
    return `${chapSig}_s${sessionCount}_m${mistakeCount}_n${noteCount}_t${telemetryCount}_d${todayStr}`;
  }
}
