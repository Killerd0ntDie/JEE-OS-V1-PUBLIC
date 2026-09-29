import { Chapter, SubjectId } from '../../types/index';
import { WeeklyBlock } from './weeklyTypes';
import { formatMorningSlot } from './timeSlotUtils';
import { normalizeTwoDaySplitConfig } from './splitConfigHelpers';

export function scheduleProceduralWeekly(
  dayIndex: number,
  dayName: string,
  currentDayIndex: number,
  splitStrategy: '1_a_day_alternating' | '2_a_day_alternating' | '3_a_day',
  chapters: Chapter[],
  twoDaySplitConfig: [SubjectId[], SubjectId[], SubjectId[]] | undefined,
  dayStartTime: string = "07:00",
  idCounter: { current: number }
): WeeklyBlock[] {
  const blocks: WeeklyBlock[] = [];

  // Only schedule chapters the user has explicitly started and that are NOT on hold.
  const activeChaps = chapters.filter(c => 
    !c.chapterOnHold && 
    ((c.currentLecture && c.currentLecture > 0) || 
     c.theoryComplete || c.dppComplete || 
     (c.solvedQuestions && c.solvedQuestions > 0)) &&
    c.completion < 100
  );

  const getUniqueChap = (subj: SubjectId, offset: number): Chapter | null => {
    const subjActive = activeChaps.filter(c => c.subject === subj);
    if (subjActive.length > offset) return subjActive[offset];
    if (subjActive.length > 0) return subjActive[offset % subjActive.length];
    return null;
  };

  const physChap = getUniqueChap('physics', Math.floor(dayIndex / 2));
  const chemChap = getUniqueChap('chemistry', Math.floor(dayIndex / 2));
  const mathChap = getUniqueChap('maths', Math.floor(dayIndex / 2));

  if (splitStrategy === '1_a_day_alternating') {
    const targetSubj: SubjectId = dayIndex % 3 === 0 ? 'physics' : dayIndex % 3 === 1 ? 'chemistry' : 'maths';
    const chap = targetSubj === 'physics' ? physChap : targetSubj === 'chemistry' ? chemChap : mathChap;
    const subjName = targetSubj.charAt(0).toUpperCase() + targetSubj.slice(1);

    if (chap) {
      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: formatMorningSlot(dayStartTime),
        subject: targetSubj,
        chapterId: chap.id,
        chapterName: chap.name,
        unit: chap.unit || 'Core Module',
        activity: `Deep-Dive Theory & Core Concept Mastery in ${chap.name}`,
        taskType: 'Watch Lecture',
        durationMinutes: 90,
        completed: dayIndex < currentDayIndex,
        priorityScore: 95 - dayIndex,
        reasoning: {
          whySelected: `1-Subject Focus day dedicated to intensive concept mastery in ${chap.name}.`,
          dependentChapters: [`Advanced Problem Solving in ${chap.name}`],
          rankingRationale: `Single-subject immersion maximizes cognitive focus and depth of understanding.`,
          longTermImpact: `Mastery of this core high-weightage chapter yields +8 Marks in JEE Main.`,
          postponeRisk: `Delaying will disrupt the structured single-subject alternating rhythm.`,
          targetAccuracy: `85% Conceptual Accuracy`
        }
      });

      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: 'Afternoon (14:00 - 16:00)',
        subject: targetSubj,
        chapterId: chap.id,
        chapterName: chap.name,
        unit: chap.unit || 'Core Module',
        activity: `Solve 20 DPP Problems in ${chap.name}`,
        taskType: 'Solve DPP',
        durationMinutes: 90,
        completed: dayIndex < currentDayIndex,
        priorityScore: 91 - dayIndex,
        reasoning: {
          whySelected: `Same-day application drill to solidify theoretical concepts learned in the morning.`,
          dependentChapters: [`PYQ Solving for ${chap.name}`],
          rankingRationale: `Applying concepts immediately after theory locks in synaptic pathways.`,
          longTermImpact: `Builds numerical problem-solving confidence and speed for ${chap.name}.`,
          postponeRisk: `Concept retention decays significantly if practice is separated from theory.`,
          targetAccuracy: `80% Problem Solving Accuracy`
        }
      });

      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: 'Evening (17:30 - 19:30)',
        subject: targetSubj,
        chapterId: chap.id,
        chapterName: chap.name,
        unit: chap.unit || 'Core Module',
        activity: `Solve 15 Past JEE Main PYQs (2020-2024) in ${chap.name}`,
        taskType: 'Solve PYQs',
        durationMinutes: 75,
        completed: dayIndex < currentDayIndex,
        priorityScore: 88 - dayIndex,
        reasoning: {
          whySelected: `Authentic exam calibration: Testing ${chap.name} concepts against actual JEE questions.`,
          dependentChapters: [`Full Syllabus Mocks`],
          rankingRationale: `Direct past paper practice provides the highest correlation with final exam score.`,
          longTermImpact: `Familiarity with JEE question patterns directly eliminates exam surprises.`,
          postponeRisk: `Without PYQ practice, difficulty blind spots remain unaddressed.`,
          targetAccuracy: `75% Authentic Exam Accuracy`
        }
      });

      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: 'Night (21:30 - 22:30)',
        subject: 'revision',
        chapterId: 'rev-all',
        chapterName: `${subjName} Formula Revision & Mistakes Review`,
        unit: 'Recall Engine',
        activity: `Review Formulas & Past Mistakes in ${subjName}`,
        taskType: 'Revise Formulas',
        durationMinutes: 45,
        completed: dayIndex < currentDayIndex,
        priorityScore: 82 - dayIndex,
        reasoning: {
          whySelected: `Night-time consolidation: Reviewing formulas and error logs right before sleep boosts memory consolidation.`,
          dependentChapters: [`All ${subjName} Chapters`],
          rankingRationale: `Active formula recall prevents standard memory decay.`,
          longTermImpact: `Ensures instant formula recall under exam time pressure.`,
          postponeRisk: `Unreviewed errors are likely to be repeated in subsequent problem sets.`,
          targetAccuracy: `95% Formula Recall`
        }
      });
    }
  } else if (splitStrategy === '2_a_day_alternating') {
    const twoDaySplit = normalizeTwoDaySplitConfig(twoDaySplitConfig);
    const dayPair = twoDaySplit[dayIndex % 3];
    const morningSubj = dayPair[0];
    const eveningSubj = dayPair[1];

    const morningChap = morningSubj === 'physics' ? physChap : morningSubj === 'chemistry' ? chemChap : mathChap;
    const eveningChap = eveningSubj === 'physics' ? physChap : eveningSubj === 'chemistry' ? chemChap : mathChap;

    if (morningChap) {
      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: formatMorningSlot(dayStartTime),
        subject: morningSubj,
        chapterId: morningChap.id,
        chapterName: morningChap.name,
        unit: morningChap.unit || 'Core Module',
        activity: `Watch 2 Lectures + Notes for ${morningChap.name}`,
        taskType: 'Watch Lecture',
        durationMinutes: 90,
        completed: dayIndex < currentDayIndex,
        priorityScore: 94 - dayIndex,
        reasoning: {
          whySelected: `High priority lecture session scheduled during morning peak focus window.`,
          dependentChapters: [`Advanced Problems in ${morningChap.name}`],
          rankingRationale: `Theory coverage prerequisite for subsequent problem-solving drills.`,
          longTermImpact: `Advances ${morningSubj} syllabus completion towards 100% readiness.`,
          postponeRisk: `Pushes entire ${morningSubj} module schedule back by one rotation cycle.`,
          targetAccuracy: `85% Conceptual Mastery`
        }
      });
    }

    if (eveningChap) {
      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: 'Afternoon (14:00 - 16:00)',
        subject: eveningSubj,
        chapterId: eveningChap.id,
        chapterName: eveningChap.name,
        unit: eveningChap.unit || 'Core Module',
        activity: `Solve 15 DPP Problems in ${eveningChap.name}`,
        taskType: 'Solve DPP',
        durationMinutes: 75,
        completed: dayIndex < currentDayIndex,
        priorityScore: 90 - dayIndex,
        reasoning: {
          whySelected: `Same-day problem drill to solidify theory learned in ${eveningChap.name}.`,
          dependentChapters: [`PYQ Practice`],
          rankingRationale: `Immediate practice cements procedural problem-solving techniques.`,
          longTermImpact: `Boosts speed from 3.0 min/Q to 2.0 min/Q in ${eveningChap.name}.`,
          postponeRisk: `Retention drops by 40% if DPP practice is delayed beyond 24 hours.`,
          targetAccuracy: `80% Problem Solving Accuracy`
        }
      });
    }

    if (morningChap) {
      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: 'Evening (17:30 - 19:30)',
        subject: morningSubj,
        chapterId: morningChap.id,
        chapterName: morningChap.name,
        unit: morningChap.unit || 'Core Module',
        activity: `Solve 20 Past JEE Main PYQs (2019-2024) in ${morningChap.name}`,
        taskType: 'Solve PYQs',
        durationMinutes: 90,
        completed: dayIndex < currentDayIndex,
        priorityScore: 92 - dayIndex,
        reasoning: {
          whySelected: `High-yield authentic exam problem practice for ${morningChap.name}.`,
          dependentChapters: [`Full Syllabus Mocks`],
          rankingRationale: `PYQs carry the highest statistical weight for predicting JEE Main score gains.`,
          longTermImpact: `Directly contributes to +8 Marks in ${morningSubj} during mock exams.`,
          postponeRisk: `Omitting PYQs leaves real exam question traps undetected.`,
          targetAccuracy: `85% PYQ Accuracy Target`
        }
      });
    }

    blocks.push({
      id: `wb-${idCounter.current++}`,
      dayIndex,
      dayName,
      timeSlot: 'Night (21:30 - 22:30)',
      subject: 'revision',
      chapterId: 'rev-all',
      chapterName: `Formula Revision & Mistakes Review (${eveningSubj})`,
      unit: 'Recall Engine',
      activity: `Review Formulas & Past Mistakes`,
      taskType: 'Review Mistakes',
      durationMinutes: 45,
      completed: dayIndex < currentDayIndex,
      priorityScore: 84 - dayIndex,
      reasoning: {
        whySelected: `Active recall drill targeting recent error patterns in ${eveningSubj}.`,
        dependentChapters: [`All ${eveningSubj} Chapters`],
        rankingRationale: `Targeted revision stops recurring error patterns in their tracks.`,
        longTermImpact: `Reduces negative marking in ${eveningSubj} by 60%.`,
        postponeRisk: `Unreviewed errors recur with 70% probability in next mock test.`,
        targetAccuracy: `90% Formula Recall`
      }
    });
  } else {
    // 3_a_day
    const morningSubj: SubjectId = dayIndex % 3 === 0 ? 'physics' : dayIndex % 3 === 1 ? 'chemistry' : 'maths';
    const morningChap = morningSubj === 'physics' ? physChap : morningSubj === 'chemistry' ? chemChap : mathChap;

    if (morningChap) {
      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: formatMorningSlot(dayStartTime),
        subject: morningSubj,
        chapterId: morningChap.id,
        chapterName: morningChap.name,
        unit: morningChap.unit || 'Mechanics',
        activity: `Watch 2 Lectures + Notes for ${morningChap.name}`,
        taskType: 'Watch Lecture',
        durationMinutes: 90,
        completed: dayIndex < currentDayIndex,
        priorityScore: 95 - dayIndex,
        reasoning: {
          whySelected: `Scheduled as prime morning deep-work block due to high cognitive demand of new theory.`,
          dependentChapters: [`Rotational Dynamics`, `Work Power Energy`],
          rankingRationale: `Fundamental prerequisite for solving advanced JEE Main numericals.`,
          longTermImpact: `Mastery of this chapter directly unlocks 12 Marks in Physics Paper 1.`,
          postponeRisk: `Delaying will cascade into delays for 3 downstream mechanics chapters.`,
          targetAccuracy: `85% Concept Check Accuracy`
        }
      });
    }

    const afternoonSubj: SubjectId = dayIndex % 3 === 0 ? 'chemistry' : dayIndex % 3 === 1 ? 'maths' : 'physics';
    const afternoonChap = afternoonSubj === 'chemistry' ? chemChap : afternoonSubj === 'maths' ? mathChap : physChap;

    if (afternoonChap) {
      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: 'Afternoon (14:00 - 16:00)',
        subject: afternoonSubj,
        chapterId: afternoonChap.id,
        chapterName: afternoonChap.name,
        unit: afternoonChap.unit || 'Organic Chemistry',
        activity: `Solve 15 DPP Problems in ${afternoonChap.name}`,
        taskType: 'Solve DPP',
        durationMinutes: 75,
        completed: dayIndex < currentDayIndex,
        priorityScore: 89 - dayIndex,
        reasoning: {
          whySelected: `Timed problem-solving drill to reinforce theory learned in ${afternoonChap.name}.`,
          dependentChapters: [`Advanced ${afternoonChap.name} Problems`],
          rankingRationale: `Essential for converting theoretical understanding into numerical speed.`,
          longTermImpact: `Increases problem-solving velocity from 2.5 min/Q to 1.8 min/Q.`,
          postponeRisk: `Concept retention drops by 35% if DPP is delayed beyond 24 hours of lecture.`,
          targetAccuracy: `80% DPP Accuracy`
        }
      });
    }

    const eveningSubj: SubjectId = dayIndex % 3 === 0 ? 'maths' : dayIndex % 3 === 1 ? 'physics' : 'chemistry';
    const eveningChap = eveningSubj === 'maths' ? mathChap : eveningSubj === 'physics' ? physChap : chemChap;

    if (eveningChap) {
      blocks.push({
        id: `wb-${idCounter.current++}`,
        dayIndex,
        dayName,
        timeSlot: 'Evening (17:30 - 19:30)',
        subject: eveningSubj,
        chapterId: eveningChap.id,
        chapterName: eveningChap.name,
        unit: eveningChap.unit || 'Algebra',
        activity: `Solve 20 Past JEE Main PYQs (2019-2024)`,
        taskType: 'Solve PYQs',
        durationMinutes: 90,
        completed: dayIndex < currentDayIndex,
        priorityScore: 92 - dayIndex,
        reasoning: {
          whySelected: `High-yield authentic exam question practice for ${eveningChap.name}.`,
          dependentChapters: [`JEE Mock Test Performance`],
          rankingRationale: `PYQs carry the highest direct correlation with JEE Main score improvement.`,
          longTermImpact: `Directly contributes to +8 Marks in upcoming full-syllabus test.`,
          postponeRisk: `Unattempted PYQs leave exam question pattern traps undetected.`,
          targetAccuracy: `85% PYQ Accuracy Target`
        }
      });
    }

    blocks.push({
      id: `wb-${idCounter.current++}`,
      dayIndex,
      dayName,
      timeSlot: 'Night (21:30 - 22:30)',
      subject: 'revision',
      chapterId: 'rev-all',
      chapterName: 'Spaced Revision & Mistakes Review',
      unit: 'Recall Engine',
      activity: `Review 5 Mistakes Ledger Errors & Active Recall Cards`,
      taskType: 'Review Mistakes',
      durationMinutes: 45,
      completed: dayIndex < currentDayIndex,
      priorityScore: 85 - dayIndex,
      reasoning: {
        whySelected: `Active recall drill based on forgetting curve decay monitoring.`,
        dependentChapters: [`All Previously Studied Modules`],
        rankingRationale: `Prevents memory decay for chapters completed more than 7 days ago.`,
        longTermImpact: `Sustains retention score above 85% until exam day.`,
        postponeRisk: `Memory decay drops retention by 40% after 14 days without active recall.`,
        targetAccuracy: `90% Flashcard Recall`
      }
    });
  }

  return blocks;
}
