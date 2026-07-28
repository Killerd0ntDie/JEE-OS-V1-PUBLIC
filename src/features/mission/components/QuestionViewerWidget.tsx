import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BlockMath, InlineMath } from 'react-katex';
import { Icon } from '../../../components/ui/Icon';
import pyqData from '../../../data/pyqBank.json';
import { Question, Difficulty } from '../../../types/curriculum';
import { audioEngine } from '../../../utils/audioEngine';
import { QuestionRepository } from '../../../firebase/QuestionRepository';
import { PyqGeneratorEngine } from '../../../lib/PyqGeneratorEngine';
import { Sparkles } from 'lucide-react';

interface QuestionViewerWidgetProps {
  chapterId: string;
  subject: string;
  onExitPractice: () => void;
}

export function QuestionViewerWidget({ chapterId, subject, onExitPractice }: QuestionViewerWidgetProps) {
  const [chapterQuestions, setChapterQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [numericalInput, setNumericalInput] = useState<string>('');
  const [showSolution, setShowSolution] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Fetch questions from Cloud Database
  useEffect(() => {
    let isMounted = true;
    const fetchQuestions = async () => {
      setIsLoading(true);
      setGenError(null);
      try {
        await QuestionRepository.seedInitialDatabase(pyqData.questions as Question[]);
        const qList = await QuestionRepository.getQuestionsByChapter(chapterId);
        
        if (qList.length > 0) {
          if (isMounted) setChapterQuestions(qList);
        } else {
          // Trigger AI Generation if empty
          if (isMounted) setIsGenerating(true);
          console.log("Database empty for chapter, triggering AI generation...");
          const aiGenerated = await PyqGeneratorEngine.generateQuestions(chapterId, subject, 3);
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
          setGenError(err.message || "Failed to generate questions. Did you set VITE_GEMINI_API_KEY?");
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
    // Reset state when question changes
    setSelectedOptions([]);
    setNumericalInput('');
    setShowSolution(false);
    setIsCorrect(null);
  }, [currentIndex, chapterId]);

  if (isLoading || isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950/40 rounded-3xl border border-zinc-800/60 shadow-inner">
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 rounded-full animate-spin"></div>
          {isGenerating && (
            <div className="absolute inset-0 border-2 border-transparent border-b-orange-500 rounded-full animate-spin direction-reverse opacity-50"></div>
          )}
        </div>
        <h3 className="text-zinc-300 font-display font-bold text-sm tracking-wider uppercase mb-2">
          {isGenerating ? 'Synthesizing PYQs' : 'Connecting to Cloud Server'}
        </h3>
        <p className="text-zinc-500 text-xs text-center font-mono max-w-[200px]">
          {isGenerating 
            ? 'The AI Coach is generating highly realistic JEE Advanced questions and solving them...'
            : `Fetching questions for ${chapterId}...`}
        </p>
      </div>
    );
  }

  if (!activeQuestion || genError) {
    let displayError = genError || "Failed to generate questions. Check console.";
    if (displayError.includes('429') || displayError.includes('Quota exceeded') || displayError.includes('RESOURCE_EXHAUSTED')) {
      displayError = "Gemini API Quota Exceeded (429). Please wait a minute and try again, or check your API key billing.";
    } else if (displayError.length > 150) {
      displayError = displayError.substring(0, 150) + "... (Check console for full error)";
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950/40 rounded-3xl border border-zinc-800/60 shadow-inner">
        <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center border border-red-900/50 mb-4">
          <Icon name="XCircle" className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-zinc-300 font-display font-bold text-lg mb-2">Generation Failed</h3>
        <p className="text-zinc-500 text-sm max-w-sm text-center">
          {displayError}
        </p>
        <button 
          onClick={onExitPractice}
          className="mt-6 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 transition-colors"
        >
          Return to Checklist
        </button>
      </div>
    );
  }

  const handleOptionToggle = (id: string) => {
    if (showSolution) return; // Prevent changing answer after submission
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
      if (isAnsCorrect) audioEngine.playSuccessChime(0.5);
    } else if (activeQuestion.type === 'NUMERICAL') {
      const target = activeQuestion.solution.correctNumericalValue;
      const tol = activeQuestion.solution.numericalTolerance || 0;
      const val = parseFloat(numericalInput);
      
      if (target !== undefined && !isNaN(val)) {
        const isAnsCorrect = Math.abs(val - target) <= tol;
        setIsCorrect(isAnsCorrect);
        if (isAnsCorrect) audioEngine.playSuccessChime(0.5);
      } else {
        setIsCorrect(false);
      }
    }
    setShowSolution(true);
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

  // Helper to render text with inline math: parses text replacing $math$ with <InlineMath math="math"/>
  const renderMathText = (text: string) => {
    const parts = text.split(/(\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        return <InlineMath key={i} math={math} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-zinc-100 overflow-hidden rounded-3xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-900 bg-zinc-950/50 gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={onExitPractice}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            title="Exit Practice"
          >
            <Icon name="X" className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Icon name="Target" className="w-4 h-4 text-orange-400" />
            <span className="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-orange-400">
              PYQ Arena
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge type={activeQuestion.difficulty} />
          <span className="text-[10px] sm:text-xs font-mono text-zinc-500">ID: {activeQuestion.id}</span>
          
          {activeQuestion.source && (
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 rounded-md border border-indigo-500/20 text-indigo-400 cursor-help"
              title={activeQuestion.source}
            >
              <Sparkles className="w-3 h-3" />
              <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">AI Generated</span>
            </div>
          )}
        </div>

        <div className="text-xs font-mono font-bold text-zinc-500 text-right sm:text-left">
          Q {currentIndex + 1} / {chapterQuestions.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar p-6 md:p-8 space-y-8 relative">
        {/* Question Content */}
        <div className="text-zinc-100 text-lg leading-relaxed font-serif">
          {renderMathText(activeQuestion.content)}
        </div>

        {/* Options / Input */}
        <div className="space-y-3">
          {activeQuestion.options && activeQuestion.options.map(opt => {
            const isSelected = selectedOptions.includes(opt.id);
            const isCorrectOption = showSolution && activeQuestion.solution.correctOptionIds?.includes(opt.id);
            const isWrongSelection = showSolution && isSelected && !isCorrectOption;

            let optClass = "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-indigo-500/50 hover:bg-zinc-800/80";
            if (isSelected && !showSolution) optClass = "border-indigo-500 bg-indigo-500/10 text-white";
            if (showSolution) {
              if (isCorrectOption) optClass = "border-emerald-500 bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500";
              else if (isWrongSelection) optClass = "border-red-500 bg-red-500/10 text-red-200 opacity-70";
              else optClass = "border-zinc-800 bg-zinc-900/20 text-zinc-500 opacity-50";
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleOptionToggle(opt.id)}
                disabled={showSolution}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${optClass}`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 font-bold font-mono text-xs border
                  ${isSelected && !showSolution ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-black/50 border-zinc-700'}`}>
                  {opt.id}
                </div>
                <div className="flex-1 mt-0.5 leading-relaxed font-serif">
                  {renderMathText(opt.text)}
                </div>
              </button>
            )
          })}

          {activeQuestion.type === 'NUMERICAL' && (
            <div className="max-w-xs">
              <label className="text-xs font-mono font-bold text-zinc-400 uppercase mb-2 block">Enter Numerical Answer:</label>
              <input
                type="number"
                step="any"
                value={numericalInput}
                onChange={(e) => setNumericalInput(e.target.value)}
                disabled={showSolution}
                className={`w-full bg-black/50 border ${showSolution ? (isCorrect ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400') : 'border-zinc-800 focus:border-indigo-500 text-white'} rounded-xl p-4 text-xl outline-none transition-colors`}
                placeholder="0.00"
              />
            </div>
          )}
        </div>

        {/* Action / Solution Area */}
        <AnimatePresence>
          {showSolution && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-6 border-t border-zinc-900"
            >
              <div className={`p-5 rounded-2xl border ${isCorrect ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name={isCorrect ? "CheckCircle2" : "XCircle"} className={`w-5 h-5 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`} />
                  <h4 className={`font-display font-bold uppercase tracking-wider ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCorrect ? 'Correct Answer!' : 'Incorrect Analysis'}
                  </h4>
                </div>
                <div className="text-zinc-300 font-serif leading-relaxed text-sm">
                  {renderMathText(activeQuestion.solution.text)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="p-4 border-t border-zinc-900 bg-[#09090b] flex items-center justify-between">
        <button
          onClick={prevQuestion}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 rounded-xl font-mono text-xs font-bold transition-colors"
        >
          <Icon name="ChevronLeft" className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {!showSolution ? (
          <button
            onClick={checkAnswer}
            disabled={activeQuestion.type === 'NUMERICAL' ? !numericalInput : selectedOptions.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-zinc-800 text-white rounded-xl font-mono text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
          >
            <span>Verify Answer</span>
            <Icon name="Check" className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            disabled={currentIndex === chapterQuestions.length - 1}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-50 text-black rounded-xl font-mono text-sm font-bold shadow-lg transition-all"
          >
            <span>Next Question</span>
            <Icon name="ChevronRight" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function Badge({ type }: { type: Difficulty }) {
  let color = "bg-zinc-800 text-zinc-400 border-zinc-700";
  if (type === 'JEE_ADVANCED') color = "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (type === 'JEE_MAIN') color = "bg-blue-500/10 text-blue-400 border-blue-500/20";
  
  return (
    <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${color}`}>
      {type.replace('_', ' ')}
    </div>
  );
}
