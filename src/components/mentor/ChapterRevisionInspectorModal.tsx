import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { FORMULA_BANK } from '@/constants/formulaBank';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { Modal } from '@/components/ui/Modal';
import { 
  Sparkles, X, Activity, ShieldCheck, 
  Timer, Skull, CheckCircle2, BookOpen, Clock, 
  SlidersHorizontal, Zap, Check, AlertTriangle, Info
} from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import { springs } from '@/constants/motion';

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
  const [recalledToast, setRecalledToast] = useState<string | null>(null);

  useLockBodyScroll(!!chapterId);

  if (!chapterId) return null;

  const chapter = chapters.find(c => c.id === chapterId);
  const telemetry = chapterTelemetryMap ? chapterTelemetryMap[chapterId] : null;

  if (!chapter) return null;

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
  const chapSessions = studySessions.filter(s => s.subjectId === chapter.subject && s.type === 'Revision');

  const toggleFlip = (idx: number) => {
    setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleMarkRecall = (difficulty: 'High' | 'Medium' | 'Low', title: string) => {
    actions.completeRevision(chapter.id, difficulty);
    setRecalledToast(`Recalled "${title}" (${difficulty})`);
    setTimeout(() => setRecalledToast(null), 2500);
  };

  const renderMathText = (text: string | undefined | null) => {
    if (!text) return null;
    try {
      const cleanText = text.replace(/\\\$/g, '$');
      const parts = cleanText.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
      return parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          return <BlockMath key={i} math={math} errorColor="#ef4444" />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          return <InlineMath key={i} math={math} errorColor="#ef4444" />;
        }
        return <span key={i}>{part}</span>;
      });
    } catch {
      return <span className="font-mono text-xs text-zinc-300">{text}</span>;
    }
  };

  const getConfidenceBadge = (confidence: 'High' | 'Medium' | 'Low' | 'Not Started') => {
    switch (confidence) {
      case 'High':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-sm';
      case 'Medium':
        return 'bg-amber-950/60 text-amber-400 border-amber-500/40 shadow-sm';
      case 'Low':
        return 'bg-red-950/60 text-red-400 border-red-500/40 shadow-sm';
      case 'Not Started':
        return 'bg-zinc-950/60 text-zinc-400 border-white/10';
    }
  };

  return (
    <Modal 
      isOpen={!!chapterId} 
      onClose={onClose} 
      zIndex={999} 
      backdropClassName="p-4 bg-black/10 backdrop-blur-sm animate-fade-in font-sans text-left overflow-y-auto flex items-center justify-center" 
      className="relative w-full max-w-2xl min-h-[500px] h-[80vh] max-h-[90vh] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto glass-panel"
    >
      {/* Ambient Top Glow */}
      <div className={`absolute top-0 right-0 w-80 h-32 rounded-full filter blur-3xl pointer-events-none ${
        retentionConfidence === 'Low' ? 'bg-red-600/15' : 'bg-indigo-600/15'
      }`} />

      {/* Floating Success Toast */}
      <AnimatePresence>
        {recalledToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={springs.snappy}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 font-mono"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{recalledToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <div className="p-5 md:p-6 border-b border-white/10 flex items-start justify-between relative z-10 shrink-0">
        <div className="space-y-1.5 min-w-0 pr-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
            <span className={`px-2.5 py-0.5 rounded-lg border ${
              chapter.subject === 'physics' ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300' :
              chapter.subject === 'chemistry' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' :
              'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}>
              {chapter.subject.toUpperCase()} • CHAPTER TELEMETRY
            </span>
            <span className={`px-2.5 py-0.5 rounded-lg border ${getConfidenceBadge(retentionConfidence)}`}>
              {retentionConfidence === 'Not Started' ? 'Not Started' : `${retentionConfidence} Retention (${retentionScore}%)`}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight truncate">
            {chapter.name}
          </h2>
          
          <p className="text-xs text-zinc-400 font-mono">
            Unit: <span className="text-zinc-200">{chapter.unit || 'Core Module'}</span> • Mastery: <span className="text-indigo-300">{telemetry?.masteryScore || 0}%</span> • JEE Weightage: <span className="text-amber-300">{chapter.weightage || 4}%</span>
          </p>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="p-2 rounded-2xl bg-zinc-950/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Tab Navigation with Gliders */}
      <div className="flex border-b border-white/10 px-5 pt-2 gap-1 font-mono text-xs relative select-none shrink-0">
        {[
          { id: 'overview', label: 'Retention & Spaced Interval' },
          { id: 'formulas', label: `Formula Flashcards (${formulas.length})` },
          { id: 'history', label: `Revision Events (${chapSessions.length})` }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-4 py-2.5 font-bold transition-colors cursor-pointer select-none z-10 ${
                isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeInspectorTabGlider"
                  className="absolute inset-0 bg-indigo-600/30 border-b-2 border-indigo-500 rounded-t-xl -z-10"
                  transition={springs.fluid}
                />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Stage - Constant Height Container */}
      <div className="p-5 md:p-6 overflow-y-auto scrollbar space-y-4 flex-1 h-[420px]">
        
        {/* TAB 1: RETENTION OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 flex flex-col justify-between h-full">
            
            <div className="space-y-4">
              {/* Real-time Retention Status Meter Card */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Memory Stability & Decay Forecast</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-lg border text-[11px] ${getConfidenceBadge(retentionConfidence)}`}>
                    {retentionConfidence === 'Not Started' ? 'Not Active' : `${retentionScore}% Retention`}
                  </span>
                </div>

                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: retentionConfidence === 'Not Started' ? '0%' : `${retentionScore}%` }}
                    transition={springs.fluid}
                    className={`h-full rounded-full ${
                      retentionConfidence === 'Low' ? 'bg-red-500' : 
                      retentionConfidence === 'Medium' ? 'bg-amber-500' : 
                      retentionConfidence === 'Not Started' ? 'bg-zinc-700' : 'bg-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-300 leading-relaxed font-sans pt-0.5">
                  {retentionConfidence === 'Not Started' ? (
                    <>
                      <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>This chapter has not been started yet. Active recall tracking begins once lectures or DPPs are practiced.</span>
                    </>
                  ) : retentionConfidence === 'Low' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Chapter retention has dropped below 50%. Immediate active recall recommended today to reset memory stability.</span>
                    </>
                  ) : retentionConfidence === 'Medium' ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Stable retention (~70%). Approach next review milestone within 3 days to expand interval stability.</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>High stability (&gt;90%). Concept is securely consolidated in long-term memory.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Practical Chapter Vitals */}
              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 text-center space-y-1 shadow-sm">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">SM-2 Interval</span>
                  <span className="text-sm font-bold text-emerald-400 font-display">
                    {retentionConfidence === 'Not Started' ? 'N/A' : retentionConfidence === 'Low' ? '1 Day' : retentionConfidence === 'Medium' ? '3 Days' : '7+ Days'}
                  </span>
                </div>
                
                <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 text-center space-y-1 shadow-sm">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Formula Cards</span>
                  <span className="text-sm font-bold text-indigo-300 font-display">{formulas.length} Formulas</span>
                </div>
                
                <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/10 text-center space-y-1 shadow-sm">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Logged Errors</span>
                  <span className="text-sm font-bold text-red-400 font-display">{chapterMistakes.length} Mistakes</span>
                </div>
              </div>
            </div>

            {/* Harmonious Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 mt-auto">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveTab('formulas')}
                className="flex-1 h-11 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/15 text-zinc-200 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Practice Formulas ({formulas.length})</span>
              </motion.button>

              {onPracticeWithAI && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    onClose();
                    onPracticeWithAI(chapter.id, chapter.subject);
                  }}
                  className="flex-1 h-11 px-4 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Generate AI Practice</span>
                </motion.button>
              )}

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onClose();
                  actions.openChapterEditModal(chapter.id);
                }}
                className="h-11 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/15 text-zinc-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm"
                title="Adjust lectures, DPPs, and chapter status"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                <span>Settings</span>
              </motion.button>
            </div>

          </div>
        )}

        {/* TAB 2: FORMULA FLASHCARDS */}
        {activeTab === 'formulas' && (
          <div className="space-y-3">
            {formulas.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-mono text-xs bg-zinc-950/60 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                <BookOpen className="w-6 h-6 text-zinc-600" />
                <span>No formula cards indexed for this chapter yet.</span>
              </div>
            ) : (
              formulas.map((f, idx) => {
                const isFlipped = !!flippedCards[idx];
                return (
                  <div 
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all text-left space-y-3 backdrop-blur-xl shadow-md ${
                      isFlipped 
                        ? 'bg-zinc-900/80 border-indigo-500/50 shadow-xl' 
                        : 'bg-zinc-950/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <span className="text-[11px] font-mono font-bold uppercase text-indigo-400 tracking-wider truncate">
                        Formula #{idx + 1} • {renderMathText(f.title)}
                      </span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => toggleFlip(idx)}
                        className="text-[10px] font-mono font-bold text-zinc-300 hover:text-white bg-zinc-900 border border-white/10 px-3 py-1 rounded-xl cursor-pointer shrink-0 transition-colors"
                      >
                        {isFlipped ? 'Show Prompt' : 'Reveal Formula'}
                      </motion.button>
                    </div>

                    {isFlipped ? (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-wider block">
                          Formula Expression:
                        </span>
                        <div className="font-mono text-xs text-indigo-200 bg-zinc-950/90 p-4 rounded-xl border border-indigo-900/40 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                          {renderMathText(f.formula)}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-1">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">
                          Concept Prompt
                        </span>
                        <p className="text-xs text-zinc-200 leading-relaxed font-sans font-medium">
                          "{renderMathText(f.concept)}"
                        </p>
                      </div>
                    )}

                    {isFlipped && (
                      <div className="flex justify-end gap-1.5 pt-2 border-t border-white/10">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleMarkRecall('Low', f.title)}
                          className="text-[10px] font-mono font-bold py-1.5 px-3 rounded-xl cursor-pointer bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Skull className="w-3.5 h-3.5" /> Blackout
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleMarkRecall('Medium', f.title)}
                          className="text-[10px] font-mono font-bold py-1.5 px-3 rounded-xl cursor-pointer bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Timer className="w-3.5 h-3.5" /> Hard
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleMarkRecall('High', f.title)}
                          className="text-[10px] font-mono font-bold py-1.5 px-3 rounded-xl cursor-pointer bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Good
                        </motion.button>
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
            <div className="text-[11px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
              Logged Revision Events ({chapSessions.length})
            </div>

            {chapSessions.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-mono text-xs bg-zinc-950/60 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2">
                <Clock className="w-6 h-6 text-zinc-600" />
                <span>No previous revision sessions logged for this chapter yet.</span>
              </div>
            ) : (
              chapSessions.map((sess, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/10 flex items-center justify-between text-xs font-mono shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-zinc-200">{new Date(sess.startTime).toLocaleDateString()}</span>
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

    </Modal>
  );
};
