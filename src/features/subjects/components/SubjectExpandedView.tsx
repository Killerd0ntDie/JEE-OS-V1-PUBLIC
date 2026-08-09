import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { Chapter } from '@/types/index';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, CheckCircle, SlidersHorizontal, CheckSquare, Zap, BookOpen, Save, Sparkles } from 'lucide-react';

interface SubjectExpandedViewProps {
  chapterId: string;
  onClose: () => void;
}

export function SubjectExpandedView({ chapterId, onClose }: SubjectExpandedViewProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const chaptersWithData = useStudyBrainStore(state => state.chaptersWithData);
  const mistakes = useStudyBrainStore(state => state.mistakes);

  const chapterDataObj = chaptersWithData.find(c => c.chapter.id === chapterId);
  const chapter = chapterDataObj?.chapter;
  const data = chapterDataObj?.data;
  const chapterMistakes = mistakes.filter(m => m.chapter === chapter?.name && m.revisionStatus !== 'Mastered');

  const [activeTab, setActiveTab] = useState<'overview' | 'mistakes'>('overview');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [newMistakeTitle, setNewMistakeTitle] = useState('');
  const [newMistakeDesc, setNewMistakeDesc] = useState('');
  const [newMistakeTag, setNewMistakeTag] = useState('Calculation');
  const [isAddingMistake, setIsAddingMistake] = useState(false);

  if (!chapter || !data) return null;

  const handleAddMistake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMistakeTitle.trim()) return;
    
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
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative text-left">
      {/* Toast Notification */}
      {showSavedToast && (
        <div className="absolute top-4 right-4 z-50 bg-emerald-600 text-white font-mono text-xs font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4" />
          Chapter Telemetry Saved Successfully!
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors border border-zinc-800 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-3xs uppercase tracking-wider font-mono text-zinc-400 border-zinc-800 bg-zinc-900">
                {chapter.unit}
              </Badge>
              <Badge className={`text-3xs uppercase tracking-wider font-mono ${data.masteryTier.bgClass} ${data.masteryTier.textClass}`}>
                {data.masteryTier.name} • {data.mastery}%
              </Badge>
            </div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">{chapter.name}</h2>
          </div>
        </div>
        
        <button
          onClick={() => actions.toggleChapterStatus(chapter.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
            chapter.completion === 100
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/50 hover:bg-emerald-900/50'
              : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-750'
          }`}
        >
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {chapter.completion === 100 ? 'Mark Incomplete' : 'Mark Complete'}
        </button>
      </div>

      {/* Action Bar Tabs */}
      <div className="px-5 py-3 border-b border-zinc-900 bg-zinc-950 flex gap-2">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          TELEMETRY & CALIBRATION
        </button>
        <button 
          onClick={() => setActiveTab('mistakes')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'mistakes' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          MISTAKES LEDGER
          {chapterMistakes.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${activeTab === 'mistakes' ? 'bg-indigo-500 text-white' : 'bg-red-950 text-red-400 border border-red-900/50'}`}>
              {chapterMistakes.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 space-y-1">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Time Remaining</div>
                <div className="text-xl font-display font-bold text-zinc-200">{data.estimatedRemainingTime} <span className="text-xs font-mono text-zinc-400">hrs</span></div>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 space-y-1">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Solved Qs</div>
                <div className="text-xl font-display font-bold text-zinc-200">{chapter.solvedQuestions}</div>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 space-y-1">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Weightage</div>
                <div className="text-xl font-display font-bold text-zinc-200">{data.weightage}%</div>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 space-y-1">
                <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Difficulty</div>
                <div className="text-xl font-display font-bold text-zinc-200">{data.difficulty}</div>
              </div>
            </div>

            {/* REPLACED INLINE FORM WITH UNIVERSAL CHAPTER EDIT MODAL TRIGGER */}
            <div className="p-5 md:p-6 rounded-2xl border border-indigo-500/30 bg-zinc-900/40 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-display font-bold text-white tracking-tight uppercase">
                    Chapter Telemetry & Lecture Calibration
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 max-w-md">
                  Configure lectures, theory, practice DPPs/PYQs, priority tier, and strategy metrics via the universal telemetry editor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => actions.openChapterEditModal(chapter.id)}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Calibrate Chapter Telemetry
              </button>
            </div>

            {/* Checklists & Core Progression */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Task Checklist */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-400" /> Core Progression Summary
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
                    <span className="text-zinc-300">Theory & Video Lectures</span>
                    <span className={chapter.theoryComplete ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                      {chapter.theoryComplete ? 'Completed ✓' : 'In Progress'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
                    <span className="text-zinc-300">DPP (Daily Practice Problems)</span>
                    <span className={chapter.dppComplete ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                      {chapter.dppComplete ? 'Completed ✓' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
                    <span className="text-zinc-300">PYQs (Previous Year Questions)</span>
                    <span className={chapter.pyqsComplete ? 'text-purple-400 font-bold' : 'text-zinc-400'}>
                      {chapter.pyqsComplete ? '25+ Solved ✓' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Revision Log */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-mono uppercase text-zinc-400 font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Spaced Revision Log
                </h3>
                <div className="space-y-3 font-mono text-xs">
                  {[
                    { label: '1st Review (3 days)', done: chapter.revisionCount >= 1 },
                    { label: '2nd Review (7 days)', done: chapter.revisionCount >= 2 },
                    { label: '3rd Review (14 days)', done: chapter.revisionCount >= 3 }
                  ].map((rev, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850">
                      <span className="text-zinc-300">{rev.label}</span>
                      <span className={rev.done ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                        {rev.done ? 'Logged ✓' : 'Upcoming'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === 'mistakes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-white">Mistakes Ledger</h3>
              <button
                onClick={() => setIsAddingMistake(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                Log New Error
              </button>
            </div>

            {/* Mistakes List */}
            {chapterMistakes.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-850 rounded-2xl text-zinc-400 font-mono text-xs">
                No active errors logged for {chapter.name}.
              </div>
            ) : (
              <div className="space-y-3">
                {chapterMistakes.map(m => (
                  <div key={m.id} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-850 space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-display">{m.topic || m.questionText}</span>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 border border-rose-900/50 px-2 py-0.5 rounded-md">
                        {m.mistakeTypes.join(', ')}
                      </span>
                    </div>
                    {m.studentMethod && (
                      <p className="text-xs text-zinc-400 font-mono pt-1">{m.studentMethod}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
