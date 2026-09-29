import React from 'react';
import { 
  RotateCcw, HelpCircle, Eye, EyeOff, Lightbulb 
} from 'lucide-react';
import { RichTextRenderer } from '@/components/MathRenderer';
import { 
  EvaluatedMockQuestion, 
  formatCorrectAnswerKey, 
  isMultiChoiceQuestion, 
  getAllCorrectOptionIndices, 
  isOptionSelectedInAnswer 
} from '@/utils/mockScoring';
import { AiExplanationCard } from '../AiExplanationCard';

export interface BlindReattemptCardProps {
  currentQItem: EvaluatedMockQuestion;
  revealedHints: Record<string, boolean>;
  setRevealedHints: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  revealedReattempts: Record<string, boolean>;
  setRevealedReattempts: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  reattemptAnswers: Record<string, string>;
  setReattemptAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  customExplanation?: string;
  isGeneratingExplanation: boolean;
  onGenerateAiExplanation: (qItem: EvaluatedMockQuestion) => Promise<void>;
  extractKeyFormula: (explanation?: string) => string;
}

export const BlindReattemptCard: React.FC<BlindReattemptCardProps> = ({
  currentQItem,
  revealedHints,
  setRevealedHints,
  revealedReattempts,
  setRevealedReattempts,
  reattemptAnswers,
  setReattemptAnswers,
  customExplanation,
  isGeneratingExplanation,
  onGenerateAiExplanation,
  extractKeyFormula,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className={`p-4 rounded-3xl border flex items-center justify-between gap-4 flex-wrap ${
        currentQItem.isIncorrect
          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
          : currentQItem.isUnattempted
          ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
          : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          <RotateCcw className="w-5 h-5 shrink-0" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wide">
              {currentQItem.isIncorrect ? '🔴 Mistake Recovery Challenge' :
               currentQItem.isUnattempted ? '⚪ Unattempted Opportunity' :
               '🟢 Mastery Confirmation'}
            </h4>
            <p className="text-xs font-sans opacity-90">
              {currentQItem.isIncorrect
                ? 'You lost marks on this in the exam. Test yourself fresh without looking at the answer!'
                : currentQItem.isUnattempted
                ? 'You skipped this question during the test. Take 2 minutes to attempt it now!'
                : 'You got this right (+4 M). Try solving it for speed or check alternative methods.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRevealedHints(prev => ({ ...prev, [currentQItem.question.id]: !prev[currentQItem.question.id] }))}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-800/60 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{revealedHints[currentQItem.question.id] ? 'Hide Hint' : 'Need a Hint?'}</span>
          </button>

          <button
            type="button"
            onClick={() => setRevealedReattempts(prev => ({ ...prev, [currentQItem.question.id]: !prev[currentQItem.question.id] }))}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {revealedReattempts[currentQItem.question.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{revealedReattempts[currentQItem.question.id] ? 'Hide Solution' : 'Reveal Solution'}</span>
          </button>
        </div>
      </div>

      {revealedHints[currentQItem.question.id] && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-600/40 space-y-1.5 font-mono text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Lightbulb className="w-4 h-4" />
            <span>Step 1 Intuitive Hint:</span>
          </div>
          <p className="font-sans text-zinc-300 leading-relaxed">
            {extractKeyFormula(currentQItem.question.explanation)}
          </p>
        </div>
      )}

      <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <span className="font-mono text-xs font-bold text-white bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-lg">
            Q. {currentQItem.globalIndex}
          </span>
          <span className="text-xs font-mono text-zinc-400">
            {currentQItem.question.chapter || currentQItem.sectionSubject}
          </span>
        </div>

        <div className="text-sm sm:text-base text-zinc-100 font-sans leading-relaxed">
          <RichTextRenderer content={currentQItem.question.content} imageUrl={currentQItem.question.imageUrl} />
        </div>

        {(currentQItem.question.type === 'MCQ' || currentQItem.question.type === 'MULTI' || (Array.isArray(currentQItem.question.options) && currentQItem.question.options.length > 0)) && currentQItem.question.options && (
          <div className="space-y-3 pt-2">
            {(() => {
              const isMulti = isMultiChoiceQuestion(currentQItem.question);
              const correctIndices = getAllCorrectOptionIndices(currentQItem.question);

              return currentQItem.question.options.map((opt, optIdx) => {
                const optKey = String.fromCharCode(65 + optIdx);
                const currentReattempt = reattemptAnswers[currentQItem.question.id];
                const isChosen = isOptionSelectedInAnswer(currentReattempt, optIdx);
                const isRevealed = revealedReattempts[currentQItem.question.id];
                const isCorrect = correctIndices.includes(optIdx);

                let cardStyle = 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700';
                if (isChosen && !isRevealed) {
                  cardStyle = 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/50';
                } else if (isRevealed && isCorrect) {
                  cardStyle = 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50';
                } else if (isRevealed && isChosen && !isCorrect) {
                  cardStyle = 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
                }

                const handleReattemptToggle = () => {
                  if (isRevealed) return;
                  if (isMulti) {
                    let letters = (currentReattempt || '')
                      .replace(/[^A-D]/gi, '')
                      .toUpperCase()
                      .split('');
                    if (letters.includes(optKey)) {
                      letters = letters.filter(l => l !== optKey);
                    } else {
                      letters.push(optKey);
                    }
                    letters.sort();
                    setReattemptAnswers(prev => ({ ...prev, [currentQItem.question.id]: letters.join('') }));
                  } else {
                    setReattemptAnswers(prev => ({ ...prev, [currentQItem.question.id]: optKey }));
                  }
                };

                return (
                  <div
                    key={optIdx}
                    onClick={handleReattemptToggle}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${cardStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                        isChosen && !isRevealed
                          ? 'bg-indigo-600 text-white'
                          : isRevealed && isCorrect
                          ? 'bg-emerald-500 text-black'
                          : isRevealed && isChosen && !isCorrect
                          ? 'bg-rose-500 text-white'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}>
                        {isChosen && isMulti && !isRevealed ? '✓' : optKey}
                      </span>
                      <div className="text-xs sm:text-sm font-sans flex-1 py-1 overflow-visible">
                        <RichTextRenderer content={opt} optIndex={optIdx} questionContent={currentQItem.question.content} />
                      </div>
                      {isRevealed && isCorrect && (
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          Correct Answer
                        </span>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {!revealedReattempts[currentQItem.question.id] && reattemptAnswers[currentQItem.question.id] && (
          <div className="pt-3 border-t border-zinc-800 flex justify-end">
            <button
              type="button"
              onClick={() => setRevealedReattempts(prev => ({ ...prev, [currentQItem.question.id]: true }))}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              Verify My Re-Attempt
            </button>
          </div>
        )}
      </div>

      {revealedReattempts[currentQItem.question.id] && (
        <div className="bg-[#101116] border border-indigo-900/40 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="font-display font-bold text-white text-sm">
              Complete Analytical Solution
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
              Official Key: {formatCorrectAnswerKey(currentQItem.question.correctAnswer)}
            </span>
          </div>
          <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
            <AiExplanationCard
              qItem={currentQItem}
              customExplanation={customExplanation}
              isGenerating={isGeneratingExplanation}
              onGenerate={onGenerateAiExplanation}
            />
          </div>
        </div>
      )}
    </div>
  );
};
