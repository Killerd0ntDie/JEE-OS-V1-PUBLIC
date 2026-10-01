import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, CheckCircle2, BookOpen, SlidersHorizontal, Target, Activity,
  Trash2, AlertTriangle, Play, Binary
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Chapter } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { isTestForChapter } from '@/features/mockTests/MockTestsPage';
import { ChapterTelemetry } from '@jee-os/engines';
import { FORMULA_BANK } from '@/constants/formulaBank';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { springs } from '@/constants/motion';
import { PrerequisiteFoundationAlert } from '@/features/subjects/components/PrerequisiteFoundationAlert';
import { useToast } from '@/components/ui/ToastProvider';
import {
  ChapterProgressTab,
  ChapterPracticeTab,
  ChapterMetaTab,
  ChapterMistakesTab,
  ChapterRadarTab,
  ChapterFormulasTab
} from './chapterModal';

export type ChapterEditTab = 'progress' | 'practice' | 'formulas' | 'mistakes' | 'meta' | 'radar';

export interface ChapterEditModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  chapterId?: string | null;
  defaultTab?: ChapterEditTab;
}

export const ChapterEditModal: React.FC<ChapterEditModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  defaultTab = 'progress'
}) => {
  const actions = useStudyBrainStore(state => state.actions);
  const activeEditChapterId = useStudyBrainStore(state => state.activeEditChapterId);
  const chapterTelemetryMap = useStudyBrainStore(state => state.chapterTelemetryMap);
  const chapters = useStudyBrainStore(state => state.chapters);
  const mistakes = useStudyBrainStore(state => state.mistakes);
  const customMockTests = useStudyBrainStore(state => state.customMockTests) || [];

  const effectiveIsOpen = isOpen !== undefined ? isOpen : !!activeEditChapterId;
  const effectiveChapterId = chapterId !== undefined ? chapterId : activeEditChapterId;
  const handleClose = useCallback(() => {
    if (onClose) onClose();
    else actions.closeChapterEditModal();
  }, [onClose, actions]);

  const rawChapter: Chapter | undefined = chapters.find(c => c.id === effectiveChapterId || c.name === effectiveChapterId);
  
  // Cache the last selected chapter so closing exit animations don't abruptly unmount
  const lastChapterRef = useRef<Chapter | undefined>(rawChapter);
  if (rawChapter) {
    lastChapterRef.current = rawChapter;
  }
  const chapter = rawChapter || lastChapterRef.current;
  const telemetry: ChapterTelemetry | undefined = chapter && chapterTelemetryMap ? chapterTelemetryMap[chapter.id] : undefined;
  const chapterMistakes = chapter ? mistakes.filter(m => m.chapter === chapter.name && m.revisionStatus !== 'Mastered') : [];

  const navigate = useNavigate();
  const { toast } = useToast();

  const chapterTests = React.useMemo(() => {
    if (!chapter) return [];
    return customMockTests.filter(t => isTestForChapter(t, chapter.name, chapter.subject, chapter.id));
  }, [chapter, customMockTests]);

  const chapterFormulas = React.useMemo(() => {
    if (!chapter) return [];
    const chapIdLower = (chapter.id || '').toLowerCase().trim();
    const chapNameLower = (chapter.name || '').toLowerCase().trim();
    const found = FORMULA_BANK.find(c => 
      c.chapterId.toLowerCase() === chapIdLower ||
      c.chapterName.toLowerCase() === chapNameLower ||
      c.chapterName.toLowerCase().includes(chapNameLower) ||
      chapNameLower.includes(c.chapterName.toLowerCase())
    );
    return found ? found.formulas : [];
  }, [chapter]);

  const [activeTab, setActiveTab] = useState<ChapterEditTab>(defaultTab);

  // Form states
  const [currentLecture, setCurrentLecture] = useState<number>(0);
  const [totalLectures, setTotalLectures] = useState<number>(0);
  const [theoryComplete, setTheoryComplete] = useState<boolean>(false);
  const [totalLecturesError, setTotalLecturesError] = useState<boolean>(false);
  const totalLecturesRef = useRef<HTMLInputElement>(null);
  const [teacher, setTeacher] = useState<string>('');
  const [avgLectureDuration, setAvgLectureDuration] = useState<number>(0);

  const [completedDpp, setCompletedDpp] = useState<number>(0);
  const [totalDpp, setTotalDpp] = useState<number>(0);
  const [completedPyq, setCompletedPyq] = useState<number>(0);
  const [totalPyq, setTotalPyq] = useState<number>(30);
  const [dppOnHold, setDppOnHold] = useState<boolean>(false);
  const [pyqOnHold, setPyqOnHold] = useState<boolean>(false);
  const [chapterOnHold, setChapterOnHold] = useState<boolean>(false);

  const dppComplete = completedDpp >= totalDpp && totalDpp > 0;
  const pyqsComplete = completedPyq >= totalPyq && totalPyq > 0;

  const [confidence, setConfidence] = useState<number>(70);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [weightage, setWeightage] = useState<number>(4.5);
  const [notes, setNotes] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (chapter) {
      setCurrentLecture(chapter.currentLecture || 0);
      setTotalLectures(chapter.totalLectures || 0);
      setTheoryComplete(!!chapter.theoryComplete);
      setTeacher(chapter.lectureProgress?.teacher || '');
      setAvgLectureDuration(chapter.lectureProgress?.avgLectureDurationMinutes || 0);

      const initialDppTotal = chapter.practiceProgress?.totalDpp || 10;
      const initialPyqTotal = chapter.practiceProgress?.totalPyq || chapter.practiceProgress?.totalPyqs || 30;

      setTotalDpp(initialDppTotal);
      setCompletedDpp(chapter.practiceProgress?.completedDpp ?? (chapter.practiceProgress?.dppPercent ? Math.round((chapter.practiceProgress.dppPercent / 100) * initialDppTotal) : (chapter.dppComplete ? initialDppTotal : 0)));
      
      setTotalPyq(initialPyqTotal);
      setCompletedPyq(chapter.practiceProgress?.completedPyq ?? (chapter.practiceProgress?.pyqPercent ? Math.round((chapter.practiceProgress?.pyqPercent / 100) * initialPyqTotal) : (chapter.pyqsComplete ? initialPyqTotal : 0)));
      
      setConfidence(chapter.confidence || 70);
      setDifficulty(chapter.difficulty || 'Medium');
      setPriority(chapter.priority || 2);
      setWeightage(telemetry?.weightagePercent ?? chapter.weightage ?? 4.5);
      setNotes(chapter.practiceProgress?.weakTopics?.join(', ') || '');
      setSerialNumber(chapter.serialNumber ? chapter.serialNumber.replace(/\D/g, '').padStart(2, '0') : '');
      setDppOnHold(!!chapter.dppOnHold);
      setPyqOnHold(!!chapter.pyqOnHold);
      setChapterOnHold(!!chapter.chapterOnHold);
    }
  }, [chapter, isOpen, telemetry]);

  const toggleChapterHold = async () => {
    const newVal = !chapterOnHold;
    setChapterOnHold(newVal);
    if (chapter) await actions.updateChapter(chapter.id, { chapterOnHold: newVal });
  };

  const toggleDppHold = async () => {
    const newVal = !dppOnHold;
    setDppOnHold(newVal);
    if (chapter) await actions.updateChapter(chapter.id, { dppOnHold: newVal });
  };

  const togglePyqHold = async () => {
    const newVal = !pyqOnHold;
    setPyqOnHold(newVal);
    if (chapter) await actions.updateChapter(chapter.id, { pyqOnHold: newVal });
  };

  const estimatedHours = Math.round(((Math.max(0, totalLectures - currentLecture)) * (avgLectureDuration || 0)) / 60);

  if (!chapter && !effectiveIsOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapter) return;
    setIsSaving(true);

    if (serialNumber) {
      const newSerialNumber = `CH${serialNumber}`;
      const duplicateChapter = chapters.find(
        c => c.serialNumber === newSerialNumber && c.id !== chapter.id && c.subject === chapter.subject
      );
      if (duplicateChapter) {
        toast({
          title: 'Duplicate Serial Number',
          description: `Serial number ${newSerialNumber} is already used by "${duplicateChapter.name}". Please use a different number.`,
          type: 'warning'
        });
        setIsSaving(false);
        return;
      }

      const subjectChapters = chapters.filter(c => c.subject === chapter.subject);
      let maxNum = 0;
      subjectChapters.forEach(ch => {
        if (ch.serialNumber?.startsWith('CH')) {
          const numStr = ch.serialNumber.slice(2);
          const num = parseInt(numStr, 10);
          if (!Number.isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const inputNum = parseInt(serialNumber, 10);
      if (!Number.isNaN(inputNum) && inputNum > maxNum + 1) {
        toast({
          title: 'Invalid Serial Number',
          description: `Serial number cannot exceed ${maxNum + 1} (highest current serial number + 1). Please use a smaller number.`,
          type: 'warning'
        });
        setIsSaving(false);
        return;
      }
    }

    const updatedFields: Partial<Chapter> = {
      currentLecture,
      totalLectures,
      theoryComplete,
      hasTelemetry: true,
      dppComplete,
      pyqsComplete,
      confidence,
      difficulty,
      priority,
      weightage,
      estimatedRemainingTime: estimatedHours,
      chapterOnHold,
      dppOnHold,
      pyqOnHold,
      serialNumber: serialNumber ? `CH${serialNumber}` : undefined,
      lectureProgress: {
        totalLectures,
        completedLectures: currentLecture,
        avgLectureDurationMinutes: avgLectureDuration,
        teacher,
        estimatedRemainingHours: Math.round(((totalLectures - currentLecture) * avgLectureDuration) / 60)
      },
      practiceProgress: {
        dppCompleted: dppComplete,
        pyqsCompleted: pyqsComplete,
        moduleCompleted: dppComplete && pyqsComplete,
        dppPercent: dppComplete ? 100 : Math.round((completedDpp / (totalDpp || 1)) * 100),
        pyqPercent: pyqsComplete ? 100 : Math.round((completedPyq / (totalPyq || 1)) * 100),
        totalDpp,
        completedDpp,
        totalPyq,
        completedPyq,
        accuracyPercent: confidence,
        confidencePercent: confidence,
        weakTopics: notes ? notes.split(',').map(s => s.trim()).filter(Boolean) : []
      }
    };

    try {
      await actions.updateChapter(chapter.id, updatedFields);
      setIsSaving(false);
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        handleClose();
      }, 500);
    } catch (err) {
      console.error('Failed to save chapter:', err);
      setIsSaving(false);
      toast({
        title: 'Save Failed',
        description: 'Failed to save chapter data. Please check your connection and try again.',
        type: 'error'
      });
    }
  };

  const tabs: Array<{ id: ChapterEditTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'progress', label: 'Lectures', icon: BookOpen },
    { id: 'practice', label: 'Practice', icon: Target },
    { id: 'formulas', label: `Formulas (${chapterFormulas.length})`, icon: Binary },
    { id: 'mistakes', label: `Mistakes (${chapterMistakes.length})`, icon: AlertTriangle },
    { id: 'meta', label: 'Metadata', icon: SlidersHorizontal },
    { id: 'radar', label: 'Radar', icon: Activity },
  ];

  return (
    <>
      <Modal 
        isOpen={effectiveIsOpen} 
        onClose={handleClose} 
        zIndex={999} 
        backdropClassName="bg-black/10 backdrop-blur-sm"
        className="w-full max-w-2xl min-h-[500px] h-[95vh] max-h-[95vh] flex flex-col border border-zinc-800/90 rounded-3xl shadow-2xl overflow-hidden focus:outline-none text-left glass-panel"
      >
        {/* Toast */}
        {showSuccessToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-mono font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Chapter Telemetry Updated via ChapterInfoEngine!
          </div>
        )}

        {chapter && (
          <>
            {/* Elegant Cohesive Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-850/80 bg-zinc-950/80 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Category & Unit Hierarchy */}
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <span className="text-white font-bold tracking-wider">{chapter.serialNumber || 'MODULE'}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-indigo-300 font-semibold">{chapter.subject.toUpperCase()}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400 truncate">{chapter.unit || 'Core Module'}</span>
                  </div>

                  {/* Chapter Name */}
                  <h2 id="chapter-modal-title" className="text-xl font-display font-bold text-white tracking-tight leading-snug">
                    {chapter.name}
                  </h2>

                  {/* Unified Vitals Metadata Line */}
                  <div className="flex items-center gap-3 pt-0.5 text-xs font-mono text-zinc-400 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      Mastery <strong className="text-zinc-200">{telemetry?.masteryScore ?? chapter.completion ?? 0}%</strong>
                    </span>
                    <span className="text-zinc-700">•</span>
                    <span>
                      Weightage <strong className="text-zinc-200">{telemetry?.weightagePercent ?? chapter.weightage ?? 4.5}%</strong> (Tier {chapter.priority || 2})
                    </span>
                    {telemetry?.isBottleneck && (
                      <>
                        <span className="text-zinc-700">•</span>
                        <span className="text-amber-400 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Bottleneck Active
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={toggleChapterHold}
                    className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                      chapterOnHold
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {chapterOnHold ? 'ON HOLD' : 'Put on Hold'}
                  </button>
                  <button
                    onClick={handleClose}
                    aria-label="Close modal"
                    className="p-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80 transition-all cursor-pointer select-none active:scale-95"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Segmented Tab Glider */}
            <div className="p-2 border-b border-zinc-850/80 bg-zinc-950/80 shrink-0">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-zinc-900/60 border border-zinc-850 rounded-xl relative select-none">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative py-2 px-2 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer select-none z-10 flex items-center justify-center gap-1.5 truncate ${
                        isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="chapterEditTabGlider"
                          className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md shadow-indigo-600/30 -z-10"
                          transition={springs.fluid}
                        />
                      )}
                      <TabIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Body - Stable Fixed Height with Internal Scroll */}
            <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col justify-between p-5 sm:p-6 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left scrollbar">
                {/* PREREQUISITE FOUNDATION ALERT */}
                <PrerequisiteFoundationAlert
                  currentChapterName={chapter.name}
                  onOpenPrerequisite={(prereqId) => actions.openChapterEditModal(prereqId)}
                />

                <AnimatePresence mode="wait">
                  {activeTab === 'progress' && (
                    <ChapterProgressTab
                      currentLecture={currentLecture}
                      setCurrentLecture={setCurrentLecture}
                      totalLectures={totalLectures}
                      setTotalLectures={setTotalLectures}
                      totalLecturesError={totalLecturesError}
                      setTotalLecturesError={setTotalLecturesError}
                      totalLecturesRef={totalLecturesRef}
                      theoryComplete={theoryComplete}
                      setTheoryComplete={setTheoryComplete}
                      teacher={teacher}
                      setTeacher={setTeacher}
                      avgLectureDuration={avgLectureDuration}
                      setAvgLectureDuration={setAvgLectureDuration}
                    />
                  )}

                  {activeTab === 'practice' && (
                    <ChapterPracticeTab
                      chapter={chapter}
                      totalLectures={totalLectures}
                      dppOnHold={dppOnHold}
                      toggleDppHold={toggleDppHold}
                      completedDpp={completedDpp}
                      setCompletedDpp={setCompletedDpp}
                      totalDpp={totalDpp}
                      setTotalDpp={setTotalDpp}
                      pyqOnHold={pyqOnHold}
                      togglePyqHold={togglePyqHold}
                      completedPyq={completedPyq}
                      setCompletedPyq={setCompletedPyq}
                      totalPyq={totalPyq}
                      setTotalPyq={setTotalPyq}
                      confidence={confidence}
                      setConfidence={setConfidence}
                      chapterTests={chapterTests}
                      onCloseModal={handleClose}
                      navigate={navigate}
                    />
                  )}

                  {activeTab === 'formulas' && (
                    <ChapterFormulasTab
                      chapter={chapter}
                      onCloseModal={handleClose}
                      navigate={navigate}
                    />
                  )}

                  {activeTab === 'meta' && (
                    <ChapterMetaTab
                      weightage={weightage}
                      priority={priority}
                      setPriority={setPriority}
                      difficulty={difficulty}
                      setDifficulty={setDifficulty}
                      serialNumber={serialNumber}
                      setSerialNumber={setSerialNumber}
                      notes={notes}
                      setNotes={setNotes}
                    />
                  )}

                  {activeTab === 'mistakes' && (
                    <ChapterMistakesTab
                      chapter={chapter}
                      chapterMistakes={chapterMistakes}
                      onAddMistake={actions.addMistake}
                    />
                  )}

                  {activeTab === 'radar' && (
                    <ChapterRadarTab telemetry={telemetry} />
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Action Bar */}
              <div className="pt-4 border-t border-zinc-850/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-mono text-xs font-bold cursor-pointer transition-all active:scale-95 select-none flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    Delete Chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      useStudyBrainStore.setState({ radarFocusedChapter: chapter.id } as any);
                      navigate('/cockpit', {
                        state: { subject: chapter.subject, chapterId: chapter.id, chapterName: chapter.name }
                      });
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 text-indigo-300 font-mono text-xs font-bold cursor-pointer transition-all active:scale-95 select-none flex items-center gap-1.5"
                    title="Launch deep study session for this chapter in Cockpit"
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-400" />
                    Focus Session
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      navigate(`/revision?chapterId=${chapter.id}`, {
                        state: { chapterId: chapter.id, chapterName: chapter.name }
                      });
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 text-purple-300 font-mono text-xs font-bold cursor-pointer transition-all active:scale-95 select-none flex items-center gap-1.5"
                    title="Practice active recall flashcards for this chapter"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    Practice Flashcards
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold cursor-pointer transition-all active:scale-95 select-none"
                  >
                    Cancel
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-[0.98] select-none"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Telemetry'}
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title="Delete Chapter"
        message={`Are you sure you want to delete "${chapter?.name}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete Chapter"
        onConfirm={async () => {
          if (chapter) {
            try {
              const customActions = actions as unknown as { deleteChapter?: (id: string) => Promise<void> };
              if (typeof customActions.deleteChapter === 'function') {
                await customActions.deleteChapter(chapter.id);
              } else {
                await actions.updateChapter(chapter.id, { chapterOnHold: true });
              }
              setShowDeleteConfirm(false);
              handleClose();
            } catch (error) {
              console.error('Failed to delete chapter:', error);
            }
          }
        }}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
