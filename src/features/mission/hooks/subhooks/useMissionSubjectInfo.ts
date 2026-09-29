import { useState, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

export interface UseMissionSubjectInfoProps {
  activeSubjectProp: 'physics' | 'chemistry' | 'maths' | 'all';
  activeMissionId?: string;
  customDurationSecs?: number;
}

export function useMissionSubjectInfo({
  activeSubjectProp,
  activeMissionId,
  customDurationSecs
}: UseMissionSubjectInfoProps) {
  const safeInitial = (activeSubjectProp === 'all' || !['physics', 'chemistry', 'maths'].includes(activeSubjectProp)) 
    ? 'physics' 
    : (activeSubjectProp as 'physics' | 'chemistry' | 'maths');
  const [activeSubject, setActiveSubject] = useState<'physics' | 'chemistry' | 'maths'>(safeInitial);
  const [extraTimeAdded, setExtraTimeAdded] = useState(0);
  const [forcePracticeMode, setForcePracticeMode] = useState<boolean>(false);

  const todayMissions = useStudyBrainStore(state => state.todayMissions);
  const chapters = useStudyBrainStore(state => state.chapters);
  const chaptersWithData = useStudyBrainStore(state => state.chaptersWithData);
  const radarFocusedChapter = useStudyBrainStore(state => (state as any).radarFocusedChapter);
  const xp = useStudyBrainStore(state => state.xp);

  const subjectsDetails = useMemo(() => {
    const getActiveChapterInfo = (subj: 'physics' | 'chemistry' | 'maths') => {
      const subjChaps = chapters.filter(c => c.subject === subj);
      const focusedId = radarFocusedChapter;
      const focusedChap = focusedId
        ? subjChaps.find(c => c.id === focusedId || c.name === focusedId)
        : undefined;
      let mission = todayMissions.find(m => m.subject === subj && !m.completed);
      if (activeMissionId) {
        const explicitMission = todayMissions.find(m => m.id === activeMissionId && m.subject === subj);
        if (explicitMission) mission = explicitMission;
      }
      
      let activeChap = focusedChap || subjChaps.find(c => c.completion < 100) || subjChaps[0];
      if (mission?.chapterId) {
        const mc = subjChaps.find(c => c.id === mission.chapterId);
        if (mc) activeChap = mc;
      }

      if (!activeChap) {
        return {
          name: subj === 'physics' ? 'Physics' : subj === 'chemistry' ? 'Chemistry' : 'Mathematics',
          chapter: mission?.chapterName || mission?.chapter || 'Syllabus Core',
          lecture: mission?.taskName || 'Lecture 1: Introduction',
          duration: mission?.duration ? `${mission.duration}m remaining` : '0h',
          color: subj === 'physics' ? 'sky' : subj === 'chemistry' ? 'emerald' : 'purple',
          textClass: subj === 'physics' ? 'text-sky-400' : subj === 'chemistry' ? 'text-emerald-400' : 'text-indigo-400',
          bgGlow: subj === 'physics' ? 'bg-sky-500/10' : subj === 'chemistry' ? 'bg-emerald-500/10' : 'bg-indigo-500/10',
          borderClass: subj === 'physics' ? 'border-sky-500/20' : subj === 'chemistry' ? 'border-emerald-500/20' : 'border-indigo-500/20'
        };
      }

      const nextLec = Math.min(activeChap.totalLectures, activeChap.currentLecture + 1);
      let durationStr = '';
      if (mission?.duration) {
        durationStr = `${mission.duration}m remaining`;
      } else {
        const activeChapData = chaptersWithData.find(c => c.chapter.id === activeChap.id)?.data;
        const estTime = activeChapData ? Math.max(1, activeChapData.estimatedRemainingTime) : 5;
        durationStr = `${estTime}h remaining`;
      }

      return {
        name: subj === 'physics' ? 'Physics' : subj === 'chemistry' ? 'Chemistry' : 'Mathematics',
        chapter: mission?.chapterName || mission?.chapter || activeChap.name,
        lecture: mission?.taskName || (nextLec > 0 ? `Lecture ${nextLec}: Core Foundations` : `Lecture 1: Introduction`),
        duration: durationStr,
        color: subj === 'physics' ? 'sky' : subj === 'chemistry' ? 'emerald' : 'purple',
        textClass: subj === 'physics' ? 'text-sky-400' : subj === 'chemistry' ? 'text-emerald-400' : 'text-indigo-400',
        bgGlow: subj === 'physics' ? 'bg-sky-500/10' : subj === 'chemistry' ? 'bg-emerald-500/10' : 'bg-indigo-500/10',
        borderClass: subj === 'physics' ? 'border-sky-500/20' : subj === 'chemistry' ? 'border-emerald-500/20' : 'border-indigo-500/20'
      };
    };

    return {
      physics: getActiveChapterInfo('physics'),
      chemistry: getActiveChapterInfo('chemistry'),
      maths: getActiveChapterInfo('maths')
    };
  }, [chapters, radarFocusedChapter, todayMissions, chaptersWithData, activeMissionId]);

  const activeDetails = subjectsDetails[activeSubject];

  const activeSubjectMission = useMemo(() => {
    if (activeMissionId) {
      const explicitMission = todayMissions.find(m => m.id === activeMissionId);
      if (explicitMission && explicitMission.subject.toLowerCase() === activeSubject.toLowerCase()) {
        return explicitMission;
      }
    }
    return todayMissions.find(m => m.subject.toLowerCase() === activeSubject.toLowerCase() && !m.completed);
  }, [todayMissions, activeSubject, activeMissionId]);

  const activeChap = useMemo(() => {
    const subjChaps = chapters.filter(c => c.subject === activeSubject);
    if (radarFocusedChapter) {
      const focused = subjChaps.find(c => c.id === radarFocusedChapter || c.name === radarFocusedChapter);
      if (focused) return focused;
    }
    return subjChaps.find(c => c.completion < 100) || subjChaps[0];
  }, [chapters, radarFocusedChapter, activeSubject]);

  const isCompletedChapter = useMemo(() => {
    if (!activeChap) return false;
    return activeChap.completion >= 100 || activeChap.status === 'Mastered';
  }, [activeChap]);

  const isPracticeMission = useMemo(() => {
    if (forcePracticeMode) return true;
    let activeSubjMission = todayMissions.find(m => m.subject === activeSubject && !m.completed);
    if (activeMissionId) {
      const explicitMission = todayMissions.find(m => m.id === activeMissionId);
      if (explicitMission) activeSubjMission = explicitMission;
    }
    if (!activeSubjMission) return false;
    const type = activeSubjMission.type.toLowerCase();
    return type.includes('practice') || type.includes('pyq') || type.includes('revision');
  }, [todayMissions, activeSubject, forcePracticeMode, activeMissionId]);

  const sessionDurationSecs = useMemo(() => {
    if (customDurationSecs) return customDurationSecs + extraTimeAdded * 60;
    let activeSubjMission = todayMissions.find(m => m.subject === activeSubject && !m.completed);
    if (activeMissionId) {
      const explicitMission = todayMissions.find(m => m.id === activeMissionId);
      if (explicitMission) activeSubjMission = explicitMission;
    }
    return (activeSubjMission?.duration || 60) * 60 + extraTimeAdded * 60;
  }, [customDurationSecs, todayMissions, activeSubject, extraTimeAdded, activeMissionId]);

  return {
    activeSubject,
    setActiveSubject,
    extraTimeAdded,
    setExtraTimeAdded,
    forcePracticeMode,
    setForcePracticeMode,
    subjectsDetails,
    activeDetails,
    activeSubjectMission,
    activeChap,
    isCompletedChapter,
    isPracticeMission,
    sessionDurationSecs,
    xp
  };
}
