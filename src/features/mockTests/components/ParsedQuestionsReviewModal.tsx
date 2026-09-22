import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, AlertCircle, Trash2, Edit3, Check, X,
  ArrowRight, Search, SlidersHorizontal, BookOpen, Layers,
  Lightbulb, ChevronDown, ChevronUp, Save, Eye, Hash, HelpCircle,
  Loader2, Sparkles
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { MockQuestion, MockTest, QuestionType } from '@/types/mockTest';
import { SubjectId } from '@/types';
import { RichTextRenderer } from '@/components/MathRenderer';
import { springs } from '@/constants/motion';
import { reconcileAiAnswerKey, reverifyQuestionWithAi } from '../services/MockTestGeneratorService';
import { isMultiChoiceQuestion, isOptionSelectedInAnswer } from '@/utils/mockScoring';

export interface ParsedQuestionsReviewModalProps {
  isOpen: boolean;
  test: MockTest | null;
  onClose: () => void;
  onSave: (updatedTest: MockTest) => Promise<void> | void;
  onStart: (updatedTest: MockTest) => Promise<void> | void;
  themeColor?: 'indigo' | 'emerald' | 'cyan' | 'purple' | 'amber';
  zIndex?: number;
}

export function ParsedQuestionsReviewModal({
  isOpen,
  test,
  onClose,
  onSave,
  onStart,
  themeColor = 'indigo',
  zIndex = 100020
}: ParsedQuestionsReviewModalProps) {
  if (!test) return null;

  // Local mutable state cloned from the test
  const [testTitle, setTestTitle] = useState(test.name);
  const [durationMinutes, setDurationMinutes] = useState(test.durationMinutes || 60);
  const [sections, setSections] = useState(test.sections || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectId>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MCQ' | 'NUMERICAL'>('ALL');
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [reverifyingIds, setReverifyingIds] = useState<Record<string, boolean>>({});
  const [verifiedBadges, setVerifiedBadges] = useState<Record<string, { key: string; corrected: boolean }>>({});
  const [isBatchReverifying, setIsBatchReverifying] = useState(false);

  // Flatten questions with section and index metadata
  const allQuestionsWithMeta = useMemo(() => {
    const list: { question: MockQuestion; sectionIndex: number; questionIndex: number; globalIndex: number }[] = [];
    let gIdx = 0;
    sections.forEach((sec, sIdx) => {
      sec.questions.forEach((q, qIdx) => {
        list.push({ question: q, sectionIndex: sIdx, questionIndex: qIdx, globalIndex: gIdx });
        gIdx++;
      });
    });
    return list;
  }, [sections]);

  // Filtered view
  const filteredQuestions = useMemo(() => {
    return allQuestionsWithMeta.filter(({ question, globalIndex }) => {
      // Subject filter
      if (subjectFilter !== 'ALL' && question.subject !== subjectFilter) return false;

      // Type filter
      if (typeFilter === 'MCQ' && question.type === 'NUMERICAL') return false;
      if (typeFilter === 'NUMERICAL' && question.type !== 'NUMERICAL') return false;

      // Needs attention (empty or missing answer key)
      if (needsAttentionOnly) {
        const hasValidKey = question.correctAnswer !== undefined && 
                            question.correctAnswer !== null && 
                            String(question.correctAnswer).trim().length > 0;
        if (hasValidKey) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const qText = (question.content || '').toLowerCase();
        const numStr = `q${globalIndex + 1}`;
        const query = searchQuery.toLowerCase().trim();
        const matchesText = qText.includes(query);
        const matchesNum = numStr.includes(query) || String(globalIndex + 1) === query;
        if (!matchesText && !matchesNum) return false;
      }

      return true;
    });
  }, [allQuestionsWithMeta, subjectFilter, typeFilter, needsAttentionOnly, searchQuery]);

  // Compute live statistics
  const totalQuestions = allQuestionsWithMeta.length;
  const totalMarks = sections.reduce(
    (sum, sec) => sum + sec.questions.reduce((qSum, q) => qSum + (q.marks?.correct ?? 4), 0),
    0
  );
  const mcqCount = allQuestionsWithMeta.filter(m => m.question.type !== 'NUMERICAL').length;
  const numCount = allQuestionsWithMeta.filter(m => m.question.type === 'NUMERICAL').length;
  const attentionCount = allQuestionsWithMeta.filter(
    m => !m.question.correctAnswer || String(m.question.correctAnswer).trim().length === 0
  ).length;

  // Question mutators
  const updateQuestion = (sectionIdx: number, questionIdx: number, updater: (prev: MockQuestion) => MockQuestion) => {
    setSections(prev => {
      const cloned = prev.map((sec, sI) => {
        if (sI !== sectionIdx) return sec;
        const newQuestions = sec.questions.map((q, qI) => {
          if (qI !== questionIdx) return q;
          return updater(q);
        });
        return { ...sec, questions: newQuestions };
      });
      return cloned;
    });
  };

  const handleSetAnswerKey = (sectionIdx: number, questionIdx: number, newKey: string) => {
    updateQuestion(sectionIdx, questionIdx, q => ({
      ...q,
      correctAnswer: newKey
    }));
  };

  const handleDeleteQuestion = (sectionIdx: number, questionIdx: number) => {
    setSections(prev => {
      return prev.map((sec, sI) => {
        if (sI !== sectionIdx) return sec;
        const filtered = sec.questions.filter((_, qI) => qI !== questionIdx);
        return { ...sec, questions: filtered };
      }).filter(sec => sec.questions.length > 0); // Remove empty sections
    });
  };

  const handleToggleQuestionType = (sectionIdx: number, questionIdx: number) => {
    updateQuestion(sectionIdx, questionIdx, q => {
      const isMulti = isMultiChoiceQuestion(q);
      if (q.type === 'NUMERICAL') {
        return {
          ...q,
          type: 'MCQ' as QuestionType,
          options: q.options && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: '0',
          marks: { correct: 4, incorrect: -1 }
        };
      } else if (isMulti || q.type === 'MULTI') {
        return {
          ...q,
          type: 'NUMERICAL' as QuestionType,
          options: undefined,
          correctAnswer: '0',
          marks: { correct: 4, incorrect: 0 }
        };
      } else {
        return {
          ...q,
          type: 'MULTI' as QuestionType,
          options: q.options && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: q.correctAnswer || 'A',
          marks: { correct: 4, incorrect: -2 }
        };
      }
    });
  };

  const handleReconcileSingle = async (sectionIdx: number, questionIdx: number, q: MockQuestion) => {
    setReverifyingIds(prev => ({ ...prev, [q.id]: true }));
    try {
      const verified = await reverifyQuestionWithAi(q, {
        chapterName: q.chapter,
        targetSubject: q.subject
      });
      const isMultiAnswer = Boolean(verified.correctOptionLetters && verified.correctOptionLetters.length > 1);
      updateQuestion(sectionIdx, questionIdx, prevQ => ({
        ...prevQ,
        type: prevQ.type === 'NUMERICAL' ? 'NUMERICAL' : (isMultiAnswer ? 'MULTI' : 'MCQ'),
        marks: prevQ.type === 'NUMERICAL'
          ? prevQ.marks
          : { correct: 4, incorrect: isMultiAnswer ? -2 : -1 },
        correctAnswer: verified.correctAnswer,
        explanation: verified.explanation,
        solution: {
          text: verified.explanation,
          correctOptionIds: verified.correctOptionLetters
        }
      }));
      setVerifiedBadges(prev => ({
        ...prev,
        [q.id]: { key: verified.correctAnswer, corrected: verified.keyCorrectionMade }
      }));
    } catch (err) {
      console.error('Error re-verifying question:', err);
      // Safe local fallback (non-cycling)
      const isMulti = isMultiChoiceQuestion(q);
      const qType = q.type === 'NUMERICAL' ? 'NUMERICAL' : (isMulti ? 'MULTI' : 'MCQ');
      const reconciled = reconcileAiAnswerKey(q, qType, q.correctAnswer);
      const isReconciledMulti = /^[A-D]{2,}$/.test(reconciled);
      updateQuestion(sectionIdx, questionIdx, prevQ => ({
        ...prevQ,
        type: prevQ.type === 'NUMERICAL' ? 'NUMERICAL' : (isReconciledMulti ? 'MULTI' : 'MCQ'),
        marks: prevQ.type === 'NUMERICAL'
          ? prevQ.marks
          : { correct: 4, incorrect: isReconciledMulti ? -2 : -1 },
        correctAnswer: reconciled
      }));
    } finally {
      setReverifyingIds(prev => ({ ...prev, [q.id]: false }));
    }
  };

  const handleBatchReverify = async () => {
    if (isBatchReverifying) return;
    setIsBatchReverifying(true);
    try {
      // Prioritize questions in view needing attention or the first 5 in view
      const targetItems = filteredQuestions
        .filter(item => !item.question.correctAnswer || item.question.correctAnswer === '0')
        .slice(0, 5);
      const itemsToRun = targetItems.length > 0 ? targetItems : filteredQuestions.slice(0, 5);
      for (const item of itemsToRun) {
        await handleReconcileSingle(item.sectionIndex, item.questionIndex, item.question);
      }
    } finally {
      setIsBatchReverifying(false);
    }
  };

  const toggleSolutionDrawer = (qId: string) => {
    setExpandedSolutions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleStartEditingContent = (q: MockQuestion) => {
    setEditingQuestionId(q.id);
    setEditedContent(q.content);
  };

  const handleSaveEditedContent = (sectionIdx: number, questionIdx: number) => {
    if (editedContent.trim()) {
      updateQuestion(sectionIdx, questionIdx, q => ({
        ...q,
        content: editedContent.trim()
      }));
    }
    setEditingQuestionId(null);
  };

  // Compile final test object
  const compileUpdatedTest = (): MockTest => {
    return {
      ...test,
      name: testTitle.trim() || test.name,
      durationMinutes,
      totalMarks,
      sections
    };
  };

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    try {
      const updated = compileUpdatedTest();
      await onSave(updated);
      onClose();
    } catch (e) {
      console.error("Failed to save reviewed test:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartDrill = async () => {
    const updated = compileUpdatedTest();
    await onStart(updated);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={false}
      zIndex={zIndex}
      className="max-w-4xl w-full mx-auto max-h-[90vh] flex flex-col bg-zinc-950/95 border border-zinc-800/90 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden"
    >
      {/* ================= HEADER ================= */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testTitle}
                onChange={e => setTestTitle(e.target.value)}
                className="text-sm sm:text-base font-bold text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-indigo-500 focus:outline-none transition-colors px-1 -mx-1"
                placeholder="Paper Name"
              />
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Review & Calibration Studio
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Inspect questions, verify LaTeX formulas, adjust answer keys, and discard corrupted entries before launch.
            </p>
          </div>
        </div>

        {/* Global Key Stats */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 text-[10px] mr-1.5 uppercase">Questions:</span>
            <strong className="text-white">{totalQuestions}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 text-[10px] mr-1.5 uppercase">Marks:</span>
            <strong className="text-indigo-400">{totalMarks}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 text-[10px] mr-1.5 uppercase">Duration:</span>
            <strong className="text-emerald-400">{durationMinutes}m</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= FILTER & SEARCH STRIP ================= */}
      <div className="p-3 border-b border-zinc-800/60 bg-zinc-900/20 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search question text or 'Q1'..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubjectFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              subjectFilter === 'ALL'
                ? 'bg-zinc-700 text-white font-semibold'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Subjects
          </button>
          {(['physics', 'chemistry', 'maths'] as SubjectId[]).map(sub => (
            <button
              key={sub}
              type="button"
              onClick={() => setSubjectFilter(sub)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                subjectFilter === sub
                  ? sub === 'physics' ? 'bg-cyan-600 text-white' : sub === 'chemistry' ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {sub}
            </button>
          ))}

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === 'MCQ' ? 'ALL' : 'MCQ')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              typeFilter === 'MCQ'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            MCQ ({mcqCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter(typeFilter === 'NUMERICAL' ? 'ALL' : 'NUMERICAL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              typeFilter === 'NUMERICAL'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Numerical ({numCount})
          </button>

          {attentionCount > 0 && (
            <button
              type="button"
              onClick={() => setNeedsAttentionOnly(!needsAttentionOnly)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                needsAttentionOnly
                  ? 'bg-rose-600 text-white font-semibold shadow-sm'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>Needs Key ({attentionCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleBatchReverify}
            disabled={isBatchReverifying}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-colors bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed ml-auto cursor-pointer"
            title="Automatically re-verify questions in view using Gemini AI from first principles"
          >
            {isBatchReverifying ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                <span>Verifying with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Re-verify Questions (AI)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= QUESTION LIST BODY ================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[320px]">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-zinc-600 opacity-50" />
            <p className="text-sm">No questions match the current filter or search criteria.</p>
            <button
              type="button"
              onClick={() => { setSubjectFilter('ALL'); setTypeFilter('ALL'); setNeedsAttentionOnly(false); setSearchQuery(''); }}
              className="text-xs text-indigo-400 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredQuestions.map(({ question: q, sectionIndex, questionIndex, globalIndex }) => {
            const isEditingThis = editingQuestionId === q.id;
            const isSolutionOpen = Boolean(expandedSolutions[q.id]);
            const isNumerical = q.type === 'NUMERICAL';
            const isMulti = isMultiChoiceQuestion(q);
            const activeKey = String(q.correctAnswer ?? '').trim();
            const isKeyMissing = activeKey.length === 0;

            const subjectColor = 
              q.subject === 'physics' ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' :
              q.subject === 'chemistry' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
              'text-purple-400 border-purple-500/30 bg-purple-500/10';

            return (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={springs.snappy}
                className={`p-4 rounded-xl border transition-all ${
                  isKeyMissing 
                    ? 'bg-rose-950/20 border-rose-500/40' 
                    : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/70'
                }`}
              >
                {/* Question Item Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      Q{globalIndex + 1}
                    </span>
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-semibold ${subjectColor}`}>
                      {q.subject}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleQuestionType(sectionIndex, questionIndex)}
                      title="Click to toggle between MCQ, MULTI, and Numerical"
                      className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-500 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      {isNumerical ? 'NUMERICAL (+4/0)' : isMulti ? 'MULTI (+4/-2)' : 'MCQ (+4/-1)'}
                    </button>
                    {q.chapter && (
                      <span className="text-[11px] text-zinc-400 max-w-[200px] truncate hidden sm:inline">
                        • {q.chapter}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* AI Re-verify Key Button */}
                    <button
                      type="button"
                      disabled={Boolean(reverifyingIds[q.id])}
                      onClick={() => handleReconcileSingle(sectionIndex, questionIndex, q)}
                      title="Re-verify answer key from first principles with Gemini AI"
                      className={`p-1.5 rounded-lg transition-colors text-[11px] flex items-center gap-1 font-mono cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          reverifyingIds[q.id]
                          ? 'text-amber-400 bg-amber-500/10'
                          : (verifiedBadges[q.id] || q.isVerified)
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                      }`}
                    >
                      {reverifyingIds[q.id] ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          <span className="text-amber-400">Verifying...</span>
                        </>
                      ) : (verifiedBadges[q.id] || q.isVerified) ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">
                            {(() => {
                              const ansKey = verifiedBadges[q.id]?.key || q.correctAnswer;
                              if (isMulti || isNumerical) {
                                return `Verified (${ansKey})`;
                              }
                              const parsedIdx = parseInt(ansKey, 10);
                              const letter = !isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx <= 3
                                ? String.fromCharCode(65 + parsedIdx)
                                : (/^[A-D]$/i.test(ansKey) ? ansKey.toUpperCase() : ansKey);
                              return `Verified (Option ${letter})`;
                            })()}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="hidden sm:inline">Re-verify Key</span>
                        </>
                      )}
                    </button>

                    {/* Edit Content */}
                    <button
                      type="button"
                      onClick={() => isEditingThis ? handleSaveEditedContent(sectionIndex, questionIndex) : handleStartEditingContent(q)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={isEditingThis ? "Save edits" : "Edit question text"}
                    >
                      {isEditingThis ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Edit3 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete Question */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(sectionIndex, questionIndex)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete question from test"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="text-xs text-zinc-200 leading-relaxed space-y-2">
                  {isEditingThis ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedContent}
                        onChange={e => setEditedContent(e.target.value)}
                        rows={3}
                        className="w-full p-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingQuestionId(null)}
                          className="px-2.5 py-1 text-[11px] rounded bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditedContent(sectionIndex, questionIndex)}
                          className="px-2.5 py-1 text-[11px] rounded bg-indigo-600 text-white font-semibold cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-sans">
                      <RichTextRenderer content={q.content} />
                    </div>
                  )}

                  {/* Optional Diagram / Image */}
                  {q.imageUrl && (
                    <div className="mt-2 max-w-md sm:max-w-xl rounded-lg overflow-hidden border border-zinc-800 bg-black/40">
                      <img src={q.imageUrl} alt={`Diagram for Q${globalIndex + 1}`} className="w-full object-contain max-h-72" />
                    </div>
                  )}
                </div>

                {/* ================= OPTIONS / ANSWER KEY STRIP ================= */}
                <div className="mt-3 pt-3 border-t border-zinc-800/60">
                  {isNumerical ? (
                    /* NUMERICAL INPUT */
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 font-medium">Numerical Answer Key:</span>
                      <input
                        type="text"
                        value={activeKey}
                        onChange={e => handleSetAnswerKey(sectionIndex, questionIndex, e.target.value)}
                        placeholder="e.g. 42 or 3.14"
                        className={`w-32 px-3 py-1.5 bg-zinc-950 border rounded-lg text-xs font-mono font-bold text-center transition-colors focus:outline-none ${
                          isKeyMissing 
                            ? 'border-rose-500 text-rose-300 focus:border-rose-400' 
                            : 'border-emerald-500/50 text-emerald-300 focus:border-emerald-400'
                        }`}
                      />
                      {isKeyMissing && (
                        <span className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3 h-3" /> Answer required
                        </span>
                      )}
                    </div>
                  ) : (
                    /* MCQ OPTIONS & ACTIVE KEY PICKER */
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
                          const isSelected = isOptionSelectedInAnswer(activeKey, optIdx);

                          const handleOptionToggle = () => {
                            if (isMulti) {
                              let currentLetters = (activeKey || '')
                                .replace(/[^A-D]/gi, '')
                                .toUpperCase()
                                .split('');
                              if (currentLetters.length === 0 && activeKey) {
                                currentLetters = (activeKey.match(/[0-3]/g) || []).map(n => String.fromCharCode(65 + parseInt(n, 10)));
                              }
                              if (currentLetters.includes(letter)) {
                                currentLetters = currentLetters.filter(l => l !== letter);
                              } else {
                                currentLetters.push(letter);
                              }
                              currentLetters.sort();
                              handleSetAnswerKey(sectionIndex, questionIndex, currentLetters.join(''));
                            } else {
                              handleSetAnswerKey(sectionIndex, questionIndex, String(optIdx));
                            }
                          };

                          return (
                            <div
                              key={optIdx}
                              onClick={handleOptionToggle}
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-500 text-black shadow-sm'
                                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                }`}
                              >
                                {letter}
                              </span>
                              <div className="flex-1 overflow-hidden">
                                <RichTextRenderer content={opt} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Key Buttons Strip */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <span>Active Key:</span>
                          {['0', '1', '2', '3'].map((idxStr) => {
                            const idx = Number(idxStr);
                            const letter = String.fromCharCode(65 + idx);
                            const isCurrent = isOptionSelectedInAnswer(activeKey, idx);

                            const handleQuickToggle = () => {
                              if (isMulti) {
                                let currentLetters = (activeKey || '')
                                  .replace(/[^A-D]/gi, '')
                                  .toUpperCase()
                                  .split('');
                                if (currentLetters.length === 0 && activeKey) {
                                  currentLetters = (activeKey.match(/[0-3]/g) || []).map(n => String.fromCharCode(65 + parseInt(n, 10)));
                                }
                                if (currentLetters.includes(letter)) {
                                  currentLetters = currentLetters.filter(l => l !== letter);
                                } else {
                                  currentLetters.push(letter);
                                }
                                currentLetters.sort();
                                handleSetAnswerKey(sectionIndex, questionIndex, currentLetters.join(''));
                              } else {
                                handleSetAnswerKey(sectionIndex, questionIndex, idxStr);
                              }
                            };

                            return (
                              <button
                                key={idxStr}
                                type="button"
                                onClick={handleQuickToggle}
                                className={`w-6 h-6 rounded font-mono font-bold text-xs transition-colors cursor-pointer ${
                                  isCurrent
                                    ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                                }`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                          {isMulti && activeKey && (
                            <span className="ml-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[11px]">
                              [{activeKey}]
                            </span>
                          )}
                          {isKeyMissing && (
                            <span className="text-[11px] text-rose-400 font-medium ml-2 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Select correct option{isMulti ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Derivation Drawer Toggle */}
                        {q.explanation && (
                          <button
                            type="button"
                            onClick={() => toggleSolutionDrawer(q.id)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isSolutionOpen ? 'Hide Solution' : 'View Derivation'}</span>
                            {isSolutionOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Solution / Derivation Collapsible Panel */}
                  <AnimatePresence>
                    {isSolutionOpen && q.explanation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={springs.snappy}
                        className="mt-2.5 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300 space-y-1.5 overflow-hidden"
                      >
                        <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px] font-semibold">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>Step-by-Step Analytical Derivation:</span>
                        </div>
                        <div className="pl-5 leading-relaxed text-zinc-300 font-sans">
                          <RichTextRenderer content={q.explanation} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ================= MODAL FOOTER ACTIONS ================= */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="text-xs text-zinc-400">
          Ready to deploy <strong className="text-white">{totalQuestions} questions</strong> ({totalMarks} marks)
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            disabled={isSaving}
            className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-700 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Available Tests</span>
          </button>
          <button
            type="button"
            onClick={handleStartDrill}
            className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            <span>Launch Timed Drill</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
