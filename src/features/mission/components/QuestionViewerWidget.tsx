import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BlockMath, InlineMath } from 'react-katex';
import { Target, X, Check, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, HelpCircle } from 'lucide-react';
import pyqData from '@/data/pyqBank.json';
import { Question, Difficulty } from '@/types/curriculum';
import { audioEngine } from '@/utils/audioEngine';
import { QuestionRepository } from '@/firebase/QuestionRepository';
import { PyqGeneratorEngine } from '@/lib/PyqGeneratorEngine';
import { springs } from '@/constants/motion';

interface QuestionViewerWidgetProps {
  chapterId: string;
  chapterName?: string;
  subject: string;
  onExitPractice: () => void;
  onCorrectAnswer?: () => void;
  onQuestionAttempted?: () => void;
}

export function QuestionViewerWidget({ chapterId, chapterName, subject, onExitPractice, onCorrectAnswer, onQuestionAttempted }: QuestionViewerWidgetProps) {
  const [chapterQuestions, setChapterQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [numericalInput, setNumericalInput] = useState<string>('');
  const [showSolution, setShowSolution] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchQuestions = async () => {
      setIsLoading(true);
      setGenError(null);
      try {
        await QuestionRepository.seedInitialDatabase(pyqData.questions as Question[]);
        let qList = await QuestionRepository.getQuestionsByChapter(chapterId);
        if (qList.length === 0 && chapterName && chapterName !== chapterId) {
          qList = await QuestionRepository.getQuestionsByChapter(chapterName);
        }
        
        if (qList.length > 0) {
          if (isMounted) setChapterQuestions(qList);
        } else {
          if (isMounted) setIsGenerating(true);
          const targetChapter = chapterName || chapterId;
          const aiGenerated = await PyqGeneratorEngine.generateQuestions(targetChapter, subject, 3);
          await QuestionRepository.saveQuestionsBatch(aiGenerated);
          if (isMounted) {
            setChapterQuestions(aiGenerated);
            setIsGenerating(false);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch/generate questions:", err);
        if (isMounted) {
          setIsGenerating(false);
          setGenError(err.message || "Failed to generate questions.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchQuestions();
    return () => { isMounted = false; };
  }, [chapterId, subject]);

  const activeQuestion = chapterQuestions[currentIndex];

  useEffect(() => {
    setSelectedOptions([]);
    setNumericalInput('');
    setShowSolution(false);
    setIsCorrect(null);
  }, [currentIndex, chapterId]);

  if (isLoading || isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-white font-mono font-bold text-xs uppercase tracking-wider">
            {isGenerating ? 'Synthesizing PYQs' : 'Loading Question Vault'}
          </h3>
          <p className="text-zinc-500 text-xs font-mono max-w-xs">
            {isGenerating 
              ? 'AI Coach is assembling curated JEE exam problems with step-by-step solutions...'
              : `Loading chapter telemetry for ${chapterName || chapterId}...`}
          </p>
        </div>
      </div>
    );
  }

  if (!activeQuestion || genError) {
    let displayError = genError || "Failed to generate questions.";
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-red-950/30 rounded-2xl flex items-center justify-center border border-red-500/30 text-red-400">
          <XCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-white font-mono font-bold text-sm">Practice Vault Unavailable</h3>
          <p className="text-zinc-500 text-xs max-w-xs">{displayError}</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onExitPractice}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-300 transition-colors cursor-pointer"
        >
          Return to Checklist
        </motion.button>
      </div>
    );
  }

  const handleOptionToggle = (id: string) => {
    if (showSolution) return;
    if (activeQuestion.type === 'MCQ_SINGLE') {
      setSelectedOptions([id]);
    } else {
      setSelectedOptions(prev => 
        prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
      );
    }
  };

  const checkAnswer = () => {
    if (activeQuestion.type === 'MCQ_SINGLE' || activeQuestion.type === 'MCQ_MULTIPLE') {
      const correct = activeQuestion.solution.correctOptionIds || [];
      const isAnsCorrect = 
        correct.length === selectedOptions.length && 
        correct.every(id => selectedOptions.includes(id));
      
      setIsCorrect(isAnsCorrect);
      if (isAnsCorrect) {
        audioEngine.playSuccessChime();
        if (onCorrectAnswer) onCorrectAnswer();
      }
    } else if (activeQuestion.type === 'NUMERICAL') {
      const target = activeQuestion.solution.correctNumericalValue;
      const tol = activeQuestion.solution.numericalTolerance || 0;
      const val = parseFloat(numericalInput);
      
      if (target !== undefined && !isNaN(val)) {
        const isAnsCorrect = Math.abs(val - target) <= tol;
        setIsCorrect(isAnsCorrect);
        if (isAnsCorrect) {
          audioEngine.playSuccessChime();
          if (onCorrectAnswer) onCorrectAnswer();
        }
      } else {
        setIsCorrect(false);
      }
    }
    setShowSolution(true);
    if (onQuestionAttempted) onQuestionAttempted();
  };

  const nextQuestion = () => {
    if (currentIndex < chapterQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const renderMathText = (text: string | undefined | null) => {
    if (!text) return null;
    const cleanText = text.replace(/\\\$/g, '$');
    const parts = cleanText.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        return <BlockMath key={i} math={math} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        return <InlineMath key={i} math={math} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-5 sm:p-6 select-none text-left">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-sm">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                PYQ ARENA
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-400 uppercase">
                {activeQuestion.difficulty?.replace('_', ' ') || 'JEE ADVANCED'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              Q {currentIndex + 1} of {chapterQuestions.length} • {activeQuestion.id || 'PYQ'}
            </span>
          </div>
        </div>

        {/* Exit Arena Button (Returns to Checklist) */}
        <motion.button 
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={springs.snappy}
          onClick={onExitPractice}
          className="w-9 h-9 rounded-xl border border-zinc-800/80 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center justify-center bg-zinc-900/80 cursor-pointer shadow-sm"
          title="Return to Checklist"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Main Question Body & Options */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4 pr-1 min-h-0">
        
        {/* Question Prompt */}
        <div className="text-zinc-100 text-sm sm:text-base leading-relaxed font-sans bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-2xl shadow-sm">
          {renderMathText(activeQuestion.content)}
        </div>

        {/* Options Selection */}
        <div className="space-y-2">
          {activeQuestion.options && activeQuestion.options.map(opt => {
            const isSelected = selectedOptions.includes(opt.id);
            const isCorrectOption = showSolution && activeQuestion.solution.correctOptionIds?.includes(opt.id);
            const isWrongSelection = showSolution && isSelected && !isCorrectOption;

            let cardStyle = "border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-850/80 hover:border-zinc-700 text-zinc-300";
            if (isSelected && !showSolution) {
              cardStyle = "border-indigo-500/60 bg-indigo-950/30 text-white shadow-sm";
            }
            if (showSolution) {
              if (isCorrectOption) {
                cardStyle = "border-emerald-500/60 bg-emerald-950/30 text-emerald-100 shadow-sm";
              } else if (isWrongSelection) {
                cardStyle = "border-rose-500/60 bg-rose-950/30 text-rose-200 opacity-80";
              } else {
                cardStyle = "border-zinc-850/60 bg-zinc-950/30 text-zinc-600 opacity-50";
              }
            }

            return (
              <motion.button
                key={opt.id}
                type="button"
                whileHover={!showSolution ? { x: 2 } : {}}
                transition={springs.snappy}
                onClick={() => handleOptionToggle(opt.id)}
                disabled={showSolution}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${cardStyle} cursor-pointer`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-bold font-mono text-xs border transition-colors ${
                  isSelected && !showSolution 
                    ? 'bg-indigo-600 text-white border-indigo-400' 
                    : isCorrectOption
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : isWrongSelection
                    ? 'bg-rose-600 text-white border-rose-400'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}>
                  {opt.id}
                </div>
                <div className="flex-1 mt-0.5 leading-relaxed font-sans text-xs sm:text-sm">
                  {renderMathText(opt.text)}
                </div>
              </motion.button>
            );
          })}

          {activeQuestion.type === 'NUMERICAL' && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-mono font-bold text-zinc-400 uppercase">Enter Numerical Answer:</label>
              <input
                type="number"
                step="any"
                value={numericalInput === 0 ? '' : numericalInput} placeholder="0"
                onChange={(e) => setNumericalInput(e.target.value)}
                disabled={showSolution}
                className={`w-full bg-zinc-900/80 border ${
                  showSolution 
                    ? (isCorrect ? 'border-emerald-500 text-emerald-400' : 'border-rose-500 text-rose-400') 
                    : 'border-zinc-800 focus:border-indigo-500 text-white'
                } rounded-xl px-4 py-3 text-lg font-mono outline-none transition-colors`}
                placeholder="0.00"
              />
            </div>
          )}
        </div>

        {/* Detailed Solution Box */}
        <AnimatePresence>
          {showSolution && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.snappy}
              className={`p-4 rounded-2xl border ${
                isCorrect 
                  ? 'bg-emerald-950/20 border-emerald-500/30' 
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <h4 className={`text-xs font-mono font-bold uppercase tracking-wider ${
                  isCorrect ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isCorrect ? 'Correct Analysis' : 'Solution & Detailed Breakdown'}
                </h4>
              </div>
              <div className="text-zinc-300 font-sans leading-relaxed text-xs sm:text-sm">
                {renderMathText(activeQuestion.solution?.text)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation CTAs */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-800/80 mt-2 shrink-0">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={springs.snappy}
          onClick={prevQuestion}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800 text-zinc-300 hover:text-white rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </motion.button>

        {!showSolution ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={springs.snappy}
            onClick={checkAnswer}
            disabled={activeQuestion.type === 'NUMERICAL' ? !numericalInput : selectedOptions.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            <span>Verify Answer</span>
            <Check className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={springs.snappy}
            onClick={nextQuestion}
            disabled={currentIndex === chapterQuestions.length - 1}
            className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-xl font-mono text-xs font-bold uppercase tracking-wider shadow-lg transition-colors cursor-pointer"
          >
            <span>Next Question</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
