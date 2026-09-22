import { useState, useMemo, useCallback } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { SubjectId, Mistake } from '@/types/index';

export type MistakeViewMode = 'studio' | 'cbt_retest' | 'remediation_lab';

export function isMistakeDueForReview(m: Mistake): boolean {
  if (m.revisionStatus === 'Mastered') return false;
  const loggedTime = new Date(m.dateLogged || Date.now()).getTime();
  const now = Date.now();
  const diffHours = (now - loggedTime) / (1000 * 60 * 60);
  
  if (m.revisionStatus === 'New') {
    // Due after 24h, or always due if logged today and not yet reviewed
    return diffHours >= 24;
  }
  if (m.revisionStatus === 'Reviewed') {
    // Due after 72h (3 days)
    return diffHours >= 72;
  }
  if (m.revisionStatus === 'Solved Again') {
    // Due after 168h (7 days)
    return diffHours >= 168;
  }
  return true;
}

export function useMistakesState() {
  const actions = useStudyBrainStore(state => state.actions);
  const mistakes = useStudyBrainStore(state => state.mistakes) || [];

  // Active View Mode: Studio (Triage & Inspection), CBT Retest, or Remediation Lab
  const [activeView, setActiveView] = useState<MistakeViewMode>('studio');

  // Filters
  const [activeSubject, setActiveSubject] = useState<SubjectId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'due' | 'mastered'>('all');

  // Selected Active Mistake for deep inspection or remediation
  const [activeMistakeId, setActiveMistakeId] = useState<string | null>(null);

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [interrogationMistake, setInterrogationMistake] = useState<Mistake | null>(null);

  // Selected items for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getSubjectColor = useCallback((sub: SubjectId) => {
    switch (sub) {
      case 'physics': return { text: 'text-sky-400', bg: 'bg-sky-950/30', border: 'border-sky-800/40', badge: 'bg-sky-950/60 text-sky-400 border-sky-800/50' };
      case 'chemistry': return { text: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-800/40', badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' };
      case 'maths': return { text: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-800/40', badge: 'bg-amber-950/60 text-amber-400 border-amber-800/50' };
      default: return { text: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-800', badge: 'bg-zinc-900 text-zinc-400 border-zinc-800' };
    }
  }, []);

  const getStatusBadge = useCallback((status: Mistake['revisionStatus']): { label: string; style: 'destructive' | 'accent' | 'default' | 'success' } => {
    switch (status) {
      case 'New': return { label: 'Box 1: Day 1', style: 'destructive' };
      case 'Reviewed': return { label: 'Box 2: Day 3', style: 'accent' };
      case 'Solved Again': return { label: 'Box 3: Day 7', style: 'default' };
      case 'Mastered': return { label: 'Mastered', style: 'success' };
      default: return { label: status, style: 'default' };
    }
  }, []);

  // Available source exams list
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    mistakes.forEach(m => {
      if (m.source && m.source.trim()) set.add(m.source.trim());
    });
    return Array.from(set).sort();
  }, [mistakes]);

  // Filtered Mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (activeSubject !== 'all' && m.subject !== activeSubject) return false;
      if (selectedTag !== 'all' && !m.mistakeTypes?.includes(selectedTag)) return false;
      if (selectedDifficulty !== 'all' && m.difficulty !== selectedDifficulty) return false;
      if (selectedSource !== 'all' && m.source !== selectedSource) return false;
      
      const isMastered = m.revisionStatus === 'Mastered';
      if (statusFilter === 'unresolved' && isMastered) return false;
      if (statusFilter === 'mastered' && !isMastered) return false;
      if (statusFilter === 'due' && !isMistakeDueForReview(m)) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inQuestion = m.questionText?.toLowerCase().includes(q);
        const inChapter = m.chapter?.toLowerCase().includes(q);
        const inTopic = m.topic?.toLowerCase().includes(q);
        const inSource = m.source?.toLowerCase().includes(q);
        if (!inQuestion && !inChapter && !inTopic && !inSource) return false;
      }
      return true;
    });
  }, [mistakes, activeSubject, selectedTag, selectedDifficulty, selectedSource, statusFilter, searchQuery]);

  // Telemetry Metrics
  const totalMistakes = mistakes.length;
  const resolvedCount = mistakes.filter(m => m.revisionStatus === 'Solved Again' || m.revisionStatus === 'Mastered').length;
  const masteredCount = mistakes.filter(m => m.revisionStatus === 'Mastered').length;
  const unresolvedCount = totalMistakes - resolvedCount;
  const resolutionRate = totalMistakes > 0 ? Math.round((resolvedCount / totalMistakes) * 100) : 100;
  const dueCount = useMemo(() => mistakes.filter(isMistakeDueForReview).length, [mistakes]);

  const leitnerBoxes = useMemo(() => {
    return {
      box1: mistakes.filter(m => m.revisionStatus === 'New').length,
      box2: mistakes.filter(m => m.revisionStatus === 'Reviewed').length,
      box3: mistakes.filter(m => m.revisionStatus === 'Solved Again').length,
      mastered: masteredCount
    };
  }, [mistakes, masteredCount]);

  // Automated Leitner 3-Day & 7-Day Progression
  const advanceLeitnerStatus = useCallback(async (mistakeId: string, isSuccess: boolean) => {
    const target = mistakes.find(m => m.id === mistakeId);
    if (!target) return;

    if (isSuccess) {
      if (target.revisionStatus === 'New') {
        await actions.updateMistakeStatus(mistakeId, 'Reviewed');
      } else if (target.revisionStatus === 'Reviewed') {
        await actions.updateMistakeStatus(mistakeId, 'Solved Again');
      } else {
        await actions.updateMistakeStatus(mistakeId, 'Mastered');
      }
    } else {
      await actions.updateMistakeStatus(mistakeId, 'New');
    }
  }, [mistakes, actions]);

  // Toggle selection for bulk actions
  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredMistakes.map(m => m.id)));
  }, [filteredMistakes]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    state: {
      mistakes,
      activeView,
      activeSubject,
      searchQuery,
      selectedTag,
      selectedDifficulty,
      selectedSource,
      statusFilter,
      activeMistakeId,
      isLogModalOpen,
      isPrintModalOpen,
      interrogationMistake,
      filteredMistakes,
      totalMistakes,
      unresolvedCount,
      resolvedCount,
      masteredCount,
      resolutionRate,
      dueCount,
      leitnerBoxes,
      availableSources,
      selectedIds
    },
    handlers: {
      setActiveView,
      setActiveSubject,
      setSearchQuery,
      setSelectedTag,
      setSelectedDifficulty,
      setSelectedSource,
      setStatusFilter,
      setActiveMistakeId,
      setIsLogModalOpen,
      setIsPrintModalOpen,
      setInterrogationMistake,
      advanceLeitnerStatus,
      toggleSelectId,
      selectAllFiltered,
      clearSelection,
      getSubjectColor,
      getStatusBadge
    },
    actions
  };
}
