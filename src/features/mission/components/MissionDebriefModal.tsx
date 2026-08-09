import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ClipboardCheck, Check, ChevronRight } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

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
      backdropClassName="bg-zinc-950/90 backdrop-blur-md"
      className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-3xl p-7 shadow-[0_0_80px_rgba(99,102,241,0.08)] flex flex-col items-center text-center space-y-6"
    >
      {/* Header */}
      <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.15)]">
        <ClipboardCheck className="w-8 h-8 text-indigo-400" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase">Mission Debrief</h2>
        <p className="text-xs text-zinc-500 font-mono">This calibrates your analytics. Be honest.</p>
      </div>

      {/* Step 1: Did you solve questions? */}
      {didQuestions === null && (
        <div className="w-full space-y-3">
          <p className="text-sm text-zinc-300 font-mono">Did you solve any questions during this session?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDidQuestions(true)}
              className="py-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-emerald-950/30 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-300 font-mono text-sm font-bold uppercase tracking-wider transition-all"
            >
              Yes
            </button>
            <button
              onClick={() => setDidQuestions(false)}
              className="py-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 font-mono text-sm font-bold uppercase tracking-wider transition-all"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Step 2a: No questions — just submit */}
      {didQuestions === false && (
        <div className="w-full space-y-4">
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-left">
            <p className="text-xs text-zinc-400 font-mono">No questions logged for this session. That's okay — theory-only sessions still count toward your study hours and streak.</p>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl font-mono text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Confirm & Exit
          </button>
          <button onClick={() => setDidQuestions(null)} className="text-xs text-zinc-600 hover:text-zinc-400 font-mono transition-colors">← Go back</button>
        </div>
      )}

      {/* Step 2b: Yes — collect data */}
      {didQuestions === true && (
        <div className="w-full space-y-5 text-left">
          {/* Questions Solved */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-zinc-400 block uppercase tracking-wider font-bold">Questions Solved</label>
            <div className="flex items-center gap-3">
              <button onClick={() => handleQuestionsChange(Math.max(0, questions - 1))} className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white font-bold text-lg transition-all flex items-center justify-center">−</button>
              <input
                type="number"
                min="0"
                value={questions}
                onChange={(e) => handleQuestionsChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono font-bold text-center text-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button onClick={() => handleQuestionsChange(questions + 1)} className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white font-bold text-lg transition-all flex items-center justify-center">+</button>
            </div>
          </div>

          {/* Correct Answers */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-zinc-400 block uppercase tracking-wider font-bold">Correct Answers</label>
            <div className="flex items-center gap-3">
              <button onClick={() => handleCorrectChange(Math.max(0, correct - 1))} className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white font-bold text-lg transition-all flex items-center justify-center">−</button>
              <input
                type="number"
                min="0"
                max={questions}
                value={correct}
                onChange={(e) => handleCorrectChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono font-bold text-center text-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button onClick={() => handleCorrectChange(correct + 1)} className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white font-bold text-lg transition-all flex items-center justify-center">+</button>
            </div>
            {questions > 0 && (
              <p className="text-[10px] font-mono text-zinc-600 text-right">{questions > 0 ? Math.round((correct / questions) * 100) : 0}% accuracy</p>
            )}
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-zinc-400 block uppercase tracking-wider font-bold">Confidence Level</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setConfidence(1)}
                className={`py-3 rounded-xl border text-xs font-bold font-mono transition-all ${confidence === 1 ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
              >
                LOW
              </button>
              <button
                onClick={() => setConfidence(2)}
                className={`py-3 rounded-xl border text-xs font-bold font-mono transition-all ${confidence === 2 ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
              >
                MEDIUM
              </button>
              <button
                onClick={() => setConfidence(3)}
                className={`py-3 rounded-xl border text-xs font-bold font-mono transition-all ${confidence === 3 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
              >
                HIGH
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-4 rounded-xl font-mono text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${canSubmit ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'}`}
            >
              <ChevronRight className="w-4 h-4" /> Submit Debrief
            </button>
            <button onClick={() => setDidQuestions(null)} className="text-xs text-zinc-600 hover:text-zinc-400 font-mono transition-colors w-full text-center">← Go back</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
