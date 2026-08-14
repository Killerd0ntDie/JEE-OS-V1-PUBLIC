import React, { useState } from 'react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { getSubjectTheme } from '@/constants/subjectTheme';
import { SubjectId, Chapter, SyllabusDiagnosisStage } from '@/types/index';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Modal } from '@/components/ui/Modal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { 
  BookOpen, Video, FileCheck2, RotateCcw, Sparkles, X, Check, Search, AlertCircle, SlidersHorizontal
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SyllabusDiagnosisModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters);
  const [activeSubject, setActiveSubject] = useState<SubjectId>('physics');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeKey(onClose, isOpen);

  const subjectChapters = chapters.filter(c => 
    c.subject === activeSubject && 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChapter = chapters.find(c => c.id === selectedChapterId) || subjectChapters[0];

  // Local editing state for selected chapter
  const stageOptions: SyllabusDiagnosisStage[] = [
    'Not Started',
    'Watching Lectures',
    'Making Notes',
    'Doing Questions',
    'Revision',
    'Mastered',
    'Unknown'
  ];

  const handleUpdateStage = (chapId: string, stage: SyllabusDiagnosisStage) => {
    let completion = 0;
    if (stage === 'Mastered') completion = 100;
    else if (stage === 'Revision') completion = 85;
    else if (stage === 'Doing Questions') completion = 65;
    else if (stage === 'Making Notes') completion = 45;
    else if (stage === 'Watching Lectures') completion = 25;
    else if (stage === 'Not Started') completion = 0;
    else completion = 10;

    const mappedStatus = stage === 'Mastered' ? 'Mastered' 
      : stage === 'Revision' ? 'Revision Due' 
      : stage === 'Not Started' ? 'Not Started' 
      : 'Learning';

    actions.updateChapter(chapId, {
      syllabusStage: stage,
      status: mappedStatus,
      completion,
      theoryComplete: ['Making Notes', 'Doing Questions', 'Revision', 'Mastered'].includes(stage),
      dppComplete: ['Doing Questions', 'Revision', 'Mastered'].includes(stage),
      pyqsComplete: ['Revision', 'Mastered'].includes(stage)
    });
  };

  const handleUpdateLectureProgress = (
    chapId: string,
    field: 'teacher' | 'lectureSeries' | 'totalLectures' | 'completedLectures' | 'avgLectureDurationMinutes',
    value: any
  ) => {
    const chap = chapters.find(c => c.id === chapId);
    if (!chap) return;

    const existingLect = chap.lectureProgress || {
      teacher: 'Physics Galaxy',
      lectureSeries: 'JEE Advanced Masterclass',
      totalLectures: chap.totalLectures || 15,
      completedLectures: chap.currentLecture || 0,
      avgLectureDurationMinutes: 75
    };

    const updatedLect = {
      ...existingLect,
      [field]: value
    };

    const remainingLectures = Math.max(0, updatedLect.totalLectures - updatedLect.completedLectures);
    const estimatedRemainingHours = Math.round((remainingLectures * updatedLect.avgLectureDurationMinutes) / 60 * 10) / 10;
    updatedLect.estimatedRemainingHours = estimatedRemainingHours;

    actions.updateChapter(chapId, {
      currentLecture: updatedLect.completedLectures,
      totalLectures: updatedLect.totalLectures,
      estimatedRemainingTime: estimatedRemainingHours,
      lectureProgress: updatedLect
    });
  };

  const handleUpdatePracticeProgress = (
    chapId: string,
    field: 'dppCompleted' | 'pyqsCompleted' | 'moduleCompleted' | 'accuracyPercent' | 'confidencePercent',
    value: any
  ) => {
    const chap = chapters.find(c => c.id === chapId);
    if (!chap) return;

    const existingPrac = chap.practiceProgress || {
      dppCompleted: chap.dppComplete || false,
      pyqsCompleted: chap.pyqsComplete || false,
      moduleCompleted: false,
      mockTestsAttempted: 1,
      accuracyPercent: chap.confidence || 70,
      confidencePercent: chap.confidence || 70,
      weakTopics: []
    };

    const updatedPrac = {
      ...existingPrac,
      [field]: value
    };

    actions.updateChapter(chapId, {
      confidence: updatedPrac.confidencePercent,
      dppComplete: updatedPrac.dppCompleted === true,
      pyqsComplete: updatedPrac.pyqsCompleted === true,
      practiceProgress: updatedPrac
    });
  };

  const handleUpdateRevisionState = (
    chapId: string,
    field: 'lastRevisedDaysAgo' | 'retentionConfidence' | 'formulaMemoryPercent' | 'questionSolvingConfidencePercent' | 'needRevision',
    value: any
  ) => {
    const chap = chapters.find(c => c.id === chapId);
    if (!chap) return;

    const existingRev = chap.revisionProgress || {
      lastRevisedDaysAgo: chap.lastRevisionDaysAgo || 14,
      retentionConfidence: 'Medium',
      formulaMemoryPercent: 75,
      questionSolvingConfidencePercent: 70,
      needRevision: false
    };

    const updatedRev = {
      ...existingRev,
      [field]: value
    };

    actions.updateChapter(chapId, {
      lastRevisionDaysAgo: updatedRev.lastRevisedDaysAgo,
      revisionProgress: updatedRev
    });
  };

  return (
    
    <Modal isOpen={isOpen} onClose={onClose} zIndex={50} backdropClassName="p-4 bg-black/35 backdrop-blur-sm animate-fade-in overflow-y-auto" className="relative w-full max-w-5xl bg-[#0a0b0e] border border-indigo-900/50 rounded-2xl shadow-2xl overflow-hidden my-6 text-left">
        
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-950/30 border-b border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                SYLLABUS DIAGNOSIS ENGINE — ZERO ASSUMPTIONS
              </span>
              <h2 id="syllabus-diagnosis-modal-title" className="text-sm font-display font-bold text-white">
                Detailed Chapter Reality & Remaining Work Calculator
              </h2>
            </div>
          </div>

          <button 
            onClick={onClose}
            aria-label="Close Diagnosis Engine Modal"
            className="text-zinc-400 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subject Switcher & Search Bar */}
        <div className="px-6 py-3 bg-[#08080a] border-b border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            {(['physics', 'chemistry', 'maths'] as const).map(subj => (
              <button
                key={subj}
                onClick={() => { setActiveSubject(subj); setSelectedChapterId(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-mono uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  activeSubject === subj
                    ? getSubjectTheme(subj).badge
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chapters..."
              className="w-full bg-[#121318] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Modal Content: Split Master-Detail */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[70vh] overflow-y-auto">
          
          {/* Left Column: Chapter List (4 cols) */}
          <div className="lg:col-span-5 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider pb-1">
              {subjectChapters.length} Chapters in {activeSubject.toUpperCase()}
            </div>

            {subjectChapters.map(chap => {
              const isSelected = selectedChapter?.id === chap.id;
              const currentStage = chap.syllabusStage || (chap.completion >= 100 ? 'Mastered' : chap.completion > 0 ? 'Watching Lectures' : 'Not Started');

              return (
                <button
                  key={chap.id}
                  onClick={() => setSelectedChapterId(chap.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500/80 bg-indigo-950/40 shadow-lg'
                      : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">{chap.name}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 shrink-0">
                      {currentStage}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1">
                    <span>{chap.unit}</span>
                    <span>Lectures: {chap.currentLecture}/{chap.totalLectures}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Diagnostic Form (7 cols) */}
          {selectedChapter ? (
            <div className="lg:col-span-7 space-y-5 bg-[#0e0f14] p-5 rounded-2xl border border-zinc-800/80">
              
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider font-bold block">
                    {selectedChapter.subject.toUpperCase()} • {selectedChapter.unit}
                  </span>
                  <h3 className="text-base font-display font-bold text-white">{selectedChapter.name}</h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    actions.openChapterEditModal(selectedChapter.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 text-indigo-300 font-mono text-2xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Full Telemetry Editor
                </button>
              </div>

              {/* 1. Stage Selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">Syllabus Diagnosis Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {stageOptions.map(stg => {
                    const active = (selectedChapter.syllabusStage || (selectedChapter.completion >= 100 ? 'Mastered' : selectedChapter.completion > 0 ? 'Watching Lectures' : 'Not Started')) === stg;
                    return (
                      <button
                        key={stg}
                        type="button"
                        onClick={() => handleUpdateStage(selectedChapter.id, stg)}
                        className={`px-2.5 py-1.5 rounded-lg text-2xs font-mono transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white font-bold border border-indigo-400'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {stg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Lecture Progress Section */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400">
                  <Video className="w-3.5 h-3.5" />
                  Lecture Progress Audit
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Teacher / Platform</label>
                    <input
                      type="text"
                      value={selectedChapter.lectureProgress?.teacher || 'Physics Galaxy / PW'}
                      onChange={(e) => handleUpdateLectureProgress(selectedChapter.id, 'teacher', e.target.value)}
                      className="w-full bg-[#121318] border border-zinc-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Total Lectures</label>
                    <input
                      type="number"
                      value={selectedChapter.lectureProgress?.totalLectures || selectedChapter.totalLectures || 18}
                      onChange={(e) => handleUpdateLectureProgress(selectedChapter.id, 'totalLectures', parseInt(e.target.value) || 1)}
                      className="w-full bg-[#121318] border border-zinc-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Completed Lectures</label>
                    <input
                      type="number"
                      value={selectedChapter.lectureProgress?.completedLectures || selectedChapter.currentLecture || 0}
                      onChange={(e) => handleUpdateLectureProgress(selectedChapter.id, 'completedLectures', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#121318] border border-zinc-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Avg Lecture Duration (mins)</label>
                    <input
                      type="number"
                      value={selectedChapter.lectureProgress?.avgLectureDurationMinutes || 75}
                      onChange={(e) => handleUpdateLectureProgress(selectedChapter.id, 'avgLectureDurationMinutes', parseInt(e.target.value) || 75)}
                      className="w-full bg-[#121318] border border-zinc-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="p-2 rounded bg-sky-950/20 border border-sky-900/40 text-[10px] font-mono text-sky-300 flex items-center justify-between">
                  <span>Calculated Remaining Lecture Hours:</span>
                  <span className="font-bold text-xs">{selectedChapter.estimatedRemainingTime || 0} hrs</span>
                </div>
              </div>

              {/* 3. Practice Progress Section */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Practice & Problem Solving Progress
                </div>

                <div className="grid grid-cols-3 gap-2 text-2xs font-mono">
                  <button
                    onClick={() => handleUpdatePracticeProgress(selectedChapter.id, 'dppCompleted', !selectedChapter.practiceProgress?.dppCompleted)}
                    className={`p-2 rounded border text-center cursor-pointer ${
                      selectedChapter.practiceProgress?.dppCompleted ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300 font-bold' : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    DPP: {selectedChapter.practiceProgress?.dppCompleted ? 'Completed ✓' : 'Pending'}
                  </button>

                  <button
                    onClick={() => handleUpdatePracticeProgress(selectedChapter.id, 'pyqsCompleted', !selectedChapter.practiceProgress?.pyqsCompleted)}
                    className={`p-2 rounded border text-center cursor-pointer ${
                      selectedChapter.practiceProgress?.pyqsCompleted ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300 font-bold' : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    PYQs: {selectedChapter.practiceProgress?.pyqsCompleted ? 'Completed ✓' : 'Pending'}
                  </button>

                  <button
                    onClick={() => handleUpdatePracticeProgress(selectedChapter.id, 'moduleCompleted', !selectedChapter.practiceProgress?.moduleCompleted)}
                    className={`p-2 rounded border text-center cursor-pointer ${
                      selectedChapter.practiceProgress?.moduleCompleted ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300 font-bold' : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    Module: {selectedChapter.practiceProgress?.moduleCompleted ? 'Completed ✓' : 'Pending'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>Practice Accuracy %</span>
                      <span className="font-bold text-emerald-400">{selectedChapter.practiceProgress?.accuracyPercent || 70}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={selectedChapter.practiceProgress?.accuracyPercent || 70}
                      onChange={(e) => handleUpdatePracticeProgress(selectedChapter.id, 'accuracyPercent', parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>Solving Confidence %</span>
                      <span className="font-bold text-indigo-400">{selectedChapter.practiceProgress?.confidencePercent || 70}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={selectedChapter.practiceProgress?.confidencePercent || 70}
                      onChange={(e) => handleUpdatePracticeProgress(selectedChapter.id, 'confidencePercent', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Revision State */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Revision & Retention Memory
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block">Last Revised (Days Ago)</label>
                    <input
                      type="number"
                      value={selectedChapter.revisionProgress?.lastRevisedDaysAgo || selectedChapter.lastRevisionDaysAgo || 7}
                      onChange={(e) => handleUpdateRevisionState(selectedChapter.id, 'lastRevisedDaysAgo', parseInt(e.target.value) || 0)}
                      className="w-full bg-[#121318] border border-zinc-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                    />
                  </div>

                  <div className="relative z-20">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Retention Confidence</label>
                    <CustomSelect
                      size="sm"
                      value={selectedChapter.revisionProgress?.retentionConfidence || 'Medium'}
                      onChange={(val) => handleUpdateRevisionState(selectedChapter.id, 'retentionConfidence', String(val))}
                      options={[
                        { value: 'High', label: 'High Retention' },
                        { value: 'Medium', label: 'Medium Retention' },
                        { value: 'Low', label: 'Fading / Low' },
                      ]}
                    />
                  </div>
                </div>
              </div>

            </div>
          ) : null}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#08080a] border-t border-zinc-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer"
          >
            Save Diagnosis & Sync Planner
          </button>
        </div>

      </Modal>
    
  );
};
