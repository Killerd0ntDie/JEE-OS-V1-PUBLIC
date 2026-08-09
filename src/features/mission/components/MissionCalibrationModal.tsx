import React, { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Sparkles } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export interface MissionCalibrationModalProps {
  isCalibrating: boolean;
  activeChap: any;
  isCompletedChapter: boolean;
  targetPyqInput: number;
  setTargetPyqInput: (val: number) => void;
  revisionStageInput: string;
  setRevisionStageInput: (val: string) => void;
  targetAccuracyInput: number;
  setTargetAccuracyInput: (val: number) => void;
  currentLecInput: number | string;
  setCurrentLecInput: (val: number | string) => void;
  totalLecInput: number | string;
  setTotalLecInput: (val: number | string) => void;
  avgDurationInput: number;
  setAvgDurationInput: (val: number) => void;
  dppDoneInput: boolean | 'partial';
  setDppDoneInput: (val: boolean | 'partial') => void;
  pyqsDoneInput: boolean;
  setPyqsDoneInput: (val: boolean) => void;
  handleConfirmCalibration: () => void;
}

export function MissionCalibrationModal({
  isCalibrating,
  activeChap,
  isCompletedChapter,
  targetPyqInput,
  setTargetPyqInput,
  revisionStageInput,
  setRevisionStageInput,
  targetAccuracyInput,
  setTargetAccuracyInput,
  currentLecInput,
  setCurrentLecInput,
  totalLecInput,
  setTotalLecInput,
  avgDurationInput,
  setAvgDurationInput,
  dppDoneInput,
  setDppDoneInput,
  pyqsDoneInput,
  setPyqsDoneInput,
  handleConfirmCalibration
}: MissionCalibrationModalProps) {
  useLockBodyScroll(true);

  useEffect(() => {
    if (isCalibrating && activeChap) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCalibrating, activeChap]);

    return (
    <Modal isOpen={isCalibrating && !!activeChap} onClose={() => {}} className="relative w-full max-w-md bg-[#090a0f] border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_80px_rgba(79,70,229,0.25)] text-left max-h-[90dvh] overflow-y-auto">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-[10px] uppercase font-bold tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 w-fit">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            {isCompletedChapter ? 'Theory Complete • Revision Calibration' : 'Pre-Flight Mission Calibration'}
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">
            Calibrate {activeChap.name}
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {isCompletedChapter 
              ? 'Set target PYQ volume and accuracy goals for this completed module.'
              : 'Setup lecture progress in 15 seconds before starting the cockpit timer.'}
          </p>
        </div>

        {isCompletedChapter ? (
          /* COMPLETED CHAPTER: PRACTICE & REVISION CALIBRATION */
          <div className="space-y-5">
            {/* Target PYQs */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Target PYQ Volume</label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 25, 40, 50].map(qs => (
                  <button
                    key={qs}
                    type="button"
                    onClick={() => setTargetPyqInput(qs)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      targetPyqInput === qs
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {qs} Qs
                  </button>
                ))}
              </div>
            </div>

            {/* Revision Stage */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Revision Focus Deck</label>
              <div className="grid grid-cols-3 gap-2">
                {['Formula Refresh', 'Solve PYQs', 'Recall Quiz'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setRevisionStageInput(st)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      revisionStageInput === st
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Accuracy */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Target Accuracy Goal</label>
              <div className="grid grid-cols-3 gap-2">
                {[75, 85, 95].map(acc => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => setTargetAccuracyInput(acc)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      targetAccuracyInput === acc
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {acc}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* IN-PROGRESS / UNSTARTED CHAPTER: LECTURE & CORE CALIBRATION */
          <div className="space-y-5">
            {/* Lectures Watched vs Total */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-semibold">Lecture Progress</span>
                <span className="text-indigo-400 font-bold">Lec {currentLecInput} of {totalLecInput}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Current Lecture</label>
                  <input
                    type="number"
                    min={1}
                    value={currentLecInput}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        setCurrentLecInput('');
                        return;
                      }
                      const num = parseInt(val, 10);
                      setCurrentLecInput(isNaN(num) ? '' : num);
                    }}
                    onBlur={() => {
                      if (currentLecInput === '' || Number(currentLecInput) <= 0) {
                        setCurrentLecInput(1);
                      }
                    }}
                    className={`w-full bg-[#121318] border rounded-xl px-3 py-2 text-xs font-mono font-bold text-white text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      currentLecInput === '' || Number(currentLecInput) <= 0
                        ? 'border-rose-500/80 bg-rose-950/20 text-rose-300 animate-shake'
                        : 'border-zinc-700 focus:border-indigo-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Total Lectures</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={totalLecInput}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        setTotalLecInput('');
                        return;
                      }
                      const num = parseInt(val, 10);
                      setTotalLecInput(isNaN(num) ? '' : num);
                    }}
                    onBlur={() => {
                      if (totalLecInput === '' || Number(totalLecInput) <= 0) {
                        setTotalLecInput(8);
                      }
                    }}
                    className={`w-full bg-[#121318] border rounded-xl px-3 py-2 text-xs font-mono font-bold text-white text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      totalLecInput === '' || Number(totalLecInput) <= 0
                        ? 'border-rose-500/80 bg-rose-950/20 text-rose-300 animate-shake'
                        : 'border-zinc-700 focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Avg Duration Chips */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">Avg Lecture Duration</label>
              <div className="grid grid-cols-5 gap-2">
                {[45, 60, 75, 90, 120].map(dur => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setAvgDurationInput(dur)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      avgDurationInput === dur
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {dur}m
                  </button>
                ))}
              </div>
            </div>

            {/* DPP & PYQ Status Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">DPP Status</label>
                <div className="flex gap-1">
                  {[
                    { label: 'Pending', val: false },
                    { label: 'Partial', val: 'partial' },
                    { label: 'Done ✓', val: true }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setDppDoneInput(opt.val as any)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        dppDoneInput === opt.val
                          ? opt.val === true ? 'bg-emerald-600 text-white' : opt.val === 'partial' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-white'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">PYQs Done?</label>
                <div className="flex gap-1">
                  {[
                    { label: 'No', val: false },
                    { label: 'Yes ✓', val: true }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPyqsDoneInput(opt.val)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        pyqsDoneInput === opt.val
                          ? opt.val === true ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-white'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <div className="pt-2">
          <button
            onClick={handleConfirmCalibration}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-all cursor-pointer"
          >
            Confirm & Engage Cockpit
          </button>
        </div>
    </Modal>
  );
}
