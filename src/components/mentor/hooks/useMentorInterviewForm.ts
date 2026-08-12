import { useState, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { SubjectId, Chapter } from '@/types/index';
import { getValidTargetYears } from '@/utils/dateUtils';

export type ExamOption = 'JEE Main' | 'JEE Advanced' | 'Boards' | 'MHT CET' | 'BITSAT' | 'Others';

export const useMentorInterviewForm = (onClose?: () => void) => {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters);
  const mentorProfile = useStudyBrainStore(state => state.mentorProfile);
  const settings = useStudyBrainStore(state => state.settings);

  const [step, setStep] = useState<number>(1);
  const [selectedExams, setSelectedExams] = useState<ExamOption[]>(
    mentorProfile?.targetExams as ExamOption[] || ['JEE Main', 'JEE Advanced']
  );
  const [targetYear, setTargetYear] = useState<string>(
    mentorProfile?.targetYear || settings.targetYear || getValidTargetYears()[0]
  );
  const [targetPercentile, setTargetPercentile] = useState<string>(
    mentorProfile?.targetPercentile || '99.5+'
  );
  const [targetRank, setTargetRank] = useState<string>(
    mentorProfile?.targetRank || 'AIR < 1000'
  );
  const [targetCollege, setTargetCollege] = useState<string>(
    mentorProfile?.targetCollege || settings.dreamIit || 'IIT Bombay'
  );
  const [targetBranch, setTargetBranch] = useState<string>(
    mentorProfile?.targetBranch || settings.targetBranch || 'Computer Science & Engineering'
  );
  const [currentClass, setCurrentClass] = useState<'11th' | '12th' | 'Dropper'>(
    mentorProfile?.currentClass || '12th'
  );
  const [coachingType, setCoachingType] = useState<'Online Coaching' | 'Offline Coaching' | 'Self Study' | 'School + Coaching'>(
    mentorProfile?.coachingType || 'Online Coaching'
  );
  const [coachingName, setCoachingName] = useState<string>(
    mentorProfile?.coachingName || ''
  );
  const [dailyHours, setDailyHours] = useState<number>(
    mentorProfile?.dailyAvailableHours || 6
  );
  const [subjectSplitStrategy, setSubjectSplitStrategy] = useState<'3_a_day' | '2_a_day_alternating' | '1_a_day_alternating'>(
    mentorProfile?.subjectSplitStrategy || '3_a_day'
  );
  const defaultTwoDayConfig: [SubjectId[], SubjectId[], SubjectId[]] = [
    ['physics', 'chemistry'],
    ['chemistry', 'maths'],
    ['maths', 'physics']
  ];
  const [twoDaySplitConfig, setTwoDaySplitConfig] = useState<[SubjectId[], SubjectId[], SubjectId[]]>(
    mentorProfile?.twoDaySplitConfig || defaultTwoDayConfig
  );

  const initialRealityState = () => {
    const map: Record<string, 'Not Started' | 'In Progress' | 'Completed'> = {};
    chapters.forEach(c => {
      map[c.id] = 'Not Started';
    });
    return map;
  };
  const [chapterReality, setChapterReality] = useState<Record<string, 'Not Started' | 'In Progress' | 'Completed'>>(initialRealityState);
  const [activeAuditSubject, setActiveAuditSubject] = useState<SubjectId>('physics');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleExam = (exam: ExamOption) => {
    if (selectedExams.includes(exam)) {
      if (selectedExams.length > 1) {
        setSelectedExams(selectedExams.filter(e => e !== exam));
      }
    } else {
      setSelectedExams([...selectedExams, exam]);
    }
  };

  const handleRealityChange = (chapterId: string, status: 'Not Started' | 'In Progress' | 'Completed') => {
    setChapterReality(prev => ({ ...prev, [chapterId]: status }));
  };

  const handleFinishInterview = async () => {
    setIsSubmitting(true);
    try {
      const chapterUpdates = Object.entries(chapterReality).map(([id, status]) => ({
        id,
        status,
        confidence: status === 'Completed' ? 85 : status === 'In Progress' ? 50 : 20
      }));

      await actions.completeMentorInterview({
        targetExams: selectedExams as any,
        targetYear,
        targetPercentile,
        targetRank,
        targetCollege,
        targetBranch,
        currentClass,
        coachingType,
        coachingName: coachingName.trim(),
        dailyAvailableHours: dailyHours,
        subjectSplitStrategy,
        twoDaySplitConfig,
      }, chapterUpdates);

      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to save mentor interview", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = Object.values(chapterReality).filter(s => s === 'Completed').length;
  const inProgressCount = Object.values(chapterReality).filter(s => s === 'In Progress').length;
  const notStartedCount = Object.values(chapterReality).filter(s => s === 'Not Started').length;

  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => {
      const aMatch = a.id.match(/(\d+)/);
      const bMatch = b.id.match(/(\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
      return aNum - bNum;
    });
  }, [chapters]);

  const currentSubjectChapters = useMemo(() => {
    return sortedChapters.filter(c => c.subject === activeAuditSubject);
  }, [sortedChapters, activeAuditSubject]);

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return currentSubjectChapters;
    const q = searchQuery.toLowerCase();
    return currentSubjectChapters.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.unit.toLowerCase().includes(q)
    );
  }, [currentSubjectChapters, searchQuery]);

  const groupedByUnit = useMemo(() => {
    const groups: { unit: string; chapters: Chapter[] }[] = [];
    filteredChapters.forEach(chap => {
      let grp = groups.find(g => g.unit === chap.unit);
      if (!grp) {
        grp = { unit: chap.unit, chapters: [] };
        groups.push(grp);
      }
      grp.chapters.push(chap);
    });
    return groups;
  }, [filteredChapters]);

  return {
    step, setStep,
    selectedExams, toggleExam,
    targetYear, setTargetYear,
    targetPercentile, setTargetPercentile,
    targetRank, setTargetRank,
    targetCollege, setTargetCollege,
    targetBranch, setTargetBranch,
    currentClass, setCurrentClass,
    coachingType, setCoachingType,
    coachingName, setCoachingName,
    dailyHours, setDailyHours,
    subjectSplitStrategy, setSubjectSplitStrategy,
    twoDaySplitConfig, setTwoDaySplitConfig,
    chapterReality, handleRealityChange,
    activeAuditSubject, setActiveAuditSubject,
    searchQuery, setSearchQuery,
    isSubmitting, handleFinishInterview,
    completedCount, inProgressCount, notStartedCount,
    groupedByUnit
  };
};
