import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, CheckCircle2, Clock, BookOpen, Layers, Flame, Award,
  AlertCircle, SlidersHorizontal, Calendar, FileText, Target, Activity, Check
} from 'lucide-react';
import { Chapter, SubjectId, SyllabusDiagnosisStage } from '../../types/index';
import { useStudyBrain } from '../../context/StudyBrainContext';
import { ChapterTelemetry } from '../../engines/chapterInfo';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { ModalPortal } from '../ui/ModalPortal';

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
  const { state, actions } = useStudyBrain();

  const effectiveIsOpen = isOpen !== undefined ? isOpen : !!state.activeEditChapterId;
  const effectiveChapterId = chapterId !== undefined ? chapterId : state.activeEditChapterId;
  const handleClose = onClose || (() => actions.closeChapterEditModal());

  const chapter: Chapter | undefined = state.chapters.find(c => c.id === effectiveChapterId || c.name === effectiveChapterId);
  const telemetry: ChapterTelemetry | undefined = effectiveChapterId && state.chapterTelemetryMap ? state.chapterTelemetryMap[effectiveChapterId] : undefined;

  const [activeTab, setActiveTab] = useState<'progress' | 'practice' | 'meta' | 'radar'>(defaultTab);

  // Form states
  const [currentLecture, setCurrentLecture] = useState<number>(0);
  const [totalLectures, setTotalLectures] = useState<number>(0);
  const [theoryComplete, setTheoryComplete] = useState<boolean>(false);
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

  // Global ESC listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    if (chapter) {
      setCurrentLecture(chapter.currentLecture || 0);
      setTotalLectures(chapter.totalLectures || 0);
      setTheoryComplete(!!chapter.theoryComplete);
      setTeacher(chapter.lectureProgress?.teacher || '');
      setAvgLectureDuration(chapter.lectureProgress?.avgLectureDurationMinutes || 0);

      setCompletedDpp(chapter.practiceProgress?.dppPercent ? Math.round((chapter.practiceProgress.dppPercent / 100) * (totalDpp || 10)) : (chapter.dppComplete ? (totalDpp || 10) : 0));
      setTotalDpp(0);
      setCompletedPyq(chapter.practiceProgress?.pyqPercent ? Math.round((chapter.practiceProgress.pyqPercent / 100) * (totalPyq || 30)) : (chapter.pyqsComplete ? (totalPyq || 30) : 0));
      setTotalPyq(0);
      setConfidence(chapter.confidence || 70);

      setDifficulty(chapter.difficulty || 'Medium');
      setPriority(chapter.priority || 2);
      setWeightage(telemetry?.weightagePercent ?? chapter.weightage ?? 4.5);
      setNotes(''); // Reset notes as the field doesn't exist
      setSerialNumber(chapter.serialNumber ? chapter.serialNumber.replace(/\D/g, '').padStart(2, '0') : '');
      setDppOnHold(!!chapter.dppOnHold);
      setPyqOnHold(!!chapter.pyqOnHold);
      setChapterOnHold(!!chapter.chapterOnHold);
    }
  }, [chapter, telemetry]);

  const estimatedHours = Math.round(((Math.max(0, totalLectures - currentLecture)) * (avgLectureDuration || 0)) / 60);

  useLockBodyScroll(effectiveIsOpen);

  if (!effectiveIsOpen || !chapter) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const duplicateChapter = state.chapters.find(
        c => c.serialNumber === newSerialNumber && c.id !== chapter.id && c.subject === chapter.subject
      );
      if (duplicateChapter) {
        alert(`Serial number ${newSerialNumber} is already used by "${duplicateChapter.name}". Please use a different number.`);
        return;
      }

      // Check if serial number exceeds max allowed (highest in subject + 1)
      const subjectChapters = state.chapters.filter(c => c.subject === chapter.subject);
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

    await actions.updateChapter(chapter.id, updatedFields);

    setIsSaving(false);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      handleClose();
    }, 500);
  };

  const subjectColorClass = chapter.subject === 'physics' 
    ? 'text-sky-400 bg-sky-950/40 border-sky-800/80' 
    : chapter.subject === 'chemistry' 
    ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80' 
    : 'text-purple-400 bg-purple-950/40 border-purple-800/80';

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto" aria-label="Chapter Edit Modal">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-modal-title"
        className="relative bg-[#09090b] border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl z-50 text-left my-4 flex flex-col"
      >
        
        {/* Toast */}
        {showSuccessToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-mono font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Chapter Telemetry Updated via ChapterInfoEngine!
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-mono font-bold uppercase rounded border ${subjectColorClass}`}>
                {chapter.subject.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-zinc-500 uppercase">{chapter.unit || 'Core Module'}</span>
            </div>
            <h2 id="chapter-modal-title" className="text-lg font-bold text-white tracking-tight">{chapter.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChapterOnHold(!chapterOnHold)}
              className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                chapterOnHold
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {chapterOnHold ? 'CHAPTER ON HOLD' : 'Put Chapter on Hold'}
            </button>
            <button
              onClick={handleClose}
              aria-label="Close modal"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Telemetry Overview Card */}
        <div className="p-4 bg-zinc-900/60 border-b border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs text-left">
          <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
            <span className="text-xs text-zinc-500 block uppercase">Mastery Score</span>
            <span className="text-sm font-bold text-indigo-400">{telemetry?.masteryScore ?? chapter.completion ?? 0}%</span>
          </div>
          <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
            <span className="text-xs text-zinc-500 block uppercase">JEE Weightage</span>
            <span className="text-sm font-bold text-purple-400">{telemetry?.weightagePercent ?? chapter.weightage ?? 4.5}%</span>
          </div>
          <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
            <span className="text-xs text-zinc-500 block uppercase">Retention</span>
            <span className="text-xs font-bold text-sky-400">{telemetry?.retentionConfidence || 'High'}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
            <span className="text-xs text-zinc-500 block uppercase">Bottleneck</span>
            <span className={`text-xs font-bold ${telemetry?.isBottleneck ? 'text-amber-400' : 'text-emerald-400'}`}>
              {telemetry?.isBottleneck ? 'Active' : 'Clear'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 border-b border-zinc-900 bg-zinc-950 flex gap-2 font-mono text-xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'progress' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Lectures & Theory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'practice' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Practice & PYQs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'meta' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Metadata & Priority
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'radar' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Strategy Radar
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-left flex-1 overflow-y-auto scrollbar">
          
          {activeTab === 'progress' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Lectures Progress
                </label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <span className="text-[11px] text-zinc-500 block mb-1 font-mono">Watched Lectures</span>
                    <input
                      type="number"
                      min="0"
                      max={totalLectures}
                      value={currentLecture}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setCurrentLecture(Math.max(0, Math.min(totalLectures, val)));
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block mb-1 font-mono">Total Chapter Lectures</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={totalLectures}
                      onChange={(e) => setTotalLectures(parseInt(e.target.value) || 1)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <span className="text-[11px] text-zinc-500 block mb-1 font-mono">Teacher / Coaching Batch</span>
                  <input
                    type="text"
                    placeholder="e.g. Physics Galaxy, PW, Allen"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block mb-1 font-mono">Avg Duration (mins)</span>
                  <input
                    type="number"
                    value={avgLectureDuration}
                    onChange={(e) => setAvgLectureDuration(parseInt(e.target.value) || 60)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 cursor-pointer hover:border-zinc-700 transition-all">
                <input
                  type="checkbox"
                  checked={theoryComplete}
                  onChange={(e) => setTheoryComplete(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-200 font-medium">Theory / All Lectures Completed</span>
              </label>
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">DPP Practice</span>
                    <button
                      type="button"
                      onClick={() => setDppOnHold(!dppOnHold)}
                      className={`text-[9px] font-mono font-bold px-2 py-1 rounded-full border transition-colors cursor-pointer ${
                        dppOnHold
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {dppOnHold ? 'ON HOLD' : 'Put on Hold'}
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">Problem Sets & Daily Practice</span>
                  {dppOnHold && (
                    <p className="text-[9px] font-mono text-amber-400/90 -mt-1">
                      DPPs won't be scheduled for this chapter until you turn this off.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[10px]">
                    <div>
                      <span className="text-zinc-500 block mb-1">Solved Sets</span>
                      <input
                        type="number"
                        min="0"
                        max={totalDpp}
                        value={completedDpp}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setCompletedDpp(Math.max(0, Math.min(totalDpp, val)));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-1">Total Sets</span>
                      <input
                        type="number"
                        min="1"
                        value={totalDpp}
                        onChange={(e) => setTotalDpp(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] text-zinc-500 italic">
                    * Recommended: {Math.max(5, Math.round((totalLectures || 10) * 0.8))} sets for completion.
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-purple-400">JEE PYQs</span>
                    <button
                      type="button"
                      onClick={() => setPyqOnHold(!pyqOnHold)}
                      className={`text-[9px] font-mono font-bold px-2 py-1 rounded-full border transition-colors cursor-pointer ${
                        pyqOnHold
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {pyqOnHold ? 'ON HOLD' : 'Put on Hold'}
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">Past Years Questions Drill</span>
                  {pyqOnHold && (
                    <p className="text-[9px] font-mono text-amber-400/90 -mt-1">
                      PYQs won't be scheduled for this chapter until you turn this off.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[10px]">
                    <div>
                      <span className="text-zinc-500 block mb-1">Solved PYQs</span>
                      <input
                        type="number"
                        min="0"
                        max={totalPyq}
                        value={completedPyq}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setCompletedPyq(Math.max(0, Math.min(totalPyq, val)));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-1">Total PYQs</span>
                      <input
                        type="number"
                        min="1"
                        value={totalPyq}
                        onChange={(e) => setTotalPyq(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] text-zinc-500 italic">
                    * Recommended: ~50-80 PYQs per chapter.
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider">Confidence Score Rating</span>
                  <span className="text-indigo-400 font-bold bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/30">{confidence}%</span>
                </div>
                <div className="relative pt-2">
                  <div className="absolute top-1/2 left-0 w-full h-1.5 bg-zinc-800 rounded-full -translate-y-1/2"></div>
                  <div 
                    className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full -translate-y-1/2 transition-all duration-150"
                    style={{ width: `${confidence}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidence}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setConfidence(Math.max(0, Math.min(100, val)));
                    }}
                    className="absolute top-1/2 left-0 w-full h-6 -translate-y-1/2 opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)] border-2 border-indigo-500 -translate-y-1/2 -ml-2 pointer-events-none transition-all duration-150"
                    style={{ left: `${confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
                <div>
                  <label className="block mb-1 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">JEE Weightage %</label>
                  <input
                    type="number"
                    value={weightage}
                    readOnly
                    className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3 py-2 text-zinc-500 cursor-not-allowed"
                  />
                  <span className="text-[9px] text-zinc-600 italic mt-1 block">* System defined</span>
                </div>
                <div>
                  <label className="block mb-1 text-zinc-400 uppercase text-[10px]">Priority Tier</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={1}>Tier 1 (High Priority)</option>
                    <option value={2}>Tier 2 (Medium Priority)</option>
                    <option value={3}>Tier 3 (Low Priority)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-mono text-zinc-400 uppercase text-[10px]">Serial Number (for custom sorting)</label>
                <input
                  type="number"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. 22"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[9px] text-zinc-600 italic mt-1 block">* Optional: Enter a number (will be prefixed with CH)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
                <div>
                  <label className="block mb-1 text-zinc-400 uppercase text-[10px]">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">Est. Theory Remaining</label>
                  <input
                    type="number"
                    value={estimatedHours}
                    readOnly
                    className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3.5 py-2 text-zinc-500 cursor-not-allowed"
                  />
                  <span className="text-[9px] text-zinc-600 italic mt-1 block">* Auto-calculated (Lectures only)</span>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-mono text-zinc-400 uppercase text-[10px]">Chapter Notes & Weak Points</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key concepts to revise, formula pitfalls, weak sub-topics..."
                  className="w-full min-h-[80px] bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Strategy Radar Engine Metrics</span>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[9px] uppercase">Theory Completion</span>
                    <strong className="text-indigo-400 text-sm">{telemetry?.strategyRadar.theoryCompletionPercent ?? 0}%</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[9px] uppercase">DPP Practice</span>
                    <strong className="text-emerald-400 text-sm">{telemetry?.strategyRadar.dppCompletionPercent ?? 0}%</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[9px] uppercase">PYQ Completion</span>
                    <strong className="text-purple-400 text-sm">{telemetry?.strategyRadar.pyqCompletionPercent ?? 0}%</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[9px] uppercase">Retention Score</span>
                    <strong className="text-sky-400 text-sm">{telemetry?.strategyRadar.retentionConfidenceScore ?? 70}</strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-2xs text-zinc-400">
                  <span>JEE Weightage Rank: <strong className="text-amber-400">{telemetry?.strategyRadar.jeeWeightageRank || 'Tier 2'}</strong></span>
                  <span>Bottleneck Severity: <strong className={telemetry?.strategyRadar.bottleneckSeverity === 'Critical' ? 'text-amber-400' : 'text-emerald-400'}>{telemetry?.strategyRadar.bottleneckSeverity || 'None'}</strong></span>
                </div>
              </div>

              {telemetry?.isBottleneck && (
                <div className="p-3 rounded-xl border border-amber-900/40 bg-amber-950/20 text-amber-300 space-y-1">
                  <span className="text-[10px] font-bold uppercase block flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Active Bottleneck Detected
                  </span>
                  <p className="text-[11px] text-zinc-300">{telemetry.bottleneckReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2.5 rounded-xl bg-red-950/30 hover:bg-red-950/50 border border-red-800/50 text-red-400 font-mono text-xs font-bold cursor-pointer transition-colors"
              >
                Delete Chapter
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Telemetry'}
            </button>
          </div>

        </form>
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    <AnimatePresence>
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="glass-card border border-red-900/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">Delete Chapter</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Are you sure you want to delete "{chapter.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  try {
                    await actions.deleteChapter(chapter.id);
                    handleClose();
                  } catch (err) {
                    alert('Failed to delete chapter: ' + (err as Error).message);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold cursor-pointer transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
};
