import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, X, Check, ArrowRight, ShieldCheck, 
  HelpCircle, Sparkles, Timer, Flame, Award 
} from 'lucide-react';
import { SubjectId } from '@/types/index';
import { MathRenderer } from '@/components/MathRenderer';
import { audioEngine } from '@/utils/audioEngine';

export interface LowHangingQuestion {
  id: string;
  subject: SubjectId;
  chapter: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  targetSeconds: number;
}

export const LOW_HANGING_BANK: LowHangingQuestion[] = [
  // Physics
  {
    id: 'lh-p1',
    subject: 'physics',
    chapter: 'Modern Physics & Dual Nature',
    questionText: 'An electron is accelerated through a potential difference of $100\\text{ V}$. Its de Broglie wavelength is closest to:',
    options: ['1.227 Å', '0.123 Å', '12.27 Å', '0.012 Å'],
    correctOptionIndex: 0,
    explanation: 'Using standard direct formula $\\lambda = \\frac{12.27}{\\sqrt{V}}\\text{ Å} = \\frac{12.27}{\\sqrt{100}} = 1.227\\text{ Å}$.',
    targetSeconds: 30
  },
  {
    id: 'lh-p2',
    subject: 'physics',
    chapter: 'Semiconductors & Logic Gates',
    questionText: 'The Boolean output $Y = \\overline{A \\cdot B}$ corresponds to which fundamental logic gate?',
    options: ['NAND Gate', 'NOR Gate', 'XOR Gate', 'AND Gate'],
    correctOptionIndex: 0,
    explanation: 'The negated product $\\overline{A \\cdot B}$ defines the truth table of a NAND gate.',
    targetSeconds: 20
  },
  {
    id: 'lh-p3',
    subject: 'physics',
    chapter: 'Magnetic Effects of Current',
    questionText: 'A proton enters a uniform magnetic field $B$ perpendicular to its velocity $v$. The radius of its circular trajectory is:',
    options: ['$R = \\frac{mv}{qB}$', '$R = \\frac{qB}{mv}$', '$R = \\frac{mB}{qv}$', '$R = \\frac{v}{qmB}$'],
    correctOptionIndex: 0,
    explanation: 'Centripetal force equals magnetic Lorentz force: $\\frac{mv^2}{R} = qvB \\implies R = \\frac{mv}{qB}$.',
    targetSeconds: 25
  },

  // Chemistry
  {
    id: 'lh-c1',
    subject: 'chemistry',
    chapter: 'Coordination Compounds',
    questionText: 'The oxidation state of cobalt in $[\\text{Co}(\\text{NH}_3)_4\\text{Cl}_2]^+$ is:',
    options: ['+3', '+2', '+1', '+4'],
    correctOptionIndex: 0,
    explanation: '$x + 4(0) + 2(-1) = +1 \\implies x - 2 = +1 \\implies x = +3$.',
    targetSeconds: 25
  },
  {
    id: 'lh-c2',
    subject: 'chemistry',
    chapter: 'Chemical Kinetics',
    questionText: 'For a first-order chemical reaction, the half-life period $t_{1/2}$ is given by:',
    options: ['$t_{1/2} = \\frac{0.693}{k}$', '$t_{1/2} = \\frac{k}{0.693}$', '$t_{1/2} = \\frac{[A]_0}{2k}$', '$t_{1/2} = \\frac{1}{k[A]_0}$'],
    correctOptionIndex: 0,
    explanation: 'First-order integrated rate law yields $t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693}{k}$, independent of initial concentration.',
    targetSeconds: 20
  },
  {
    id: 'lh-c3',
    subject: 'chemistry',
    chapter: 'Solid State & Solutions',
    questionText: 'For a face-centered cubic (FCC) unit cell, the relationship between edge length $a$ and atomic radius $r$ is:',
    options: ['$\\sqrt{2}a = 4r$', '$\\sqrt{3}a = 4r$', '$a = 2r$', '$a = 4r$'],
    correctOptionIndex: 0,
    explanation: 'Atoms touch along the face diagonal: $\\text{Face diagonal} = \\sqrt{2}a = 4r \\implies r = \\frac{a}{2\\sqrt{2}}$.',
    targetSeconds: 25
  },

  // Mathematics
  {
    id: 'lh-m1',
    subject: 'maths',
    chapter: 'Statistics',
    questionText: 'The variance of the first $n$ natural numbers is given by:',
    options: ['$\\frac{n^2 - 1}{12}$', '$\\frac{n^2 + 1}{12}$', '$\\frac{n(n+1)}{2}$', '$\\frac{n^2 - 1}{6}$'],
    correctOptionIndex: 0,
    explanation: 'Variance $\\sigma^2 = \\frac{1}{n}\\sum x^2 - (\\bar{x})^2 = \\frac{(n+1)(2n+1)}{6} - \\frac{(n+1)^2}{4} = \\frac{n^2 - 1}{12}$.',
    targetSeconds: 30
  },
  {
    id: 'lh-m2',
    subject: 'maths',
    chapter: 'Vectors & 3D Geometry',
    questionText: 'The distance between parallel planes $2x + 2y - z = 5$ and $2x + 2y - z = -4$ is:',
    options: ['3', '1', '9', '2'],
    correctOptionIndex: 0,
    explanation: 'Distance $d = \\frac{|d_1 - d_2|}{\\sqrt{a^2 + b^2 + c^2}} = \\frac{|5 - (-4)|}{\\sqrt{2^2 + 2^2 + (-1)^2}} = \\frac{9}{\\sqrt{9}} = 3$.',
    targetSeconds: 35
  }
];

interface LowHangingFruitDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSubject?: 'all' | SubjectId;
}

export function LowHangingFruitDrillModal({
  isOpen,
  onClose,
  selectedSubject = 'all'
}: LowHangingFruitDrillModalProps) {
  const filteredQuestions = useMemo(() => {
    return LOW_HANGING_BANK.filter(q => selectedSubject === 'all' || q.subject === selectedSubject);
  }, [selectedSubject, isOpen]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setScore(0);
      setTimeLeft(45);
      setIsFinished(false);
    }
  }, [isOpen, selectedSubject]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || isAnswered || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSelectOption(-1); // timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isAnswered, currentIndex, isFinished]);

  if (!isOpen) return null;

  const currentQ = filteredQuestions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctOptionIndex;
    audioEngine.playMechanicalKey(isCorrect ? 'clack' : 'heavy').catch(() => {});
    if (isCorrect) setScore(prev => prev + 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 < filteredQuestions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(45);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
      
      <div className="w-full max-w-xl bg-[#121318] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 text-left font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-white tracking-tight">
                "Kill-First" Low-Hanging Fruit Sprint
              </h3>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                {selectedSubject.toUpperCase()} • Guaranteed 100-Mark Speed Anchor
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isFinished && currentQ ? (
          <div className="space-y-5">
            
            {/* Progress & Live Countdown */}
            <div className="flex items-center justify-between font-mono text-xs text-zinc-400">
              <span className="font-bold text-indigo-400">Question {currentIndex + 1} of {filteredQuestions.length}</span>
              
              <div className={`flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full border ${
                timeLeft <= 10 ? 'bg-red-950/60 border-red-500/40 text-red-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}>
                <Timer className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* Question Statement */}
            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="uppercase font-bold text-amber-400">{currentQ.chapter}</span>
                <span className="text-zinc-500 uppercase">{currentQ.subject}</span>
              </div>
              <div className="text-sm font-serif text-zinc-200 leading-relaxed font-medium">
                <MathRenderer text={currentQ.questionText} />
              </div>
            </div>

            {/* 4 Multi-Choice Options */}
            <div className="space-y-2.5 font-mono text-xs">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = selectedOption === oIdx;
                const isCorrect = currentQ.correctOptionIndex === oIdx;

                let btnStyle = 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:border-indigo-500/40';
                if (isAnswered) {
                  if (isCorrect) btnStyle = 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 font-bold';
                  else if (isSelected) btnStyle = 'bg-rose-950/70 border-rose-500/60 text-rose-200';
                  else btnStyle = 'bg-zinc-950/40 border-white/5 text-zinc-600 opacity-50';
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(oIdx)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md bg-zinc-950 border border-white/10 flex items-center justify-center text-[10px] font-bold">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="font-serif text-xs text-white">
                        <MathRenderer text={opt} />
                      </span>
                    </div>

                    {isAnswered && isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Instant Solution & Next Control */}
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 pt-2"
              >
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 font-serif text-xs text-zinc-300 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 block">
                    1-Step Recall Explanation:
                  </span>
                  <MathRenderer text={currentQ.explanation} />
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <span>{currentIndex + 1 < filteredQuestions.length ? 'Next Speed Question' : 'View Sprint Results'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

          </div>
        ) : (
          /* FINAL SUMMARY REPORT */
          <div className="space-y-6 text-center py-4 font-mono text-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <Award className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-display text-white">Speed Buffer Complete!</h3>
              <p className="text-xs text-zinc-400">
                Low-Hanging 1-Step Accuracy Sprint
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase">Correct Bank</span>
                <div className="text-xl font-bold text-emerald-400">{score} / {filteredQuestions.length}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-0.5">
                <span className="text-[10px] text-zinc-400 uppercase">Accuracy Rate</span>
                <div className="text-xl font-bold text-indigo-300">{Math.round((score / Math.max(1, filteredQuestions.length)) * 100)}%</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer"
            >
              Return to Hub
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
