import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, 
  AlertTriangle, RotateCcw, Award, Check, Eye, HelpCircle,
  Lightbulb, BookOpen, Brain, Edit3
} from 'lucide-react';
import { Mistake, SubjectId } from '@/types/index';
import { RichTextRenderer } from '@/components/MathRenderer';
import { springs } from '@/constants/motion';
import { audioEngine } from '@/utils/audioEngine';

export interface MistakeRemediationLabProps {
  initialMistake: Mistake;
  queue: Mistake[];
  onExit: () => void;
  onAdvanceStatus: (id: string, isSuccess: boolean) => Promise<void>;
  onStartInterrogation: (mistake: Mistake) => void;
  getSubjectColor: (sub: SubjectId) => { text: string; bg: string; border: string; badge: string };
}

export const MistakeRemediationLab: React.FC<MistakeRemediationLabProps> = ({
  initialMistake,
  queue,
  onExit,
  onAdvanceStatus,
  onStartInterrogation,
  getSubjectColor
}) => {
  const [currentIdx, setCurrentIdx] = useState(() => {
    const idx = queue.findIndex(m => m.id === initialMistake.id);
    return idx >= 0 ? idx : 0;
  });

  const currentMistake = queue[currentIdx] || initialMistake;
  const subTheme = getSubjectColor(currentMistake.subject);

  const [activeStep, setActiveStep] = useState(1);
  const [divergentStep, setDivergentStep] = useState<number | null>(null);
  const [selectedRootCause, setSelectedRootCause] = useState<string | null>(null);
  const [scratchpadText, setScratchpadText] = useState('');
  const [isResolved, setIsResolved] = useState(false);

  // Partition solution into 4 analytical milestones
  const solutionMilestones = React.useMemo(() => {
    const raw = currentMistake.correctMethod || currentMistake.correctSolution || 'No solution recorded';
    const lines = raw.split('\n').filter(l => l.trim().length > 0);

    if (lines.length >= 4) {
      const qSize = Math.ceil(lines.length / 4);
      return [
        { id: 1, title: 'Physical Premises & Given Constraints', content: lines.slice(0, qSize).join('\n') },
        { id: 2, title: 'Governing Formula & Boundary Conditions', content: lines.slice(qSize, qSize * 2).join('\n') },
        { id: 3, title: 'Analytical & Vector Derivation', content: lines.slice(qSize * 2, qSize * 3).join('\n') },
        { id: 4, title: 'Final Calculation & Answer Verification', content: lines.slice(qSize * 3).join('\n') }
      ];
    }

    return [
      { id: 1, title: 'Physical Premises & Given Constraints', content: `Analyze the problem statement and identify known quantities for ${currentMistake.topic || currentMistake.chapter}.` },
      { id: 2, title: 'Governing Formula & Conservation Law', content: `Identify the fundamental theorem or rate equation governing this ${currentMistake.subject} phenomenon.` },
      { id: 3, title: 'Step-by-Step Analytical Derivation', content: raw },
      { id: 4, title: 'Official Answer & Elimination of Distractors', content: currentMistake.correctSolution ? `Correct Result: ${currentMistake.correctSolution}` : 'Verify dimensions and numerical sign.' }
    ];
  }, [currentMistake]);

  const handleSelectDivergence = (stepId: number) => {
    setDivergentStep(stepId);
    audioEngine.playMechanicalKey('click').catch(() => {});
  };

  const handleMarkResolved = async () => {
    setIsResolved(true);
    audioEngine.playSuccessChime();
    await onAdvanceStatus(currentMistake.id, true);
  };

  const handleNext = () => {
    if (currentIdx < queue.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setActiveStep(1);
      setDivergentStep(null);
      setSelectedRootCause(null);
      setScratchpadText('');
      setIsResolved(false);
    } else {
      onExit();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setActiveStep(1);
      setDivergentStep(null);
      setSelectedRootCause(null);
      setScratchpadText('');
      setIsResolved(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left font-sans pb-16">
      
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#101116] border border-zinc-800/90 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-mono text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>Exit Lab</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${subTheme.badge}`}>
                {currentMistake.subject}
              </span>
              <h2 className="text-sm sm:text-base font-display font-bold text-white">
                Interactive Remediation Lab
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {currentMistake.chapter} • {currentMistake.topic || 'General'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStartInterrogation(currentMistake)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Autopsy Chat</span>
          </button>

          <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
            {currentIdx + 1} of {queue.length}
          </span>
        </div>
      </div>

      {/* Main Derivation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left: Problem Statement & Student's Divergence Point (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Question Statement */}
          <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Problem Statement
              </span>
              {currentMistake.source && (
                <span className="text-[10px] font-mono text-zinc-500">
                  {currentMistake.source}
                </span>
              )}
            </div>

            <div className="text-xs sm:text-sm text-zinc-100 leading-relaxed overflow-x-auto font-sans">
              <RichTextRenderer content={currentMistake.questionText} />
            </div>

            {/* Recorded Student Attempt */}
            {currentMistake.studentMethod && (
              <div className="pt-2">
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs font-mono text-rose-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-400 block mb-1">
                    Your Previous Choice / Working:
                  </span>
                  <div className="leading-relaxed">
                    <RichTextRenderer content={currentMistake.studentMethod} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Socratic Diagnostic: Pinpoint Exact Point of Divergence */}
          <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Where Did Your Approach Falter?
              </span>
              <p className="text-xs text-zinc-400 font-sans">
                Select the analytical milestone where your reasoning departed from the canonical solution:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {solutionMilestones.map((ms) => {
                const isSelected = divergentStep === ms.id;
                return (
                  <button
                    key={ms.id}
                    onClick={() => handleSelectDivergence(ms.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-100 ring-1 ring-amber-500/30'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                        Milestone {ms.id}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="text-xs font-bold leading-snug">
                      {ms.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Root Cause Selector */}
            {divergentStep && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-2 space-y-2 border-t border-zinc-800/80"
              >
                <span className="text-[11px] font-mono text-zinc-400 block font-bold">
                  Identify Root Cognitive Flaw:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Calculation Slip',
                    'Formula Misrecollection',
                    'Sign / Lenz Law Error',
                    'Boundary Condition Ignored',
                    'Trap Option Selected',
                    'Unit / Dimension Mismatch'
                  ].map(cause => (
                    <button
                      key={cause}
                      onClick={() => setSelectedRootCause(cause)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border ${
                        selectedRootCause === cause
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                      }`}
                    >
                      {cause}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Interactive Re-Derivation Scratchpad */}
          <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                Re-Derivation Scratchpad
              </span>
              {scratchpadText && (scratchpadText.includes('$') || scratchpadText.includes('\\') || scratchpadText.includes('^')) && (
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                  LaTeX Active
                </span>
              )}
            </div>
            <textarea
              value={scratchpadText}
              onChange={(e) => setScratchpadText(e.target.value)}
              placeholder="Write out your corrected derivation or calculations here (LaTeX: $x^2$, \frac{a}{b})..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 font-mono focus:outline-none focus:border-indigo-500/50"
            />
            {scratchpadText && (scratchpadText.includes('$') || scratchpadText.includes('\\') || scratchpadText.includes('^') || scratchpadText.includes('_')) && (
              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-indigo-500/30 text-xs">
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-1">
                  Formula Derivation Preview:
                </span>
                <div className="text-zinc-100">
                  <RichTextRenderer content={scratchpadText} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Progressive Milestone Derivation Reveal (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Analytical Derivation
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Step {activeStep} of {solutionMilestones.length}
              </span>
            </div>

            {/* Milestones Stepper */}
            <div className="space-y-3">
              {solutionMilestones.map((ms, idx) => {
                const isRevealed = idx + 1 <= activeStep;
                return (
                  <div
                    key={ms.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isRevealed
                        ? 'bg-zinc-950/80 border-zinc-700/80 text-zinc-100 shadow-md'
                        : 'bg-zinc-950/30 border-zinc-900 text-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-mono font-bold uppercase ${
                        isRevealed ? 'text-emerald-400' : 'text-zinc-600'
                      }`}>
                        Step {ms.id}: {ms.title}
                      </span>
                      {isRevealed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>

                    {isRevealed ? (
                      <div className="text-xs leading-relaxed font-mono overflow-x-auto">
                        <RichTextRenderer content={ms.content} />
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-zinc-600 italic">
                        Hidden until previous step is reviewed
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stepper Controls */}
            <div className="pt-2 flex items-center justify-between gap-2">
              {activeStep < solutionMilestones.length ? (
                <button
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Reveal Next Analytical Step</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleMarkResolved}
                  disabled={isResolved}
                  className={`w-full py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                    isResolved
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isResolved ? 'Marked as Resolved (+Leitner Box)' : 'I Have Mastered This Concept'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Stepper Navigation Footer */}
          <div className="bg-[#101116] border border-zinc-800/90 rounded-2xl p-3 flex items-center justify-between shadow-md">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-zinc-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-mono text-zinc-500">
              Q{currentIdx + 1}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIdx === queue.length - 1}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
