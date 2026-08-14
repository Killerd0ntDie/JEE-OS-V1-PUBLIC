import { useState, useMemo } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { SubjectId, Mistake } from '@/types/index';

export function useMistakesState() {
  const actions = useStudyBrainStore(state => state.actions);
  const mistakes = useStudyBrainStore(state => state.mistakes) || [];

  // Filters & State
  const [activeSubject, setActiveSubject] = useState<SubjectId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [reSolvingMistake, setReSolvingMistake] = useState<Mistake | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interrogationMistake, setInterrogationMistake] = useState<Mistake | null>(null);

  const getSubjectColor = (sub: SubjectId) => {
    switch (sub) {
      case 'physics': return { text: 'text-blue-400', bg: 'bg-blue-950/30', border: 'border-blue-900/50', badge: 'bg-blue-950 text-blue-400 border-blue-900' };
      case 'chemistry': return { text: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-900/50', badge: 'bg-amber-950 text-amber-400 border-amber-900' };
      case 'maths': return { text: 'text-emerald-400', bg: 'bg-emerald-950/30', border: 'border-emerald-900/50', badge: 'bg-emerald-950 text-emerald-400 border-emerald-900' };
      default: return { text: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-800', badge: 'bg-zinc-900 text-zinc-400 border-zinc-800' };
    }
  };

  const getStatusBadge = (status: Mistake['revisionStatus']): { label: string; style: 'destructive' | 'accent' | 'default' | 'success' } => {
    switch (status) {
      case 'New': return { label: 'Needs Review', style: 'destructive' };
      case 'Reviewed': return { label: 'Reviewed', style: 'accent' };
      case 'Solved Again': return { label: 'Solved Again', style: 'default' };
      case 'Mastered': return { label: 'Mastered', style: 'success' };
      default: return { label: status, style: 'default' };
    }
  };

  const [selectedMistakeId, setSelectedMistakeId] = useState<string | null>(null);

  // Filtered Mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (activeSubject !== 'all' && m.subject !== activeSubject) return false;
      if (selectedTag !== 'all' && !m.mistakeTypes?.includes(selectedTag)) return false;
      if (selectedDifficulty !== 'all' && m.difficulty !== selectedDifficulty) return false;
      
      const isResolved = m.revisionStatus === 'Solved Again' || m.revisionStatus === 'Mastered';
      if (statusFilter === 'unresolved' && isResolved) return false;
      if (statusFilter === 'resolved' && !isResolved) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inQuestion = m.questionText?.toLowerCase().includes(q);
        const inChapter = m.chapter?.toLowerCase().includes(q);
        const inTopic = m.topic?.toLowerCase().includes(q);
        if (!inQuestion && !inChapter && !inTopic) return false;
      }
      return true;
    });
  }, [mistakes, activeSubject, selectedTag, selectedDifficulty, statusFilter, searchQuery]);

  const totalMistakes = mistakes.length;
  const resolvedCount = mistakes.filter(m => m.revisionStatus === 'Solved Again' || m.revisionStatus === 'Mastered').length;
  const unresolvedCount = totalMistakes - resolvedCount;
  const resolutionRate = totalMistakes > 0 ? Math.round((resolvedCount / totalMistakes) * 100) : 100;

  return {
    state: {
      mistakes,
      activeSubject,
      searchQuery,
      selectedTag,
      selectedDifficulty,
      statusFilter,
      isLogModalOpen,
      isBatchReviewOpen,
      isTestModalOpen,
      reSolvingMistake,
      expandedId,
      interrogationMistake,
      filteredMistakes,
      totalMistakes,
      unresolvedCount,
      resolvedCount,
      resolutionRate,
      selectedMistakeId,
    },
    handlers: {
      setActiveSubject,
      setSearchQuery,
      setSelectedTag,
      setSelectedDifficulty,
      setStatusFilter,
      setIsLogModalOpen,
      setIsBatchReviewOpen,
      setIsTestModalOpen,
      setReSolvingMistake,
      setExpandedId,
      setInterrogationMistake,
      setSelectedMistakeId,
      getSubjectColor,
      getStatusBadge,
    },
    actions
  };
}
