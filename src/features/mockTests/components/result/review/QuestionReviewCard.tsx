import React from 'react';
import { 
  Clock, Check, Tag, Brain, CheckCircle2, XCircle, MinusCircle, Calendar 
} from 'lucide-react';
import { MockTest } from '@/types/mockTest';
import { RichTextRenderer } from '@/components/MathRenderer';
import { 
  EvaluatedMockQuestion,
  isMultiChoiceQuestion,
  isOptionSelectedInAnswer,
  getAllCorrectOptionIndices
} from '@/utils/mockScoring';

export interface QuestionReviewCardProps {
  qItem: EvaluatedMockQuestion;
  test: MockTest;
  mistakeTags: Record<string, string>;
  onSetMistakeTag: (qId: string, tagId: string) => void;
  pinnedQuestions: Record<string, boolean>;
  setPinnedQuestions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onAskAiMentor: (prompt: string) => void;
  actions: any;
}

export const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
  qItem,
  test: _test,
  mistakeTags,
  onSetMistakeTag,
  pinnedQuestions,
  setPinnedQuestions,
  onAskAiMentor,
  actions,
}) => {
  return (
    <div className="bg-[#101116] border border-zinc-800/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl min-w-0">
      {/* Meta Header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-white bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-lg">
            Q. {qItem.globalIndex}
          </span>
          <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">
            {isMultiChoiceQuestion(qItem.question) ? 'Multiple Choice (+4, -1)' : qItem.question.type === 'NUMERICAL' ? 'Numerical (+4, 0)' : 'Single Choice (+4, -1)'}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[180px]">
            {qItem.question.chapter || qItem.sectionSubject}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
            qItem.isCorrect
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : qItem.isIncorrect
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}>
            {qItem.isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
             qItem.isIncorrect ? <XCircle className="w-3 h-3 text-rose-400" /> :
             <MinusCircle className="w-3 h-3 text-zinc-400" />}
            <span>
              {qItem.isCorrect ? `+${qItem.question.marks.correct} M` : qItem.isIncorrect ? `${qItem.question.marks.incorrect} M` : '0 M'}
            </span>
          </span>

          <span className="text-zinc-500 text-[11px] font-mono flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span>{qItem.attempt.timeSpentSeconds || 0}s</span>
          </span>
        </div>
      </div>

      {/* Question Statement */}
      <div className="text-sm text-zinc-100 leading-relaxed font-sans min-w-0 max-w-full break-words overflow-x-auto custom-scrollbar">
        <RichTextRenderer content={qItem.question.content} imageUrl={qItem.question.imageUrl} />
      </div>

      {/* Option Cards */}
      {(qItem.question.type === 'MCQ' || qItem.question.type === 'MULTI' || (Array.isArray(qItem.question.options) && qItem.question.options.length > 0)) && qItem.question.options && (
        <div className="space-y-2.5 pt-1">
          {(() => {
            const correctIndices = getAllCorrectOptionIndices(qItem.question);
            return qItem.question.options.map((opt, optIdx) => {
              const optKey = String.fromCharCode(65 + optIdx);
              const isSelected = isOptionSelectedInAnswer(qItem.attempt.selectedAnswer, optIdx);
              const isCorrect = correctIndices.includes(optIdx);

              let cardStyle = 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:border-zinc-700/80';
              if (isCorrect) {
                cardStyle = 'bg-emerald-950/30 border-emerald-500/60 text-emerald-100 ring-1 ring-emerald-500/30';
              } else if (isSelected && !isCorrect) {
                cardStyle = 'bg-rose-950/30 border-rose-500/60 text-rose-100 ring-1 ring-rose-500/30';
              }

              return (
                <div
                  key={optIdx}
                  className={`p-3 rounded-2xl border transition-all duration-200 min-w-0 max-w-full ${cardStyle}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={`w-5 h-5 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                      isCorrect
                        ? 'bg-emerald-500 text-black'
                        : isSelected && !isCorrect
                        ? 'bg-rose-500 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {optKey}
                    </span>

                    {isSelected && !isCorrect && (
                      <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800/60 shrink-0 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>YOUR CHOICE</span>
                      </span>
                    )}
                    {isCorrect && isSelected && (
                      <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>YOUR CHOICE (CORRECT)</span>
                      </span>
                    )}
                    {isCorrect && !isSelected && (
                      <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60 shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>CORRECT ANSWER</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs sm:text-[13px] font-sans leading-relaxed min-w-0 break-words overflow-x-auto overflow-y-visible py-1 custom-scrollbar">
                    <RichTextRenderer content={opt} optIndex={optIdx} questionContent={qItem.question.content} />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Numerical Comparison */}
      {qItem.question.type === 'NUMERICAL' && (
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs font-mono">
          <div className="space-y-1">
            <span className="text-zinc-500 uppercase font-bold text-[10px] block">Your Value:</span>
            <div className={`text-sm font-bold ${qItem.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
              {qItem.attempt.selectedAnswer || 'Not Attempted'}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-500 uppercase font-bold text-[10px] block">Official Key:</span>
            <div className="text-sm font-bold text-emerald-400">
              {qItem.question.correctAnswer}
            </div>
          </div>
        </div>
      )}

      {/* Self-Audit Mistake Tagging Strip */}
      {qItem.isIncorrect && (
        <div className="p-3 bg-zinc-950/80 border border-rose-900/40 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-rose-300 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-rose-400" />
              Self-Audit: Why did you lose marks?
            </span>
            {mistakeTags[qItem.question.id] && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                Logged
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'calc_error', label: '🔢 Calc Slip', desc: 'Arithmetical or sign slip' },
              { id: 'concept_gap', label: '🧠 Concept Gap', desc: 'Didn’t understand core formula' },
              { id: 'formula_forgot', label: '📐 Formula Slip', desc: 'Misremembered formula' },
              { id: 'trap_caught', label: '🪤 Caught in Trap', desc: 'Fell for examiner distractor' },
              { id: 'time_rush', label: '⏱️ Time Pressure', desc: 'Rushed under the clock' }
            ].map(tag => {
              const isSelected = mistakeTags[qItem.question.id] === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onSetMistakeTag(qItem.question.id, tag.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-semibold transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                      : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                  title={tag.desc}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Action Row */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs flex-wrap gap-2">
        {(() => {
          const isPinned = !!pinnedQuestions[qItem.question.id];
          const chapterName = qItem.question.chapter || 'Chapter Revision';
          const topicName = qItem.question.topic || chapterName;
          const recommendedDuration = Math.max(15, Math.min(45, Math.ceil(((qItem.attempt.timeSpentSeconds || 120) * 1.5) / 60 / 5) * 5));

          return (
            <button
              type="button"
              disabled={isPinned}
              onClick={async () => {
                await actions.addCustomMission({
                  taskName: `Fix Mistake: ${topicName} (Q${qItem.globalIndex})`,
                  subject: qItem.sectionSubject,
                  chapter: chapterName,
                  type: 'Review Mistakes',
                  duration: recommendedDuration,
                  xp: 40
                });
                setPinnedQuestions(prev => ({ ...prev, [qItem.question.id]: true }));
              }}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                isPinned
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-bold'
                  : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {isPinned ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pinned to Revision Notebook ({recommendedDuration}m)</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bookmark for Revision ({recommendedDuration}m)</span>
                </>
              )}
            </button>
          );
        })()}

        <button
          type="button"
          onClick={() => {
            onAskAiMentor(`Can you explain the intuition and step-by-step approach for Question ${qItem.globalIndex}?`);
          }}
          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          title="Ask AI Mentor to explain this exact question"
        >
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ask AI Mentor</span>
        </button>
      </div>
    </div>
  );
};
