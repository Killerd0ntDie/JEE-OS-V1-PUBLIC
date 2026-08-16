import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ClipboardCheck, Check, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

interface MissionDebriefModalProps {
  isOpen: boolean;
  onSubmit: (data: { questions: number; correct: number; confidence: number }) => void;
  onSkip: () => void;
}

export function MissionDebriefModal({ isOpen, onSubmit, onSkip }: MissionDebriefModalProps) {
  const [questions, setQuestions] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [confidence, setConfidence] = useState(0); // 0 = unset, 1 = Low, 2 = Med, 3 = High
  const [didQuestions, setDidQuestions] = useState<null | boolean>(null);

  useLockBodyScroll(isOpen);

  // Clamp correct to never exceed questions
  const handleCorrectChange = (val: number) => {
    setCorrect(Math.min(val, questions));
  };

  const handleQuestionsChange = (val: number) => {
    setQuestions(val);
    if (correct > val) setCorrect(val);
  };

  const canSubmit = didQuestions === false || (didQuestions === true && questions > 0 && confidence > 0);

  const handleSubmit = () => {
    audioEngine.playRadioRelayClick().catch(() => {});
    if (didQuestions === false) {
      onSubmit({ questions: 0, correct: 0, confidence: 0 });
    } else {
      onSubmit({ questions, correct, confidence });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      zIndex={10002}
      backdropClassName="bg-black/35 backdrop-blur-md"
      className="max-w-lg w-full p-6 sm:p-8 flex flex-col items-center text-center space-y-6 rounded-3xl relative overflow-hidden"
      style={{
        background: 'rgba(10, 14, 23, 0.90)',
        backdropFilter: 'blur(28px) saturate(190%) contrast(105%)',
        border: '1.5px solid rgba(99, 102, 241, 0.45)',
        borderTop: '2px solid rgba(99, 102, 241, 0.75)',
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.85), 0 0 60px rgba(99, 102, 241, 0.2)'
      }}
    >
      {/* Top Hazard Warning Tape Ribbon */}
      <div 
        className="absolute top-0 inset-x-0 h-1.5 opacity-70"
        style={{
          background: 'repeating-linear-gradient(-45deg, #6366f1 0px, #6366f1 8px, transparent 8px, transparent 16px)'
        }}
      />

      {/* Micro Corner Caliper Accents */}
      <div className="absolute top-2.5 left-3 text-[10px] font-mono text-indigo-500/60 font-bold select-none">+</div>
      <div className="absolute top-2.5 right-3 text-[10px] font-mono text-indigo-500/60 font-bold select-none">+</div>
      <div className="absolute bottom-2.5 left-3 text-[10px] font-mono text-indigo-500/60 font-bold select-none">+</div>
      <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-indigo-500/60 font-bold select-none">+</div>

      {/* Tactical Stamped Header */}
      <div className="space-y-2.5 pt-1 w-full">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-950/50 border border-indigo-500/50 text-indigo-400 text-[9px] font-mono font-bold tracking-wider uppercase">
          <ClipboardCheck className="w-3 h-3" />
          <span>事後評価 // PERFORMANCE REVIEW</span>
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springs.snappy}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-indigo-900/90 to-indigo-950/90 border border-indigo-500/60 shadow-[0_0_25px_rgba(99,102,241,0.25)]"
        >
          <div className="text-[8.5px] font-mono tracking-[0.25em] text-indigo-300 font-bold uppercase">
            NERV // TACTICAL LOG
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white uppercase">
            作戦報告 : MISSION DEBRIEF
          </h2>
        </motion.div>

        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Log practice checkpoint metrics to calibrate master study analytics.
        </p>
      </div>

      {/* Step 1: Did you solve questions? */}
      {didQuestions === null && (
        <div className="w-full space-y-3 pt-1">
          <p className="text-xs text-zinc-300 font-mono">演習問題を解きましたか？ (Did you solve questions?)</p>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                audioEngine.playRadioRelayClick().catch(() => {});
                setDidQuestions(true);
              }}
              className="py-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              はい (Yes, Solved)
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                audioEngine.playRadioRelayClick().catch(() => {});
                setDidQuestions(false);
              }}
              className="py-3.5 rounded-2xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-300 hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              理論のみ (Theory Only)
            </motion.button>
          </div>
        </div>
      )}

      {/* Step 2a: No questions — submit */}
      {didQuestions === false && (
        <div className="w-full space-y-4 pt-1">
          <div className="p-4 rounded-2xl border border-white/10 bg-zinc-950/60 text-left">
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Theory-only sessions count toward your active hours and daily streak deck.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-2xl font-mono text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 cursor-pointer border border-indigo-400/40"
          >
            <Check className="w-4 h-4" /> 確認 & 終了 (Confirm & Exit)
          </motion.button>
          <button 
            onClick={() => setDidQuestions(null)} 
            className="text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors cursor-pointer"
          >
            ← 戻る (Change answer)
          </button>
        </div>
      )}

      {/* Step 2b: Yes — collect questions, correct, confidence */}
      {didQuestions === true && (
        <div className="w-full space-y-4 text-left pt-1">
          {/* Questions Solved */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-mono text-zinc-400 block uppercase tracking-wider font-bold">
              演習問題数 // QUESTIONS SOLVED
            </label>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  audioEngine.playTacticalSwitch().catch(() => {});
                  handleQuestionsChange(Math.max(0, questions - 1));
                }} 
                className="w-10 h-10 rounded-xl border border-white/10 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 font-bold text-lg transition-all flex items-center justify-center cursor-pointer"
              >−</button>
              <input
                type="number"
                min="0"
                value={questions}
                onChange={(e) => handleQuestionsChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono font-bold text-center text-base focus:border-indigo-500 outline-none transition-all"
              />
              <button 
                onClick={() => {
                  audioEngine.playTacticalSwitch().catch(() => {});
                  handleQuestionsChange(questions + 1);
                }} 
                className="w-10 h-10 rounded-xl border border-white/10 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 font-bold text-lg transition-all flex items-center justify-center cursor-pointer"
              >+</button>
            </div>
          </div>

          {/* Correct Answers */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-mono text-zinc-400 block uppercase tracking-wider font-bold">
              正答数 // CORRECT ANSWERS
            </label>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  audioEngine.playTacticalSwitch().catch(() => {});
                  handleCorrectChange(Math.max(0, correct - 1));
                }} 
                className="w-10 h-10 rounded-xl border border-white/10 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 font-bold text-lg transition-all flex items-center justify-center cursor-pointer"
              >−</button>
              <input
                type="number"
                min="0"
                max={questions}
                value={correct}
                onChange={(e) => handleCorrectChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono font-bold text-center text-base focus:border-emerald-500 outline-none transition-all"
              />
              <button 
                onClick={() => {
                  audioEngine.playTacticalSwitch().catch(() => {});
                  handleCorrectChange(correct + 1);
                }} 
                className="w-10 h-10 rounded-xl border border-white/10 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 font-bold text-lg transition-all flex items-center justify-center cursor-pointer"
              >+</button>
            </div>
            {questions > 0 && (
              <p className="text-[10px] font-mono text-zinc-500 text-right">
                {Math.round((correct / Math.max(1, questions)) * 100)}% 正答率 (Accuracy)
              </p>
            )}
          </div>

          {/* Confidence */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-mono text-zinc-400 block uppercase tracking-wider font-bold">
              理解度 // CONFIDENCE
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 1, label: '低 (LOW)', color: 'red' },
                { val: 2, label: '中 (MED)', color: 'amber' },
                { val: 3, label: '高 (HIGH)', color: 'emerald' }
              ].map(c => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => {
                    audioEngine.playRadioRelayClick().catch(() => {});
                    setConfidence(c.val);
                  }}
                  className={`py-2.5 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer ${
                    confidence === c.val
                      ? c.color === 'emerald'
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : c.color === 'amber'
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-red-500/20 border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 space-y-2">
            <motion.button
              whileHover={{ scale: canSubmit ? 1.02 : 1 }}
              whileTap={{ scale: canSubmit ? 0.98 : 1 }}
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-3.5 rounded-2xl font-mono text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                canSubmit 
                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-900/40 border-indigo-400/40 cursor-pointer' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-4 h-4" /> 送信 // SUBMIT DEBRIEF
            </motion.button>
            <button 
              onClick={() => setDidQuestions(null)} 
              className="text-xs text-zinc-500 hover:text-zinc-400 font-mono transition-colors w-full text-center cursor-pointer"
            >
              ← 戻る (Change answer)
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
