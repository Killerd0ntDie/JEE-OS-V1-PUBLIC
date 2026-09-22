import React from 'react';
import { 
  X, Delete, LayoutGrid, ChevronDown, ChevronUp 
} from 'lucide-react';
import { SubjectId } from '../../../../types';
import { MockTest, MockTestAttempt, MockTestSection, MockQuestion } from '../../../../types/mockTest';
import { RichTextRenderer, MathErrorBoundary } from '@/components/MathRenderer';
import { LiveStrategyTriageOverlay, TriageCategory } from '../LiveStrategyTriageOverlay';
import { isMultiChoiceQuestion, isOptionSelectedInAnswer } from '@/utils/mockScoring';
import { ArenaCountdown } from './ArenaCountdown';

export interface QuestionWorkspaceProps {
  test: MockTest;
  attempt: MockTestAttempt;
  currentSubject: SubjectId;
  setCurrentSubject: (sub: SubjectId) => void;
  currentQIdx: number;
  setCurrentQIdx: (idx: number) => void;
  activeSection: MockTestSection;
  activeQuestion: MockQuestion;
  currentAnswer: string;
  setCurrentAnswer: React.Dispatch<React.SetStateAction<string>>;
  triageMap: Record<string, TriageCategory>;
  setTriageMap: React.Dispatch<React.SetStateAction<Record<string, TriageCategory>>>;
  targetEndTime: number;
  isExamStarted: boolean;
  isAuthenticTheme: boolean;
  isMobilePaletteOpen: boolean;
  setIsMobilePaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  workspaceScrollRef: React.RefObject<HTMLDivElement | null>;
  handleKeypadPress: (val: string) => void;
  handleSubmitTest: () => void;
}

export function QuestionWorkspace({
  test,
  attempt,
  currentSubject,
  setCurrentSubject,
  currentQIdx,
  setCurrentQIdx,
  activeSection,
  activeQuestion,
  currentAnswer,
  setCurrentAnswer,
  triageMap,
  setTriageMap,
  targetEndTime,
  isExamStarted,
  isAuthenticTheme,
  isMobilePaletteOpen,
  setIsMobilePaletteOpen,
  workspaceScrollRef,
  handleKeypadPress,
  handleSubmitTest
}: QuestionWorkspaceProps) {
  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isAuthenticTheme ? 'bg-[#f8fafc]' : 'bg-[#070709]'}`}>
      {/* Subject Navigation Bar */}
      <div className={`h-11 border-b flex items-center px-2 sm:px-4 gap-1 sm:gap-2 shrink-0 overflow-x-auto ${
        isAuthenticTheme ? 'bg-[#e2e8f0] border-slate-300' : 'bg-[#0c0c0e] border-zinc-800'
      }`}>
        <span className={`text-[11px] font-mono font-bold uppercase mr-2 hidden sm:inline ${
          isAuthenticTheme ? 'text-slate-600' : 'text-zinc-500'
        }`}>Sections:</span>
        {test.sections.map((sec) => {
          const isActive = currentSubject === sec.subject;
          const answeredInSec = sec.questions.filter(q => attempt.questions[q.id]?.status === 'Answered').length;
          return (
            <button
              key={sec.subject}
              type="button"
              onClick={() => {
                setCurrentSubject(sec.subject);
                setCurrentQIdx(0);
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? (isAuthenticTheme ? 'bg-[#0b3366] text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm')
                  : (isAuthenticTheme 
                      ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300' 
                      : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800')
              }`}
            >
              <span>{sec.subject}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                isActive 
                  ? (isAuthenticTheme ? 'bg-[#154681] text-blue-100' : 'bg-indigo-700 text-indigo-100') 
                  : (isAuthenticTheme ? 'bg-slate-100 text-slate-600' : 'bg-zinc-800 text-zinc-400')
              }`}>
                {answeredInSec}/{sec.questions.length}
              </span>
            </button>
          );
        })}

        {/* Mobile Timer Badge */}
        <ArenaCountdown
          targetEndTime={targetEndTime}
          isExamStarted={isExamStarted}
          onExpire={handleSubmitTest}
          variant="mobile"
        />
      </div>

      {/* Question Meta Sub-Header */}
      <div className={`px-3 sm:px-6 py-2 border-b flex items-center justify-between gap-2 shrink-0 flex-wrap min-w-0 ${
        isAuthenticTheme ? 'bg-white border-slate-300' : 'bg-[#09090c] border-zinc-800/80'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className={`text-xs sm:text-sm font-bold shrink-0 ${
            isAuthenticTheme ? 'text-slate-900' : 'text-zinc-100'
          }`}>
            Question {currentQIdx + 1}
          </span>
          <span className={`text-[10px] sm:text-[11px] font-mono shrink-0 hidden min-[360px]:inline ${
            isAuthenticTheme ? 'text-slate-500' : 'text-zinc-500'
          }`}>
            ({activeSection.questions.length} Qs)
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase truncate max-w-[140px] min-[420px]:max-w-none border ${
            isAuthenticTheme ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
          }`}>
            <span className="sm:hidden">
              {isMultiChoiceQuestion(activeQuestion) ? 'Sec A: Multi' : activeQuestion.type === 'NUMERICAL' ? 'Sec B: Numerical' : 'Sec A: MCQ'}
            </span>
            <span className="hidden sm:inline">
              {isMultiChoiceQuestion(activeQuestion)
                ? 'Section A: Multiple Choice (One or More Correct)'
                : activeQuestion.type === 'NUMERICAL'
                ? 'Section B: Numerical Value'
                : 'Section A: Single Choice (MCQ)'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className={`text-[11px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 rounded border ${
            isAuthenticTheme 
              ? 'text-emerald-700 bg-emerald-50 border-emerald-300' 
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
          }`}>
            +{activeQuestion.marks.correct}
          </span>
          <span className={`text-[11px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 rounded border ${
            isAuthenticTheme 
              ? 'text-rose-700 bg-rose-50 border-rose-300' 
              : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
          }`}>
            {activeQuestion.marks.incorrect}
          </span>

          {/* Mobile Palette Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsMobilePaletteOpen(prev => !prev)}
            className={`lg:hidden flex items-center gap-1 px-2 py-1 rounded text-[11px] sm:text-xs font-medium cursor-pointer border ${
              isAuthenticTheme 
                ? 'bg-blue-100 text-blue-800 border-blue-300' 
                : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden min-[340px]:inline">Palette</span>
            {isMobilePaletteOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Question & Option Workspace */}
      <div 
        ref={workspaceScrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 flex flex-col min-h-0"
      >
        {/* Live Triage Strategy Bar */}
        <div className="mb-3 sm:mb-4 shrink-0">
          <LiveStrategyTriageOverlay
            targetEndTime={targetEndTime}
            totalDurationMinutes={test.durationMinutes}
            currentQuestionId={activeQuestion.id}
            triageMap={triageMap}
            onSetTriage={(qId, cat) => setTriageMap(prev => ({ ...prev, [qId]: cat }))}
          />
        </div>

        {/* Question Text with LaTeX rendering and diagram support */}
        <div className={`text-sm sm:text-base leading-relaxed mb-6 font-sans break-words shrink-0 min-h-fit ${
          isAuthenticTheme ? 'text-slate-900' : 'text-zinc-200'
        }`}>
          <MathErrorBoundary fallbackText="Question formula could not be displayed">
            <RichTextRenderer 
              content={activeQuestion.content || (activeQuestion as any).questionBody || (activeQuestion as any).text || (activeQuestion as any).question || ''} 
              imageUrl={activeQuestion.imageUrl}
            />
          </MathErrorBoundary>
        </div>

        {/* Answer Input Area: MCQs vs Numerical with On-Screen Keypad */}
        <div className="pt-2 max-w-3xl shrink-0">
          {(activeQuestion.type === 'MCQ' || activeQuestion.type === 'MULTI' || (Array.isArray(activeQuestion.options) && activeQuestion.options.length > 0)) && Array.isArray(activeQuestion.options) && activeQuestion.options.length > 0 ? (
            <div className="space-y-2.5">
              {(() => {
                const isMulti = isMultiChoiceQuestion(activeQuestion);
                return activeQuestion.options.map((opt, idx) => {
                  const optionLetter = String.fromCharCode(65 + idx);
                  const isSelected = isOptionSelectedInAnswer(currentAnswer, idx);

                  const handleToggleOption = () => {
                    if (isMulti) {
                      let currentLetters = (currentAnswer || '')
                        .replace(/[^A-D]/gi, '')
                        .toUpperCase()
                        .split('');
                      if (currentLetters.length === 0 && currentAnswer) {
                        currentLetters = (currentAnswer.match(/[0-3]/g) || []).map(n => String.fromCharCode(65 + parseInt(n, 10)));
                      }
                      if (currentLetters.includes(optionLetter)) {
                        currentLetters = currentLetters.filter(l => l !== optionLetter);
                      } else {
                        currentLetters.push(optionLetter);
                      }
                      currentLetters.sort();
                      setCurrentAnswer(currentLetters.join(''));
                    } else {
                      setCurrentAnswer(idx.toString());
                    }
                  };

                  return (
                    <label
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleOption();
                      }}
                      className={`flex items-start gap-3.5 py-3 sm:py-3.5 px-4 min-h-[3.25rem] rounded-lg border cursor-pointer transition-all overflow-visible ${
                        isSelected
                          ? (isAuthenticTheme 
                              ? 'bg-blue-50/90 border-blue-600 text-blue-950 font-semibold ring-1 ring-blue-500' 
                              : 'bg-indigo-600/15 border-indigo-500 text-white')
                          : (isAuthenticTheme 
                              ? 'bg-white border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50' 
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900')
                      }`}
                    >
                      <input
                        type={isMulti ? "checkbox" : "radio"}
                        name={`q-${activeQuestion.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleOption()}
                        className="hidden"
                      />
                      <div className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-1 transition-colors ${
                        isSelected
                          ? (isAuthenticTheme ? 'bg-[#0b3366] text-white border border-[#0b3366]' : 'bg-indigo-600 text-white border border-indigo-400')
                          : (isAuthenticTheme ? 'bg-slate-100 border border-slate-300 text-slate-700' : 'bg-zinc-800 border border-zinc-700 text-zinc-400')
                      }`}>
                        {isSelected && isMulti ? '✓' : optionLetter}
                      </div>
                      <div className="text-xs sm:text-sm font-medium flex-1 py-0.5 overflow-visible">
                        <MathErrorBoundary fallbackText="Option could not be displayed">
                          <RichTextRenderer 
                            content={opt} 
                            optIndex={idx} 
                            questionContent={activeQuestion.content || (activeQuestion as any).questionBody || (activeQuestion as any).text || ''} 
                          />
                        </MathErrorBoundary>
                      </div>
                      <kbd className={`hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded border self-center ${
                        isAuthenticTheme ? 'text-slate-500 bg-slate-100 border-slate-300' : 'text-zinc-500 bg-zinc-800 border-zinc-700'
                      }`}>
                        {idx + 1}
                      </kbd>
                    </label>
                  );
                });
              })()}
            </div>
          ) : (
            /* AUTHENTIC NTA CBT NUMERICAL ON-SCREEN KEYPAD */
            <div className={`rounded-xl p-5 sm:p-6 my-3 space-y-4 max-w-md border ${
              isAuthenticTheme ? 'bg-white border-slate-300 shadow-sm' : 'bg-zinc-900/50 border-zinc-800'
            }`}>
              <div>
                <label className={`block text-xs font-mono font-bold uppercase tracking-wider mb-2 ${
                  isAuthenticTheme ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  Numerical Value Response:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentAnswer}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^-?\d*\.?\d*$/.test(val) && val.length <= 10) {
                        setCurrentAnswer(val);
                      } else {
                        e.target.value = currentAnswer;
                      }
                    }}
                    placeholder="Click keypad or type number..."
                    className={`w-full border rounded-lg px-4 py-2.5 text-xl font-mono font-bold tracking-wider focus:outline-none ${
                      isAuthenticTheme 
                        ? 'bg-slate-50 border-slate-300 text-blue-900 focus:border-blue-600' 
                        : 'bg-[#070709] border-zinc-700 focus:border-indigo-500 text-indigo-300'
                    }`}
                  />
                  {currentAnswer && (
                    <button
                      type="button"
                      onClick={() => setCurrentAnswer('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer ${
                        isAuthenticTheme ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title="Clear"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Virtual NTA Calculator Keypad */}
              <div className="space-y-2">
                <div className={`text-[10px] font-mono uppercase flex justify-between items-center ${
                  isAuthenticTheme ? 'text-slate-500' : 'text-zinc-500'
                }`}>
                  <span>On-Screen Virtual Keypad</span>
                  <span className={isAuthenticTheme ? 'text-slate-400' : 'text-zinc-600'}>NTA Standard Layout</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['7', '8', '9', 'CLEAR'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className={`py-2 rounded font-mono text-sm font-bold border transition-colors cursor-pointer ${
                        key === 'CLEAR'
                          ? (isAuthenticTheme 
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300' 
                              : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800')
                          : (isAuthenticTheme 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700')
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                  {['4', '5', '6', 'BACKSPACE'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className={`py-2 rounded font-mono text-sm font-bold border transition-colors cursor-pointer ${
                        key === 'BACKSPACE'
                          ? (isAuthenticTheme 
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 flex items-center justify-center' 
                              : 'bg-amber-950/60 hover:bg-amber-900 text-amber-300 border-amber-800 flex items-center justify-center')
                          : (isAuthenticTheme 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700')
                      }`}
                    >
                      {key === 'BACKSPACE' ? <Delete className="w-4 h-4" /> : key}
                    </button>
                  ))}
                  {['1', '2', '3', '-'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className={`py-2 rounded font-mono text-sm font-bold border transition-colors cursor-pointer ${
                        key === '-'
                          ? (isAuthenticTheme 
                              ? 'bg-slate-100 hover:bg-slate-200 text-blue-900 border-slate-300 font-bold' 
                              : 'bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border-zinc-700')
                          : (isAuthenticTheme 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700')
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                  {['0', '.', '00', '↵'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className={`py-2 rounded font-mono text-sm font-bold border transition-colors cursor-pointer ${
                        key === '↵'
                          ? (isAuthenticTheme 
                              ? 'bg-[#28a745] hover:bg-[#218838] text-white border-[#1e7e34]' 
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500')
                          : (isAuthenticTheme 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700')
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
