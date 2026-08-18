import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSubjectTheme } from '@/constants/subjectTheme';
import {
  X, Save, CheckCircle2, Clock, BookOpen, Layers, Flame, Award,
  AlertCircle, SlidersHorizontal, Calendar, FileText, Target, Activity,
  Check, Trash2, Sparkles, TrendingUp, AlertTriangle, ChevronRight
} from 'lucide-react';
import { Chapter, SubjectId, SyllabusDiagnosisStage } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ChapterTelemetry } from '@jee-os/engines';
import { Modal } from '@/components/ui/Modal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { springs } from '@/constants/motion';
import { PrerequisiteFoundationAlert } from '@/features/subjects/components/PrerequisiteFoundationAlert';

const PracticeModule = ({
  title,
  colorClass,
  badgeColorClass,
  subtitle,
  holdMsg,
  recommendedMsg,
  onHold,
  setOnHold,
  completed,
  setCompleted,
  total,
  setTotal,
}: {
  title: string;
  colorClass: string;
  badgeColorClass: string;
  subtitle: string;
  holdMsg: string;
  recommendedMsg: string;
  onHold: boolean;
  setOnHold: (val: boolean) => void;
  completed: number;
  setCompleted: (val: number) => void;
  total: number;
  setTotal: (val: number) => void;
}) => {
  const percent = Math.min(100, Math.round((completed / (total || 1)) * 100));

  return (
    <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 flex flex-col justify-between gap-3 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold tracking-wider uppercase ${colorClass}`}>{title}</span>
          <span className="text-[10px] font-mono text-zinc-400">({percent}%)</span>
        </div>
        <button
          type="button"
          onClick={() => setOnHold(!onHold)}
          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer select-none active:scale-95 ${
            onHold
              ? badgeColorClass
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          }`}
        >
          {onHold ? 'ON HOLD' : 'Put on Hold'}
        </button>
      </div>

      <p className="text-[11px] font-mono text-zinc-400 leading-tight">{subtitle}</p>

      {onHold && (
        <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-300 text-[10px] font-mono">
          {holdMsg}
        </div>
      )}

      {/* Progress Track */}
      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">Solved / Done</span>
          <input
            type="number"
            min="0"
            max={total}
            value={completed === 0 ? '' : completed} placeholder="0"
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setCompleted(Math.max(0, Math.min(total, val)));
            }}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors"
          />
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">Total Target</span>
          <input
            type="number"
            min="1"
            value={total === 0 ? '' : total} placeholder="0"
            onChange={(e) => setTotal(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="text-[10px] font-mono text-zinc-400 italic">
        {recommendedMsg}
      </div>
    </div>
  );
};

export interface ChapterEditModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  chapterId?: string | null;
  defaultTab?: 'progress' | 'practice' | 'meta' | 'radar';
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

  const mistakes = useStudyBrainStore(state => state.mistakes);
  const chapterMistakes = chapter ? mistakes.filter(m => m.chapter === chapter.name && m.revisionStatus !== 'Mastered') : [];

  const [activeTab, setActiveTab] = useState<'progress' | 'practice' | 'mistakes' | 'meta' | 'radar'>(defaultTab as any);
  const [newMistakeTitle, setNewMistakeTitle] = useState('');
  const [newMistakeDesc, setNewMistakeDesc] = useState('');
  const [newMistakeTag, setNewMistakeTag] = useState('Calculation');
  const [isAddingMistake, setIsAddingMistake] = useState(false);

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

      const initialDppTotal = 10;
      const initialPyqTotal = 30;

      setTotalDpp(initialDppTotal);
      setCompletedDpp(chapter.practiceProgress?.dppPercent ? Math.round((chapter.practiceProgress.dppPercent / 100) * initialDppTotal) : (chapter.dppComplete ? initialDppTotal : 0));
      
      setTotalPyq(initialPyqTotal);
      setCompletedPyq(chapter.practiceProgress?.pyqPercent ? Math.round((chapter.practiceProgress.pyqPercent / 100) * initialPyqTotal) : (chapter.pyqsComplete ? initialPyqTotal : 0));
      
      setConfidence(chapter.confidence || 70);
      setDifficulty(chapter.difficulty || 'Medium');
      setPriority(chapter.priority || 2);
      setWeightage(telemetry?.weightagePercent ?? chapter.weightage ?? 4.5);
      setNotes('');
      setSerialNumber(chapter.serialNumber ? chapter.serialNumber.replace(/\D/g, '').padStart(2, '0') : '');
      setDppOnHold(!!chapter.dppOnHold);
      setPyqOnHold(!!chapter.pyqOnHold);
      setChapterOnHold(!!chapter.chapterOnHold);
    }
  }, [chapter, isOpen]);

  const toggleChapterHold = async () => {
    const newVal = !chapterOnHold;
    setChapterOnHold(newVal);
    if (chapter) await actions.updateChapter(chapter.id, { chapterOnHold: newVal });
  };

  const toggleDppHold = async (newVal: boolean) => {
    setDppOnHold(newVal);
    if (chapter) await actions.updateChapter(chapter.id, { dppOnHold: newVal });
  };

  const togglePyqHold = async (newVal: boolean) => {
    setPyqOnHold(newVal);
    if (chapter) await actions.updateChapter(chapter.id, { pyqOnHold: newVal });
  };

  const estimatedHours = Math.round(((Math.max(0, totalLectures - currentLecture)) * (avgLectureDuration || 0)) / 60);

  if (!chapter && !effectiveIsOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapter) return;
    setIsSaving(true);

    const calculatedCompletion = Math.min(100, Math.round(
      ((currentLecture / (totalLectures || 1)) * 40) +
      (theoryComplete ? 20 : 0) +
      (dppComplete ? 20 : 0) +
      (pyqsComplete ? 20 : 0)
    ));

    // Check for duplicate serial number within the same subject only
    if (serialNumber) {
      const newSerialNumber = `CH${serialNumber}`;
      const duplicateChapter = chapters.find(
        c => c.serialNumber === newSerialNumber && c.id !== chapter.id && c.subject === chapter.subject
      );
      if (duplicateChapter) {
        alert(`Serial number ${newSerialNumber} is already used by "${duplicateChapter.name}". Please use a different number.`);
        setIsSaving(false);
        return;
      }

      // Check if serial number exceeds max allowed (highest in subject + 1)
      const subjectChapters = chapters.filter(c => c.subject === chapter.subject);
      let maxNum = 0;
      subjectChapters.forEach(ch => {
        if (ch.serialNumber && ch.serialNumber.startsWith('CH')) {
          const numStr = ch.serialNumber.slice(2);
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const inputNum = parseInt(serialNumber, 10);
      if (!isNaN(inputNum) && inputNum > maxNum + 1) {
        alert(`Serial number cannot exceed ${maxNum + 1} (highest current serial number + 1). Please use a smaller number.`);
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
      completion: calculatedCompletion,
      chapterOnHold,
      dppOnHold,
      pyqOnHold,
      serialNumber: serialNumber ? `CH${serialNumber}` : undefined,
      status: calculatedCompletion === 100 ? 'Mastered' : 'Learning',
      syllabusStage: calculatedCompletion === 100 ? 'Mastered' : 'Watching Lectures',
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
        accuracyPercent: confidence,
        confidencePercent: confidence,
        weakTopics: notes ? notes.split(',').map(s => s.trim()) : []
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
      alert('Failed to save chapter data. Please check your connection and try again.');
    }
  };

  const theme = chapter ? getSubjectTheme(chapter.subject) : { badge: 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30' };
  const subjectColorClass = theme.badge;

  const tabs = [
    { id: 'progress', label: 'Lectures', icon: BookOpen },
    { id: 'practice', label: 'Practice', icon: Target },
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
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-zinc-900/60 border border-zinc-850 rounded-xl relative select-none">
                {tabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
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
                  onOpenPrerequisite={(prereqId) => openModal(prereqId)}
                />

                <AnimatePresence mode="wait">
                  {activeTab === 'progress' && (
                    <motion.div
                      key="progress"
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-3">
                        <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-400" />
                          Lectures Progress Counter
                        </label>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <span className="text-[11px] text-zinc-400 block mb-1 font-mono uppercase tracking-wider">Watched Lectures</span>
                            <input
                              type="number"
                              min="0"
                              max={totalLectures}
                              disabled={theoryComplete}
                              value={currentLecture === 0 ? '' : currentLecture} placeholder="0"
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setCurrentLecture(Math.max(0, Math.min(totalLectures, val)));
                              }}
                              className={`w-full bg-zinc-900 border rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${theoryComplete ? 'border-indigo-500/30 opacity-70 cursor-not-allowed' : 'border-zinc-800 focus:border-indigo-500'}`}
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-zinc-400 block mb-1 font-mono uppercase tracking-wider">Total Chapter Lectures</span>
                            <input
                              ref={totalLecturesRef}
                              type="number"
                              min="1"
                              max="100"
                              disabled={theoryComplete}
                              value={totalLectures === 0 ? '' : totalLectures} placeholder="0"
                              onChange={(e) => {
                                setTotalLectures(parseInt(e.target.value) || 0);
                                if (parseInt(e.target.value) > 0) setTotalLecturesError(false);
                              }}
                              className={`w-full bg-zinc-900 border rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${totalLecturesError ? 'border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]' : theoryComplete ? 'border-indigo-500/30 opacity-70 cursor-not-allowed' : 'border-zinc-800 focus:border-indigo-500'}`}
                            />
                            {totalLecturesError && (
                              <span className="text-[10px] text-rose-400 mt-1 block">Set total lectures first</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
                          <span className="text-[11px] text-zinc-400 block font-mono uppercase tracking-wider">Teacher / Coaching Batch</span>
                          <input
                            type="text"
                            placeholder="e.g. Physics Galaxy, PW, Allen"
                            value={teacher}
                            onChange={(e) => setTeacher(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                          />
                        </div>
                        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
                          <span className="text-[11px] text-zinc-400 block font-mono uppercase tracking-wider">Avg Duration (mins)</span>
                          <input
                            type="number"
                            value={avgLectureDuration === 0 ? '' : avgLectureDuration} placeholder="0"
                            onChange={(e) => setAvgLectureDuration(parseInt(e.target.value) || 0)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 cursor-pointer hover:border-indigo-500/40 transition-all select-none group">
                        <input
                          type="checkbox"
                          checked={theoryComplete}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            if (isChecked && (!totalLectures || totalLectures === 0)) {
                              setTotalLecturesError(true);
                              totalLecturesRef.current?.focus();
                              return; // Don't check the box yet
                            }
                            setTotalLecturesError(false);
                            setTheoryComplete(isChecked);
                            if (isChecked) {
                              setCurrentLecture(totalLectures);
                            }
                          }}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-mono text-zinc-200 font-bold block group-hover:text-indigo-300 transition-colors">
                            Theory / All Lectures Completed
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            Locks theory phase and unlocks 100% priority towards DPP and PYQ solving drills
                          </span>
                        </div>
                      </label>
                    </motion.div>
                  )}

                  {activeTab === 'practice' && (
                    <motion.div
                      key="practice"
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <PracticeModule
                          title="DPP Practice"
                          colorClass="text-emerald-400"
                          badgeColorClass="bg-amber-500/20 border-amber-500/40 text-amber-300"
                          subtitle="Problem Sets & Daily Practice"
                          holdMsg="DPPs won't be scheduled for this chapter until you turn this off."
                          recommendedMsg={`* Recommended: ${Math.max(5, Math.round((totalLectures || 10) * 0.8))} sets for completion.`}
                          onHold={dppOnHold}
                          setOnHold={toggleDppHold}
                          completed={completedDpp}
                          setCompleted={setCompletedDpp}
                          total={totalDpp}
                          setTotal={setTotalDpp}
                        />

                        <PracticeModule
                          title="JEE PYQs"
                          colorClass="text-purple-400"
                          badgeColorClass="bg-amber-500/20 border-amber-500/40 text-amber-300"
                          subtitle="Past Years Questions Drill"
                          holdMsg="PYQs won't be scheduled for this chapter until you turn this off."
                          recommendedMsg="* Recommended: ~50-80 PYQs per chapter."
                          onHold={pyqOnHold}
                          setOnHold={togglePyqHold}
                          completed={completedPyq}
                          setCompleted={setCompletedPyq}
                          total={totalPyq}
                          setTotal={setTotalPyq}
                        />
                      </div>

                      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-3">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider">Confidence Score Rating</span>
                          <span className="text-indigo-400 font-bold bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-500/30">{confidence}%</span>
                        </div>
                        <div className="relative pt-2 pb-1">
                          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-400 rounded-full transition-all duration-150"
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={confidence}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setConfidence(Math.max(0, Math.min(100, val)));
                            }}
                            className="w-full accent-indigo-500 cursor-pointer mt-2"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'meta' && (
                    <motion.div
                      key="meta"
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
                        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
                          <label className="block text-zinc-400 uppercase text-[10px] font-bold tracking-wider">JEE Weightage %</label>
                          <input
                            type="number"
                            value={weightage === 0 ? '' : weightage} placeholder="0"
                            readOnly
                            className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-zinc-400 cursor-not-allowed font-bold"
                          />
                          <span className="text-[10px] text-zinc-400 italic block">* System benchmark derived</span>
                        </div>
                        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5 relative z-20">
                          <label className="block text-zinc-400 uppercase text-[10px] font-bold tracking-wider">Priority Tier</label>
                          <CustomSelect
                            size="sm"
                            value={priority}
                            onChange={(val) => setPriority(parseInt(val) as 1 | 2 | 3)}
                            options={[
                              { value: 1, label: 'Tier 1 (High Priority)' },
                              { value: 2, label: 'Tier 2 (Medium Priority)' },
                              { value: 3, label: 'Tier 3 (Low Priority)' },
                            ]}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
                        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5 relative z-10">
                          <label className="block text-zinc-400 uppercase text-[10px] font-bold tracking-wider">Difficulty Level</label>
                          <CustomSelect
                            size="sm"
                            value={difficulty}
                            onChange={(val) => setDifficulty(val as 'Easy' | 'Medium' | 'Hard')}
                            options={[
                              { value: 'Easy', label: 'Easy' },
                              { value: 'Medium', label: 'Medium' },
                              { value: 'Hard', label: 'Hard' },
                            ]}
                          />
                        </div>
                        <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
                          <label className="block text-zinc-400 uppercase text-[10px] font-bold tracking-wider">Serial Number (Sorting)</label>
                          <input
                            type="text"
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value)}
                            placeholder="e.g. 05"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-1.5">
                        <label className="block font-mono text-zinc-400 uppercase text-[10px] font-bold tracking-wider">Chapter Notes & Weak Points</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Key concepts to revise, formula pitfalls, weak sub-topics..."
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500 font-mono resize-none"
                        />
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'mistakes' && (
                    <motion.div
                      key="mistakes"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Chapter Mistakes & Pitfalls Ledger
                          </h4>
                          <p className="text-[11px] font-mono text-zinc-400">Track recurring conceptual blunders and formula calculation errors.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingMistake(prev => !prev)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isAddingMistake ? 'Close Form' : 'Log New Error'}</span>
                        </button>
                      </div>

                      {isAddingMistake && (
                        <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Error Topic / Question Summary</label>
                            <input
                              type="text"
                              value={newMistakeTitle}
                              onChange={(e) => setNewMistakeTitle(e.target.value)}
                              placeholder="e.g. Sign error in Lenz's law integration"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 relative z-20">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Mistake Tag</label>
                              <CustomSelect
                                size="sm"
                                value={newMistakeTag}
                                onChange={(val) => setNewMistakeTag(String(val))}
                                options={[
                                  { value: 'Calculation', label: 'Calculation Error' },
                                  { value: 'Conceptual', label: 'Conceptual Flaw' },
                                  { value: 'Formula', label: 'Formula Recall' },
                                  { value: 'Speed/Panic', label: 'Speed / Time Pressure' },
                                  { value: 'Silly Mistake', label: 'Silly Mistake' },
                                ]}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Notes / What went wrong</label>
                              <input
                                type="text"
                                value={newMistakeDesc}
                                onChange={(e) => setNewMistakeDesc(e.target.value)}
                                placeholder="Forgot minus sign on flux derivative"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (!newMistakeTitle.trim() || !chapter) return;
                              actions.addMistake({
                                subject: chapter.subject,
                                chapter: chapter.name,
                                topic: newMistakeTitle,
                                subtopic: '',
                                difficulty: 'Medium',
                                source: 'Self-Study',
                                timeTaken: 0,
                                correctMethod: '',
                                studentMethod: newMistakeDesc,
                                mistakeTypes: [newMistakeTag],
                                confidence: 0,
                                revisionSchedule: new Date().toISOString(),
                                masteryImpact: 'Medium',
                                attemptNumber: 1,
                                revisionStatus: 'New',
                                recoveryScore: 0,
                                teacherNotes: '',
                                personalNotes: '',
                                aiAdvice: '',
                                priority: 'Medium',
                                dateLogged: new Date().toISOString(),
                                questionText: newMistakeTitle,
                                correctSolution: ''
                              });
                              setNewMistakeTitle('');
                              setNewMistakeDesc('');
                              setIsAddingMistake(false);
                            }}
                            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Error to Vault</span>
                          </button>
                        </div>
                      )}

                      {chapterMistakes.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/40 text-zinc-400 font-mono text-xs space-y-1">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto opacity-70" />
                          <p className="font-bold text-zinc-300">Clean Vault for {chapter.name}</p>
                          <p className="text-[11px] text-zinc-500">No active mistake notes logged for this chapter.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {chapterMistakes.map(m => (
                            <div key={m.id} className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-850 space-y-1 text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white font-mono">{m.topic || m.questionText}</span>
                                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded-lg">
                                  {m.mistakeTypes.join(', ')}
                                </span>
                              </div>
                              {m.studentMethod && (
                                <p className="text-xs text-zinc-400 font-mono pt-0.5">{m.studentMethod}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'radar' && (
                    <motion.div
                      key="radar"
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-4 font-mono text-xs"
                    >
                      <div className="p-4 rounded-2xl border border-zinc-850/80 bg-zinc-950/60 space-y-3">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Strategy Radar Engine Metrics</span>
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                            <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">Theory Completion</span>
                            <strong className="text-indigo-400 text-base">{telemetry?.strategyRadar.theoryCompletionPercent ?? 0}%</strong>
                          </div>
                          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                            <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">DPP Practice</span>
                            <strong className="text-emerald-400 text-base">{telemetry?.strategyRadar.dppCompletionPercent ?? 0}%</strong>
                          </div>
                          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                            <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">PYQ Completion</span>
                            <strong className="text-purple-400 text-base">{telemetry?.strategyRadar.pyqCompletionPercent ?? 0}%</strong>
                          </div>
                          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                            <span className="text-zinc-400 block text-[10px] uppercase tracking-wider">Retention Score</span>
                            <strong className="text-sky-400 text-base">{telemetry?.strategyRadar.retentionConfidenceScore ?? 70}</strong>
                          </div>
                        </div>
                        <div className="pt-2.5 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
                          <span>JEE Weightage Rank: <strong className="text-amber-400">{telemetry?.strategyRadar.jeeWeightageRank || 'Tier 2'}</strong></span>
                          <span>Bottleneck Severity: <strong className={telemetry?.strategyRadar.bottleneckSeverity === 'Critical' ? 'text-amber-400' : 'text-emerald-400'}>{telemetry?.strategyRadar.bottleneckSeverity || 'None'}</strong></span>
                        </div>
                      </div>

                      {telemetry?.isBottleneck && (
                        <div className="p-4 rounded-2xl border border-amber-900/50 bg-amber-950/30 text-amber-300 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1.5 text-amber-400">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            Active Bottleneck Detected
                          </span>
                          <p className="text-xs text-zinc-300 leading-normal">{telemetry.bottleneckReason}</p>
                        </div>
                      )}
                    </motion.div>
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
              if ('deleteChapter' in actions && typeof (actions as any).deleteChapter === 'function') {
                await (actions as any).deleteChapter(chapter.id);
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
