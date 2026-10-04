import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  FlaskConical, 
  Atom, 
  Calculator, 
  BookOpen, 
  Check, 
  Sigma, 
  ShieldAlert, 
  Calendar,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { useShallow } from 'zustand/react/shallow';
import { Chapter } from '@/types/index';
import { RevisionCard } from '@/services/revisionEngineService';
import { findMatchingBankChapter } from '@jee-os/engines';
import { RevisionSession } from '@/features/revision/components/RevisionSession';

export interface SmartRevisionQueueWidgetProps {
  revisionQueue?: RevisionCard[];
  onLaunchRevision?: (rev: RevisionCard | null) => void;
}

type SubjectFilter = 'all' | 'physics' | 'chemistry' | 'maths';

export function DailyChapterReviewWidget({
  revisionQueue = [],
  onLaunchRevision
}: SmartRevisionQueueWidgetProps) {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilter>('all');
  const [markedDoneIds, setMarkedDoneIds] = useState<Set<string>>(new Set());
  const [reviewingChapter, setReviewingChapter] = useState<Chapter | null>(null);

  const { chapters, revisionTelemetry, actions } = useStudyBrainStore(
    useShallow(state => ({
      chapters: state.chapters || [],
      revisionTelemetry: state.revisionTelemetry,
      actions: state.actions
    }))
  );

  const getChapterCards = useCallback((chap: Chapter) => {
    const fromTelemetry = (revisionTelemetry?.cards || []).filter(c => c.chapterId === chap.id);
    if (fromTelemetry.length > 0) return fromTelemetry;
    const bank = findMatchingBankChapter(chap);
    if (bank) {
      return bank.formulas.map((f, idx) => ({
        id: `${chap.id}-f${idx}`,
        chapterId: chap.id,
        chapterName: chap.name,
        subject: chap.subject,
        cardType: 'formula' as const,
        retentionConfidence: 'Medium' as const,
        retentionScore: 60,
        title: f.title,
        concept: f.concept,
        formula: f.formula,
        examNote: f.examNote,
        questionPrompt: f.questionPrompt || `Key Concept: ${f.concept}. State the governing formula and conditions.`,
        subtopic: f.subtopic || 'Key Formulas',
        nextReviewDays: 1,
        intervalStage: '1d',
        recalledCount: 0,
        urgencyRank: 50
      }));
    }
    return [];
  }, [revisionTelemetry]);

  // Studied chapters eligible for daily review
  const studiedChapters = useMemo(() => {
    return chapters.filter(c => 
      !c.chapterOnHold &&
      (c.status === 'Revision Due' || c.status === 'Mastered' || c.theoryComplete || (c.completion && c.completion >= 50))
    );
  }, [chapters]);

  // Incorporate any explicit queue items passed in
  const queueChapterIds = useMemo(() => {
    return new Set(revisionQueue.map(r => r.chapterId).filter(Boolean));
  }, [revisionQueue]);

  // Determine chapters due for review (strictly using canonical dueChapters if available, or fall back to studiedChapters)
  const dueChapters = useMemo(() => {
    if (revisionTelemetry?.dueChapters) {
      const canonicalIds = new Set(revisionTelemetry.dueChapters.map(d => d.chapterId));
      return chapters
        .filter(c => canonicalIds.has(c.id) && !markedDoneIds.has(c.id))
        .sort((a, b) => {
          const idxA = revisionTelemetry.dueChapters!.findIndex(d => d.chapterId === a.id);
          const idxB = revisionTelemetry.dueChapters!.findIndex(d => d.chapterId === b.id);
          return idxA - idxB;
        });
    }

    return studiedChapters.filter(c => {
      if (markedDoneIds.has(c.id)) return false;
      return (
        c.status === 'Revision Due' || 
        queueChapterIds.has(c.id) ||
        (typeof c.lastRevisionDaysAgo === 'number' && c.lastRevisionDaysAgo >= 7) ||
        (c.revisionCount === 0 && (c.theoryComplete || (c.completion && c.completion >= 80)))
      );
    }).sort((a, b) => {
      // Prioritize explicit 'Revision Due' or in queue, then longest since last revision
      const aIsDue = a.status === 'Revision Due' || queueChapterIds.has(a.id);
      const bIsDue = b.status === 'Revision Due' || queueChapterIds.has(b.id);
      if (aIsDue && !bIsDue) return -1;
      if (bIsDue && !aIsDue) return 1;
      return (b.lastRevisionDaysAgo || 0) - (a.lastRevisionDaysAgo || 0);
    });
  }, [revisionTelemetry?.dueChapters, chapters, studiedChapters, markedDoneIds, queueChapterIds]);

  // Filtered by selected subject
  const filteredDueChapters = useMemo(() => {
    if (selectedSubject === 'all') return dueChapters;
    return dueChapters.filter(c => c.subject?.toLowerCase() === selectedSubject);
  }, [dueChapters, selectedSubject]);

  const subjectCounts = useMemo(() => {
    return {
      all: dueChapters.length,
      physics: dueChapters.filter(c => c.subject?.toLowerCase() === 'physics').length,
      chemistry: dueChapters.filter(c => c.subject?.toLowerCase() === 'chemistry').length,
      maths: dueChapters.filter(c => c.subject?.toLowerCase() === 'maths').length
    };
  }, [dueChapters]);

  const getSubjectMeta = (subj?: string) => {
    const s = (subj || '').toLowerCase();
    if (s.includes('chem')) {
      return {
        label: 'Chemistry',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        icon: FlaskConical,
        iconColor: 'text-emerald-400'
      };
    }
    if (s.includes('math')) {
      return {
        label: 'Maths',
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        icon: Calculator,
        iconColor: 'text-purple-400'
      };
    }
    return {
      label: 'Physics',
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      icon: Atom,
      iconColor: 'text-sky-400'
    };
  };

  const handleMarkChapterReviewed = async (chapter: Chapter) => {
    audioEngine.playPowerUp().catch(() => {});
    setMarkedDoneIds(prev => new Set([...prev, chapter.id]));
    if (actions?.completeRevision) {
      await actions.completeRevision(chapter.id, 'High');
    }
  };

  const handleReviewChapter = (chap: Chapter) => {
    audioEngine.playRadioRelayClick().catch(() => {});
    if (onLaunchRevision) {
      onLaunchRevision(null);
    }
    if (actions?.openChapterEditModal) {
      actions.openChapterEditModal(chap.id);
    }
    setReviewingChapter(chap);
  };

  return (
    <div className="rounded-2xl p-5 md:p-6 h-full flex flex-col justify-between shadow-xl relative overflow-hidden text-left font-sans bg-surface-1 border border-border-subtle hover:border-border-muted">
      <div className="space-y-4 relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white tracking-tight uppercase">
                Daily Chapter Review
              </h3>
              <p className="text-[11px] text-zinc-400">
                Actionable concept, formula, and mistake review tasks
              </p>
            </div>
          </div>

          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border shadow-sm uppercase ${
            dueChapters.length > 0
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
          }`}>
            {dueChapters.length > 0 ? `${dueChapters.length} DUE` : 'ALL REVIEWED'}
          </span>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl css-glass-subtle font-mono text-xs">
          {(['all', 'physics', 'chemistry', 'maths'] as const).map(tab => {
            const count = subjectCounts[tab];
            const isSelected = selectedSubject === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedSubject(tab)}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition-colors cursor-pointer capitalize ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab} {count > 0 && <span className="text-[10px] opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Chapter Task List or Empty State */}
        <div className="flex-1 flex flex-col justify-center">
          {filteredDueChapters.length === 0 ? (
            <div className="p-5 rounded-2xl css-glass-subtle text-center space-y-3 flex flex-col items-center justify-center my-auto">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  All Studied Chapters Reviewed
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                  {selectedSubject === 'all'
                    ? 'No chapters are currently overdue for review. Keep your memory sharp by testing bookmarked formulas or re-solving recent mistakes.'
                    : `No ${selectedSubject} chapters are overdue for review today.`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/formulas')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sigma className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Review Formulas</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/mistakes')}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Review Mistakes</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
              <AnimatePresence initial={false}>
                {filteredDueChapters.map(chap => {
                  const meta = getSubjectMeta(chap.subject);
                  const SubjIcon = meta.icon;
                  const daysAgo = chap.lastRevisionDaysAgo;

                  return (
                    <motion.div
                      key={chap.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={springs.snappy}
                      className="p-3.5 rounded-xl css-glass-subtle hover:border-indigo-400/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm text-left"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border flex items-center gap-1 ${meta.badgeClass}`}>
                            <SubjIcon className={`w-3 h-3 ${meta.iconColor}`} />
                            {meta.label}
                          </span>
                          {chap.status === 'Revision Due' && (
                            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded">
                              Revision Due
                            </span>
                          )}
                          {chap.weaknessScore > 35 && (
                            <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/40 border border-rose-500/30 px-1.5 py-0.5 rounded">
                              {chap.weaknessScore}% Weakness
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white truncate" title={chap.name}>
                          {chap.name}
                        </h4>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-300 font-mono flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            {daysAgo !== undefined && daysAgo > 0 ? `Revised ${daysAgo}d ago` : 'Never reviewed'}
                          </span>
                          <span>•</span>
                          <span>{chap.revisionCount || 0} reviews</span>
                          {chap.solvedQuestions > 0 && (
                            <>
                              <span>•</span>
                              <span>{chap.solvedQuestions} Qs</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReviewChapter(chap)}
                          className="px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg css-glass hover:bg-white/20 text-zinc-200 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                          title="Open chapter active recall session"
                        >
                          <BookOpen className="w-3 h-3 text-indigo-400" />
                          <span>Review</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkChapterReviewed(chap)}
                          className="px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-sm shadow-emerald-600/25"
                          title="Mark this chapter reviewed today (+60 XP)"
                        >
                          <Check className="w-3 h-3" />
                          <span>Done</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer Quick Links */}
      <div className="pt-3 border-t border-white/10 flex justify-between gap-2.5 mt-3 relative z-10 font-mono">
        <button 
          type="button"
          className="flex-1 text-xs font-mono font-bold h-8 css-glass text-zinc-200 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 uppercase"
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            navigate('/formulas');
          }}
        >
          <Sigma className="w-3 h-3 text-indigo-400" />
          <span>Formulas</span>
        </button>
        <button 
          type="button"
          className="flex-1 text-xs font-mono font-bold h-8 css-glass text-zinc-200 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 uppercase"
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            navigate('/mistakes');
          }}
        >
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span>Mistakes</span>
        </button>
        <button 
          type="button"
          className="flex-1 text-xs font-mono font-bold h-8 css-glass text-zinc-200 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 uppercase"
          onClick={() => {
            audioEngine.playRadioRelayClick().catch(() => {});
            navigate('/planner');
          }}
        >
          <Calendar className="w-3 h-3 text-cyan-400" />
          <span>Planner</span>
        </button>
      </div>

      {reviewingChapter && (
        <RevisionSession
          cards={getChapterCards(reviewingChapter)}
          chapterTitle={reviewingChapter.name}
          chapterId={reviewingChapter.id}
          onClose={() => setReviewingChapter(null)}
          onFinish={() => {
            if (reviewingChapter) {
              setMarkedDoneIds(prev => new Set([...prev, reviewingChapter.id]));
            }
            setReviewingChapter(null);
          }}
        />
      )}
    </div>
  );
}

// Backward compatibility export alias
export const SmartRevisionQueueWidget = DailyChapterReviewWidget;
