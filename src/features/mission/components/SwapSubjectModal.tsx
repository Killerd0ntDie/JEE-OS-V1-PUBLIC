import React, { useState } from 'react';
import { X, ArrowRightLeft, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SubjectId, Chapter, TodayMission } from '@/types';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { HoldNotificationModal } from '@/components/shared/HoldNotificationModal';

interface SwapSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: TodayMission | null;
}

export const SwapSubjectModal: React.FC<SwapSubjectModalProps> = ({
  isOpen,
  onClose,
  mission,
}) => {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>(mission?.subject || 'physics');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  
  // Hold Notification state
  const [blockedChapter, setBlockedChapter] = useState<Chapter | null>(null);
  const [blockedHoldType, setBlockedHoldType] = useState<'chapter' | 'dpp' | 'pyq'>('chapter');

  if (!isOpen || !mission) return null;

  const subjectChapters = chapters.filter(c => c.subject === selectedSubject);

  const handleApplySwap = (targetChapter: Chapter) => {
    // Check if target chapter or task type is on hold
    const isTaskDpp = mission.type === 'Solve DPP' || mission.taskName.toLowerCase().includes('dpp');
    const isTaskPyq = mission.type === 'Solve PYQs' || mission.taskName.toLowerCase().includes('pyq');

    if (targetChapter.chapterOnHold) {
      setBlockedChapter(targetChapter);
      setBlockedHoldType('chapter');
      return;
    }

    if (isTaskDpp && targetChapter.dppOnHold) {
      setBlockedChapter(targetChapter);
      setBlockedHoldType('dpp');
      return;
    }

    if (isTaskPyq && targetChapter.pyqOnHold) {
      setBlockedChapter(targetChapter);
      setBlockedHoldType('pyq');
      return;
    }

    // Perform swap directly
    performSwap(targetChapter);
  };

  const performSwap = async (targetChapter: Chapter) => {
    let newTaskName = mission.taskName;
    if (mission.taskName.includes(':')) {
      const prefix = mission.taskName.split(':')[0];
      newTaskName = `${prefix}: ${targetChapter.name}`;
    } else {
      newTaskName = `${mission.type}: ${targetChapter.name}`;
    }

    await actions.updateMissionDetails(mission.id, {
      subject: targetChapter.subject,
      chapter: targetChapter.name,
      chapterId: targetChapter.id,
      chapterName: targetChapter.name,
      taskName: newTaskName,
    });

    onClose();
  };

  const handleRemoveHoldAndProceed = async () => {
    if (!blockedChapter) return;

    const updates: Partial<Chapter> = {};
    if (blockedHoldType === 'chapter') updates.chapterOnHold = false;
    if (blockedHoldType === 'dpp') updates.dppOnHold = false;
    if (blockedHoldType === 'pyq') updates.pyqOnHold = false;

    await actions.updateChapter(blockedChapter.id, updates);
    const updatedChap = { ...blockedChapter, ...updates };
    setBlockedChapter(null);
    performSwap(updatedChap);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div 
          role="dialog"
          aria-modal="true"
          className="relative bg-[#09090b] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl z-50 text-left space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                Today's Subject & Chapter Split
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                Change / Swap Mission Chapter
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Mission Info */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono space-y-1">
            <span className="text-zinc-500 uppercase block text-[9px]">Currently Scheduled Task</span>
            <div className="font-bold text-white flex items-center justify-between">
              <span>{mission.taskName}</span>
              <span className="text-indigo-400 uppercase px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60">
                {mission.subject}
              </span>
            </div>
          </div>

          {/* Subject Picker Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              Select Target Subject
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {(['physics', 'chemistry', 'maths'] as SubjectId[]).map(subj => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(subj);
                    setSelectedChapterId('');
                  }}
                  className={`py-2 px-3 rounded-xl font-bold uppercase transition-all cursor-pointer border ${
                    selectedSubject === subj
                      ? subj === 'physics'
                        ? 'bg-sky-950/80 border-sky-600 text-sky-300'
                        : subj === 'chemistry'
                        ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                        : 'bg-purple-950/80 border-purple-600 text-purple-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {/* Chapter Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span>Select Replacement Chapter</span>
              <span className="text-zinc-500 font-normal text-[10px]">{subjectChapters.length} chapters available</span>
            </label>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar">
              {subjectChapters.map(chap => {
                const isOnHold = chap.chapterOnHold || chap.dppOnHold || chap.pyqOnHold;
                return (
                  <button
                    key={chap.id}
                    type="button"
                    onClick={() => handleApplySwap(chap)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between font-mono text-xs transition-all cursor-pointer ${
                      isOnHold
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-300 hover:bg-amber-950/40'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:border-indigo-500/60 hover:bg-zinc-850'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>{chap.name}</span>
                        {isOnHold && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold uppercase">
                            {chap.chapterOnHold ? 'CHAPTER HOLD' : 'ON HOLD'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500">{chap.unit || 'Core Module'} • {chap.completion}% Done</span>
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-zinc-500 hover:text-indigo-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Hold Notification Guard Modal */}
      {blockedChapter && (
        <HoldNotificationModal
          isOpen={!!blockedChapter}
          onClose={() => setBlockedChapter(null)}
          chapter={blockedChapter}
          holdType={blockedHoldType}
          onRemoveHoldAndProceed={handleRemoveHoldAndProceed}
        />
      )}
    </ModalPortal>
  );
};
