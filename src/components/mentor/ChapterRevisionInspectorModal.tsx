import React, { useState } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { FORMULA_BANK } from '@/constants/formulaBank';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { Sparkles } from 'lucide-react';

interface ChapterRevisionInspectorModalProps {
  chapterId: string | null;
  onClose: () => void;
  onPracticeWithAI?: (chapterId: string, subject: string) => void;
}

export const ChapterRevisionInspectorModal: React.FC<ChapterRevisionInspectorModalProps> = ({
  chapterId,
  onClose,
  onPracticeWithAI
}) => {
  const actions = useStudyBrainStore(state => state.actions);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const chapters = useStudyBrainStore(state => state.chapters);
  const mistakes = useStudyBrainStore(state => state.mistakes);
  const studySessions = useStudyBrainStore(state => state.studySessions);
  const [activeTab, setActiveTab] = useState<'overview' | 'formulas' | 'history'>('overview');
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  useLockBodyScroll(!!chapterId);

  if (!chapterId) return null;

  const chapter = chapters.find(c => c.id === chapterId);
  const telemetry = chapterTelemetryMap ? chapterTelemetryMap[chapterId] : null;

  if (!chapter) return null;

  // BUGFIX: this modal independently fabricated 'High'/75% retention for chapters
  // that were never started, the same bug as in RevisionEngine.ts. Use the same
  // "has the student actually begun this chapter" check here too.
  const isStartedOrMastered = telemetry
    ? (telemetry.syllabusStage === 'In Progress' || telemetry.syllabusStage === 'Mastered')
    : (chapter.completion > 0 || (chapter.currentLecture && chapter.currentLecture > 0) || chapter.theoryComplete || chapter.status === 'Mastered');

  const retentionConfidence: 'High' | 'Medium' | 'Low' | 'Not Started' = isStartedOrMastered
    ? (telemetry?.retentionConfidence || 'High')
    : 'Not Started';
  const retentionScore: number | undefined = isStartedOrMastered
    ? (telemetry?.strategyRadar?.retentionConfidenceScore ?? 75)
    : undefined;
  const bankEntry = FORMULA_BANK.find(fb => fb.chapterId === chapterId || fb.chapterName.toLowerCase() === chapter.name.toLowerCase());
  const formulas = bankEntry?.formulas || [];
  const chapterMistakes = mistakes.filter(m => m.chapter === chapter.name);

  // Past revision history mock / logged sessions
  const chapSessions = studySessions.filter(s => s.subjectId === chapter.subject && s.type === 'Revision');

  const toggleFlip = (idx: number) => {
    setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleMarkRecall = (difficulty: 'High' | 'Medium' | 'Low') => {
    actions.completeRevision(chapter.id, difficulty);
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans text-left overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0e0e11] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-6">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-850 flex items-start justify-between bg-zinc-950/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-400 bg-indigo-950/40">
                {chapter.subject.toUpperCase()} • CHAPTER REVISION INSPECTOR
              </span>
              <Badge variant="secondary" className={`text-[9px] font-mono px-2 py-0.5 border ${
                retentionConfidence === 'Low' ? 'bg-red-950/40 text-red-400 border-red-800/60' :
                retentionConfidence === 'Medium' ? 'bg-amber-950/40 text-amber-400 border-amber-800/60' :
                retentionConfidence === 'Not Started' ? 'bg-zinc-900/60 text-zinc-500 border-zinc-800/60' :
                'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
              }`}>
                {retentionConfidence === 'Not Started' ? 'Not Started' : `${retentionConfidence} Confidence (${retentionScore}%)`}
              </Badge>
            </div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">{chapter.name}</h2>
            <p className="text-xs text-zinc-400">
              Unit: {chapter.unit || 'Core Module'} • Mastery: {telemetry?.masteryScore || 0}% • JEE Weightage: {chapter.weightage || 4}%
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-850 bg-zinc-950/40 px-5 gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'overview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Retention & Spaced Interval
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`py-3 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'formulas' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Formula Flashcards ({formulas.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
              activeTab === 'history' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Revision Log & History ({chapSessions.length})
          </button>
        </div>

        {/* Content Stage */}
        <div className="p-5 overflow-y-auto scrollbar space-y-4 flex-1">
          
          {/* TAB 1: RETENTION OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Spaced Repetition Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase block">Retention Score</span>
                  <span className="text-base font-bold text-indigo-400">{retentionConfidence === 'Not Started' ? '—' : `${retentionScore}%`}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase block">SM-2 Interval</span>
                  <span className="text-base font-bold text-emerald-400">
                    {retentionConfidence === 'Not Started' ? 'N/A' : retentionConfidence === 'Low' ? '1 Day' : retentionConfidence === 'Medium' ? '3 Days' : '7 Days'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase block">Formulas Vault</span>
                  <span className="text-base font-bold text-amber-400">{formulas.length} Cards</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase block">Open Errors</span>
                  <span className="text-base font-bold text-red-400">{chapterMistakes.length} Errors</span>
                </div>
              </div>

              {/* Memory Decay Visual Status */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">Memory Retention Decay Curve Status</span>
                  <span className="text-indigo-400 font-semibold">{retentionConfidence === 'Not Started' ? 'Not Applicable' : `${retentionConfidence} Stability`}</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      retentionConfidence === 'Low' ? 'bg-red-500' : retentionConfidence === 'Medium' ? 'bg-amber-500' : retentionConfidence === 'Not Started' ? 'bg-zinc-700' : 'bg-emerald-500'
                    }`}
                    style={{ width: retentionConfidence === 'Not Started' ? '0%' : `${retentionScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans pt-1">
                  {retentionConfidence === 'Not Started'
                    ? "📘 This chapter hasn't been started yet, so there's no memory to decay — nothing to revise until you begin studying it."
                    : retentionConfidence === 'Low' 
                    ? '⚠️ Warning: Retention has decayed below optimal threshold. Immediate active recall recommended today.'
                    : retentionConfidence === 'Medium'
                    ? '⚡ Retention is stable but approaching review window. Practice formulas soon to lock in long-term memory.'
                    : '✅ Excellent retention stability. Memory interval extended.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    actions.openChapterEditModal(chapter.id);
                  }}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer text-center"
                >
                  Edit Chapter Telemetry
                </button>
                <button
                  onClick={() => setActiveTab('formulas')}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-mono font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer text-center shadow-lg border border-zinc-700"
                >
                  Active Recall
                </button>
                {onPracticeWithAI && (
                  <button
                    onClick={() => onPracticeWithAI(chapter.id, chapter.subject)}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer text-center shadow-lg shadow-indigo-600/30"
                  >
                    <Sparkles className="w-4 h-4" />
                    Practice PYQs
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FORMULA FLASHCARDS */}
          {activeTab === 'formulas' && (
            <div className="space-y-3">
              {formulas.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                  No formula cards defined for this chapter.
                </div>
              ) : (
                formulas.map((f, idx) => {
                  const isFlipped = !!flippedCards[idx];
                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-xl border transition-all text-left space-y-3 ${
                        isFlipped ? 'bg-zinc-900/80 border-indigo-500/40' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 tracking-wider">
                          Formula #{idx + 1} • {f.title}
                        </span>
                        <button
                          onClick={() => toggleFlip(idx)}
                          className="text-[10px] font-mono text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded cursor-pointer"
                        >
                          {isFlipped ? 'Show Prompt' : 'Reveal Formula'}
                        </button>
                      </div>

                      {isFlipped ? (
                        <pre className="font-mono text-xs text-indigo-200 bg-zinc-950/80 p-3 rounded-lg border border-indigo-900/30 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {f.formula}
                        </pre>
                      ) : (
                        <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                          "{f.concept}"
                        </p>
                      )}

                      {isFlipped && (
                        <div className="flex justify-end gap-2 pt-1 border-t border-zinc-850">
                          <button
                            onClick={() => handleMarkRecall('Low')}
                            className="text-[10px] font-mono font-bold py-1 px-3 rounded cursor-pointer bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 transition-colors"
                          >
                            Hard (1d)
                          </button>
                          <button
                            onClick={() => handleMarkRecall('Medium')}
                            className="text-[10px] font-mono font-bold py-1 px-3 rounded cursor-pointer bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 transition-colors"
                          >
                            Medium (3d)
                          </button>
                          <button
                            onClick={() => handleMarkRecall('High')}
                            className="text-[10px] font-mono font-bold py-1 px-3 rounded cursor-pointer bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition-colors"
                          >
                            Easy (7d+)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: REVISION LOG & HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold tracking-wider">
                Logged Revision Events ({chapSessions.length})
              </div>

              {chapSessions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs bg-zinc-900/20 rounded-xl border border-zinc-850">
                  No previous revision sessions logged for this chapter.
                </div>
              ) : (
                chapSessions.map((sess, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Icon name="Clock" className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-zinc-300">{new Date(sess.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400">{sess.duration} mins</span>
                      <span className="text-emerald-400 font-bold">+{sess.xpEarned} XP</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
    </ModalPortal>
  );
};
