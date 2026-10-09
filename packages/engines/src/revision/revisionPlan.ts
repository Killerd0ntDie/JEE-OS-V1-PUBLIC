import { Chapter, Mistake, Note, StudySession, SubjectId } from '../types/index';
import { SpacedRepetitionEngine } from './SpacedRepetitionEngine';
import { findMatchingBankChapter, isChapterKnownOrRunning } from './RevisionEngine';
import { 
  ChapterRevisionSummary, 
  DueChapterItem, 
  RevisionCardItem, 
  RevisionCard, 
  RevisionPlanOutput 
} from './types';

export interface BuildRevisionPlanInput {
  chapters: Chapter[];
  mistakes?: Mistake[];
  notes?: Note[];
  sessions?: StudySession[];
  now?: Date | number | string;
}

function formatDaysAgo(dateStr: string, nowMs: number): string {
  try {
    const timestamp = new Date(dateStr).getTime();
    if (Number.isNaN(timestamp)) return 'Never';
    const diffDays = Math.floor((nowMs - timestamp) / 86400000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return 'Never';
  }
}

/**
 * Canonical Due Engine & Revision Planner.
 * Computes the unified, single-source-of-truth list of chapters and flashcards due for review.
 * Fully decoupled from UI render loops, with zero sci-fi placebos.
 */
export function buildRevisionPlan(input: BuildRevisionPlanInput): RevisionPlanOutput {
  const { chapters = [], mistakes = [], notes = [], sessions = [] } = input;
  const nowMs = input.now ? new Date(input.now).getTime() : Date.now();
  const smEngine = new SpacedRepetitionEngine();

  const dueChapters: DueChapterItem[] = [];
  const upcomingChapters: DueChapterItem[] = [];
  const masteredChapters: ChapterRevisionSummary[] = [];
  const notStartedChapters: ChapterRevisionSummary[] = [];
  const dueCards: RevisionCardItem[] = [];
  const allCards: RevisionCardItem[] = [];
  const revisionQueue: RevisionCard[] = [];

  for (const chap of chapters) {
    if (chap.chapterOnHold || chap.revisionOnHold) continue;

    // Filter relevant mistakes for this chapter
    const chapMistakes = mistakes.filter(m =>
      (m.chapterId && m.chapterId === chap.id) ||
      (m.chapter && m.chapter.toLowerCase() === chap.name.toLowerCase())
    );

    // Filter notes for this chapter
    const _chapNotes = notes.filter(n =>
      (n.chapterId && n.chapterId === chap.id) ||
      (n.chapter && n.chapter.toLowerCase() === chap.name.toLowerCase())
    );

    const hasActiveWork = isChapterKnownOrRunning(chap, undefined, chapMistakes.length);

    if (!hasActiveWork) {
      notStartedChapters.push({
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject as SubjectId,
        retentionConfidence: 'Not Started',
        overdueCardsCount: 0,
        totalCardsCount: 0
      });
      continue;
    }

    // Wall-clock elapsed days calculation
    let elapsedDays = 0;
    const lastRevStr = chap.lastRevisedAt || chap.revisionProgress?.lastRevisedAt;
    if (lastRevStr) {
      const parsedTime = new Date(lastRevStr).getTime();
      if (!Number.isNaN(parsedTime)) {
        elapsedDays = Math.max(0, Math.floor((nowMs - parsedTime) / 86400000));
      }
    } else if (typeof chap.lastRevisionDaysAgo === 'number') {
      elapsedDays = chap.lastRevisionDaysAgo;
    } else if (typeof chap.revisionProgress?.lastRevisedDaysAgo === 'number') {
      elapsedDays = chap.revisionProgress.lastRevisedDaysAgo;
    }

    // Check if chapter was already revised today
    let isRevisedToday = false;
    if (lastRevStr) {
      const parsedTime = new Date(lastRevStr).getTime();
      if (!Number.isNaN(parsedTime)) {
        isRevisedToday = new Date(parsedTime).toDateString() === new Date(nowMs).toDateString();
      }
    } else if (chap.lastRevisionDaysAgo === 0 || chap.revisionProgress?.lastRevisedDaysAgo === 0) {
      isRevisedToday = true;
    }

    // Determine which mistakes are actually due for review today
    const dueMistakes = chapMistakes.filter(m => {
      if (m.revisionStatus === 'Mastered') return false;
      const cardId = m.id.startsWith('m-') ? m.id : `m-${m.id}`;
      const dbState = chap.flashcardStates?.[cardId];
      if (dbState?.nextReviewDate) {
        const nextMs = new Date(dbState.nextReviewDate).getTime();
        if (!Number.isNaN(nextMs)) {
          return nextMs <= nowMs;
        }
      }
      return true;
    });

    const hasDueMistakes = dueMistakes.length > 0;
    const activeMistakesDueTodayCount = dueMistakes.length;

    // Determine due status
    let isDue = false;
    let daysOverdue = 0;

    if (isRevisedToday) {
      // If chapter was already revised today, it is not due today
      isDue = false;
      daysOverdue = 0;
    } else if (chap.status === 'Revision Due') {
      isDue = true;
      daysOverdue = Math.max(1, elapsedDays);
    } else if (chap.nextRevisionDueAt) {
      const dueMs = new Date(chap.nextRevisionDueAt).getTime();
      if (!Number.isNaN(dueMs)) {
        if (dueMs <= nowMs) {
          isDue = true;
          daysOverdue = Math.max(0, Math.floor((nowMs - dueMs) / 86400000));
        }
      }
    } else if (chap.revisionCount && chap.revisionCount > 0) {
      // Previously revised chapter without explicit nextRevisionDueAt
      const interval = chap.sm2Interval || (chap.revisionCount === 1 ? 3 : chap.revisionCount === 2 ? 7 : 14);
      if (elapsedDays >= interval) {
        isDue = true;
        daysOverdue = Math.max(0, elapsedDays - interval);
      }
    } else {
      // Unrevised chapter (revisionCount === 0 or undefined)
      const isEligible = chap.theoryComplete || chap.dppComplete || (typeof chap.completion === 'number' && chap.completion >= 50);
      if (isEligible || hasDueMistakes) {
        isDue = true;
        daysOverdue = 0;
      }
    }

    // Chapter urgency classification
    const urgency: 'overdue' | 'due_today' | 'upcoming' = 
      daysOverdue > 0 ? 'overdue' : isDue ? 'due_today' : 'upcoming';

    // Context-aware plain English due reason
    let dueReason = 'Scheduled SM-2 review';
    if (daysOverdue > 0) {
      dueReason = `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`;
    } else if (activeMistakesDueTodayCount > 0) {
      dueReason = `${activeMistakesDueTodayCount} active mistake${activeMistakesDueTodayCount > 1 ? 's' : ''} to resolve`;
    } else if (!chap.revisionCount || chap.revisionCount === 0) {
      dueReason = 'First review milestone';
    } else if (chap.status === 'Revision Due') {
      dueReason = 'Revision checkpoint';
    }

    // Formulas and Flashcards generation
    const bankEntry = findMatchingBankChapter(chap);
    const formulas = bankEntry?.formulas || [];
    const chapterCards: RevisionCardItem[] = [];

    // 1. Formula Cards
    formulas.forEach((f, idx) => {
      const cardId = `${chap.id}-f${idx}`;
      const dbState = chap.flashcardStates?.[cardId];
      const sm2State = dbState || smEngine.legacyConfidenceToState('Medium');

      let cardIsDue = isDue;
      if (isRevisedToday) {
        cardIsDue = false;
      } else if (dbState?.nextReviewDate) {
        const nextMs = new Date(dbState.nextReviewDate).getTime();
        if (!Number.isNaN(nextMs)) {
          cardIsDue = nextMs <= nowMs;
        }
      }

      const cardItem: RevisionCardItem = {
        id: cardId,
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject as SubjectId,
        cardType: 'formula',
        retentionConfidence: dbState ? (dbState.interval < 3 ? 'Low' : dbState.interval <= 7 ? 'Medium' : 'High') : 'Medium',
        retentionScore: 70,
        title: f.title,
        concept: f.concept,
        formula: f.formula,
        examNote: f.examNote,
        questionPrompt: f.questionPrompt || `Key Concept: ${f.concept}. State the governing formula and conditions.`,
        subtopic: f.subtopic || 'Key Formulas',
        lastReviewedDate: dbState?.lastReviewDate || chap.lastRevisedAt,
        nextReviewDays: sm2State.interval,
        intervalStage: `${sm2State.interval}d`,
        recalledCount: dbState?.repetitions || 0,
        urgencyRank: cardIsDue ? 80 : 30,
        sm2State
      };

      chapterCards.push(cardItem);
      allCards.push(cardItem);
      if (isDue && cardIsDue) {
        dueCards.push(cardItem);
      }
    });

    // 2. Mistake Cards (Preserved in chapterCards/allCards, but decoupled from Spaced Revision queue)
    chapMistakes.forEach(m => {
      const cardId = m.id.startsWith('m-') ? m.id : `m-${m.id}`;
      const dbState = chap.flashcardStates?.[cardId];
      const sm2State = dbState || smEngine.legacyConfidenceToState('Low');

      let cardIsDue = m.revisionStatus !== 'Mastered';
      if (isRevisedToday) {
        cardIsDue = false;
      } else if (dbState?.nextReviewDate) {
        const nextMs = new Date(dbState.nextReviewDate).getTime();
        if (!Number.isNaN(nextMs)) {
          cardIsDue = nextMs <= nowMs;
        }
      }

      const cardItem: RevisionCardItem = {
        id: cardId,
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject as SubjectId,
        cardType: 'mistake',
        mistakeId: m.id,
        retentionConfidence: m.revisionStatus === 'Mastered' ? 'High' : m.revisionStatus === 'Solved Again' ? 'Medium' : 'Low',
        retentionScore: m.recoveryScore || 50,
        title: m.topic ? `Error: ${m.topic}` : `Mistake: ${chap.name}`,
        concept: m.questionText || (m.studentMethod ? `Student Attempt: ${m.studentMethod}` : `Analysis of error in ${chap.name}`),
        questionPrompt: m.questionText ? `Exam Problem (${chap.name}): How do you correctly solve this?` : `How do you resolve this common error in ${chap.name}?`,
        formula: m.correctSolution || m.correctMethod || m.aiAdvice || 'Review core principle to avoid recurrence.',
        subtopic: 'Student Mistake Recovery',
        lastReviewedDate: dbState?.lastReviewDate || m.dateLogged,
        nextReviewDays: sm2State.interval,
        intervalStage: `${sm2State.interval}d`,
        recalledCount: dbState?.repetitions || 0,
        urgencyRank: cardIsDue ? 90 : 25,
        sm2State
      };

      chapterCards.push(cardItem);
      allCards.push(cardItem);
      // NOTE: Mistakes are reviewed in the Mistake Vault / CBT arena, not in the Spaced Revision dueCards queue.
    });

    const totalCardsCount = chapterCards.length;

    const dueItem: DueChapterItem = {
      chapterId: chap.id,
      chapterName: chap.name,
      subject: chap.subject as SubjectId,
      status: chap.status,
      completion: chap.completion || 0,
      revisionCount: chap.revisionCount || 0,
      lastRevisedAt: chap.lastRevisedAt,
      nextRevisionDueAt: chap.nextRevisionDueAt,
      daysOverdue,
      urgency,
      dueReason,
      formulaCardsCount: formulas.length,
      mistakeCardsCount: chapMistakes.length,
      totalCardsCount,
      cards: chapterCards
    };

    if (isDue) {
      dueChapters.push(dueItem);

      // Construct corresponding RevisionCard for revisionQueue
      revisionQueue.push({
        chapterId: chap.id,
        subject: chap.subject as SubjectId,
        chapterName: chap.name,
        reason: dueReason,
        estimatedTime: Math.min(30, Math.max(10, totalCardsCount * 2 || 15)),
        priority: urgency === 'overdue' ? 'High' : (chap.priority === 1 ? 'High' : 'Medium'),
        priorityScore: urgency === 'overdue' ? 85 : 60,
        confidence: chap.confidence || 60,
        difficulty: chap.difficulty || 'Medium',
        lastRevised: chap.lastRevisedAt ? formatDaysAgo(chap.lastRevisedAt, nowMs) : (chap.lastRevisionDaysAgo ? `${chap.lastRevisionDaysAgo}d ago` : 'Never'),
        currentStage: (chap.syllabusStage as any) || (chap.status as any) || 'Theory Complete',
        healthScore: chap.healthScore || 75,
        retentionScore: chap.retentionScore || 70,
        retentionStatus: urgency === 'overdue' ? 'Fading' : 'Stable',
        isCritical: urgency === 'overdue' || daysOverdue > 2,
        daysOverdue
      });
    } else {
      upcomingChapters.push(dueItem);
    }
  }

  // Sort due chapters: overdue first (by daysOverdue desc), then due_today
  dueChapters.sort((a, b) => {
    if (a.urgency === 'overdue' && b.urgency !== 'overdue') return -1;
    if (b.urgency === 'overdue' && a.urgency !== 'overdue') return 1;
    if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return b.completion - a.completion;
  });

  // Sort upcoming chapters: soonest nextRevisionDueAt first
  upcomingChapters.sort((a, b) => {
    const timeA = a.nextRevisionDueAt ? new Date(a.nextRevisionDueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const timeB = b.nextRevisionDueAt ? new Date(b.nextRevisionDueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  // Sort cards by urgency rank
  dueCards.sort((a, b) => b.urgencyRank - a.urgencyRank);
  allCards.sort((a, b) => b.urgencyRank - a.urgencyRank);

  // Count reviews completed today
  const todayStr = new Date(nowMs).toDateString();
  const reviewedTodayCount = sessions.filter(s => {
    if (s.type !== 'Revision') return false;
    const timestamp = s.startTime || s.endTime;
    if (!timestamp) return false;
    return new Date(timestamp).toDateString() === todayStr;
  }).length;

  // Total active unmastered mistakes across all chapters
  const pendingMistakesCount = mistakes.filter(m => m.revisionStatus !== 'Mastered').length;

  return {
    dueChapters,
    upcomingChapters,
    masteredChapters,
    notStartedChapters,
    dueCards,
    allCards,
    revisionQueue,
    stats: {
      totalDueChapters: dueChapters.length,
      totalDueCards: dueCards.length,
      totalUpcomingChapters: upcomingChapters.length,
      totalMasteredChapters: masteredChapters.length,
      totalNotStartedChapters: notStartedChapters.length,
      reviewedTodayCount,
      avgRetentionScore: 75,
      pendingMistakesCount
    }
  };
}
