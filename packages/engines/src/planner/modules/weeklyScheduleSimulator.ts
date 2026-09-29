import { PlannerInput, ScheduledTask } from '../types';
import { SubjectId } from '../../types/index';

export function simulateProgressiveWeeklySchedule(
  candidates: ScheduledTask[],
  todaysMission: ScheduledTask[],
  input: PlannerInput,
  availableMinutes: number,
  splitStrategy: string,
  twoDayConfig: [SubjectId[], SubjectId[], SubjectId[]]
): Record<number, ScheduledTask[]> {
  const weeklySchedule: Record<number, ScheduledTask[]> = {};

  const subjectCandidatesMap: Record<string, ScheduledTask[]> = {
    physics: candidates.filter(c => c.subjectId === 'physics'),
    chemistry: candidates.filter(c => c.subjectId === 'chemistry'),
    maths: candidates.filter(c => c.subjectId === 'maths'),
    revision: candidates.filter(c => c.type === 'Revise Formulas' || c.type === 'Review Mistakes')
  };

  const subjectPointer: Record<string, number> = { physics: 0, chemistry: 0, maths: 0, revision: 0 };
  const chapterSimulatedLecture: Record<string, number> = {};

  for (let day = 0; day < 7; day++) {
    let allowedSubjects: string[] = ['physics', 'chemistry', 'maths'];
    if (splitStrategy === '2_a_day_alternating') {
      allowedSubjects = twoDayConfig[day % 3] || ['physics', 'chemistry'];
    } else if (splitStrategy === '1_a_day_alternating') {
      allowedSubjects = day % 3 === 0 ? ['physics'] : day % 3 === 1 ? ['chemistry'] : ['maths'];
    }

    let dayMins = 0;
    const dayTasks: ScheduledTask[] = [];
    const perSubjBudget = availableMinutes / (allowedSubjects.length || 1);

    for (const subj of allowedSubjects) {
      const subjCands = subjectCandidatesMap[subj] || [];
      if (subjCands.length === 0) continue;

      let subjMins = 0;
      let ptr = subjectPointer[subj] || 0;
      let attempts = 0;
      const usedTasksInDay = new Set<string>();

      while (subjMins + 40 <= perSubjBudget && attempts < 8) {
        attempts++;
        const baseTask = subjCands[ptr % subjCands.length];
        ptr++;

        if (!baseTask || usedTasksInDay.has(baseTask.id)) continue;
        usedTasksInDay.add(baseTask.id);

        const taskToPush = { ...baseTask, id: `plan-${day}-${baseTask.id}` };
        if (taskToPush.type === 'Watch Lecture') {
          const chapId = baseTask.chapterId;
          const chapter = input.chapters?.find(c => c.id === chapId);
          const totalLecs = chapter?.totalLectures || 12;
          const baseLec = chapter?.currentLecture || 0;
          
          const currentSimLec = (chapterSimulatedLecture[chapId] || baseLec) + 1;
          if (currentSimLec > totalLecs) {
            continue; // Skip ghost lectures in weekly simulation
          }
          chapterSimulatedLecture[chapId] = currentSimLec;
          taskToPush.id = `plan-${day}-lec-${chapId}-${currentSimLec}`;
          taskToPush.taskName = `Lecture ${currentSimLec}: ${baseTask.chapterName}`;
        }

        if (dayMins + taskToPush.duration <= availableMinutes + 30) {
          dayTasks.push(taskToPush);
          dayMins += taskToPush.duration;
          subjMins += taskToPush.duration;
        } else {
          break;
        }
      }
      subjectPointer[subj] = ptr;
    }

    // Add revision/mistakes review block for night slot if time permits
    if (dayMins < availableMinutes && subjectCandidatesMap.revision.length > 0) {
      const revTask = subjectCandidatesMap.revision[day % subjectCandidatesMap.revision.length];
      if (revTask && dayMins + revTask.duration <= availableMinutes + 30) {
        dayTasks.push({ ...revTask, id: `rev-${day}-${revTask.id}` });
      }
    } else if (dayMins < availableMinutes) {
      const anyRevTask = candidates.find(c => c.type === 'Revise Formulas' || c.type === 'Review Mistakes');
      if (anyRevTask && dayMins + anyRevTask.duration <= availableMinutes + 30) {
        dayTasks.push({ ...anyRevTask, id: `rev-${day}-${anyRevTask.id}` });
      }
    }

    weeklySchedule[day] = dayTasks.length > 0 ? dayTasks : todaysMission.filter(t => allowedSubjects.includes(t.subjectId));
  }

  return weeklySchedule;
}
