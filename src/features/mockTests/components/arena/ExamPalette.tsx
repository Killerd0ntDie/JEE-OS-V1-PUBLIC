import React from 'react';
import { Clock, Check } from 'lucide-react';
import { SubjectId } from '../../../../types';
import { MockTestAttempt, MockTestSection, QuestionStatus } from '../../../../types/mockTest';
import { ArenaCountdown } from './ArenaCountdown';

export interface ExamPaletteProps {
  isAuthenticTheme: boolean;
  isMobilePaletteOpen: boolean;
  targetEndTime: number;
  isExamStarted: boolean;
  counts: {
    answered: number;
    notAnswered: number;
    notVisited: number;
    markedReview: number;
    answeredMarked: number;
  };
  activeSection: MockTestSection;
  currentSubject: SubjectId;
  currentQIdx: number;
  attempt: MockTestAttempt;
  navigateToQuestion: (idx: number) => void;
  setIsConfirmSubmitOpen: (open: boolean) => void;
  handleSubmitTest: () => void;
}

export const getStatusBadgeStyle = (status: QuestionStatus, isAuthentic = false) => {
  switch (status) {
    case 'Answered':
      return isAuthentic
        ? 'bg-[#28a745] text-white rounded font-mono font-bold shadow-xs'
        : 'bg-emerald-600 text-white rounded font-mono font-bold shadow-xs';
    case 'Not Answered':
      return isAuthentic
        ? 'bg-[#dc3545] text-white rounded font-mono font-bold shadow-xs'
        : 'bg-rose-600 text-white rounded font-mono font-bold shadow-xs';
    case 'Marked for Review':
      return isAuthentic
        ? 'bg-[#6f42c1] text-white rounded-full font-mono font-bold shadow-xs'
        : 'bg-indigo-600 text-white rounded-full font-mono font-bold shadow-xs';
    case 'Answered & Marked for Review':
      return isAuthentic
        ? 'bg-[#6f42c1] text-white rounded-full font-mono font-bold relative after:content-[""] after:absolute after:w-2 after:h-2 after:bg-[#28a745] after:rounded-full after:-bottom-0.5 after:-right-0.5 ring-2 ring-[#28a745] shadow-xs'
        : 'bg-indigo-600 text-white rounded-full font-mono font-bold relative after:content-[""] after:absolute after:w-2 after:h-2 after:bg-emerald-400 after:rounded-full after:-bottom-0.5 after:-right-0.5 ring-1 ring-emerald-400 shadow-xs';
    default:
      return isAuthentic
        ? 'bg-white text-slate-700 border border-slate-300 rounded font-mono font-medium shadow-xs'
        : 'bg-zinc-800 text-zinc-300 border border-zinc-700 rounded font-mono font-medium';
  }
};

export function ExamPalette({
  isAuthenticTheme,
  isMobilePaletteOpen,
  targetEndTime,
  isExamStarted,
  counts,
  activeSection,
  currentSubject,
  currentQIdx,
  attempt,
  navigateToQuestion,
  setIsConfirmSubmitOpen,
  handleSubmitTest
}: ExamPaletteProps) {
  return (
    <aside className={`w-full lg:w-80 border-t lg:border-l lg:border-t-0 flex flex-col shrink-0 overflow-hidden ${
      isAuthenticTheme ? 'bg-[#f8fafc] border-slate-300' : 'bg-[#0c0c0e] border-zinc-800'
    } ${
      isMobilePaletteOpen ? 'max-h-[65vh] flex' : 'hidden lg:flex max-h-full'
    }`}>
      {/* Big Countdown Timer */}
      <div className={`p-4 border-b ${
        isAuthenticTheme ? 'border-slate-300 bg-[#eef2f6]' : 'border-zinc-800 bg-[#09090c]'
      }`}>
        <div className={`flex items-center justify-between mb-1 text-xs ${
          isAuthenticTheme ? 'text-slate-600' : 'text-zinc-400'
        }`}>
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className={`w-4 h-4 ${isAuthenticTheme ? 'text-[#0b3366]' : 'text-indigo-400'}`} />
            <span>Time Remaining</span>
          </div>
          <span className={`text-[10px] font-mono ${isAuthenticTheme ? 'text-slate-500' : 'text-zinc-500'}`}>Auto-submits at 00:00</span>
        </div>
        <ArenaCountdown
          targetEndTime={targetEndTime}
          isExamStarted={isExamStarted}
          onExpire={handleSubmitTest}
          variant="desktop"
        />
      </div>

      {/* 5-Status Official NTA Palette Legend (with Deuteranopia Shape Indicators) */}
      <div className={`p-2.5 sm:p-3 border-b grid grid-cols-2 gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-mono font-bold ${
        isAuthenticTheme ? 'border-slate-300 text-slate-700 bg-white' : 'border-zinc-800 text-zinc-400 bg-transparent'
      }`}>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0" title="Answered (Marked with checkmark)">
          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-white text-[10px] sm:text-xs shrink-0 font-bold shadow-xs ${
            isAuthenticTheme ? 'bg-[#28a745]' : 'bg-emerald-600'
          }`}>
            {counts.answered}
          </div>
          <span className="truncate flex items-center gap-1">
            <span className="font-black text-emerald-500" aria-hidden="true">✓</span>
            <span>Answered</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0" title="Not Answered (Marked with cross)">
          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-white text-[10px] sm:text-xs shrink-0 font-bold shadow-xs ${
            isAuthenticTheme ? 'bg-[#dc3545]' : 'bg-rose-600'
          }`}>
            {counts.notAnswered}
          </div>
          <span className="truncate flex items-center gap-1">
            <span className="font-bold text-rose-500" aria-hidden="true">✕</span>
            <span>Not Answered</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0" title="Not Visited (Neutral square)">
          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-[10px] sm:text-xs shrink-0 font-bold border ${
            isAuthenticTheme ? 'bg-white border-slate-300 text-slate-700' : 'bg-zinc-800 border-zinc-700 text-zinc-300'
          }`}>
            {counts.notVisited}
          </div>
          <span className="truncate flex items-center gap-1">
            <span className="text-slate-400" aria-hidden="true">◻</span>
            <span>Not Visited</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0" title="Marked for Review (Circle)">
          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs shrink-0 font-bold shadow-xs ${
            isAuthenticTheme ? 'bg-[#6f42c1]' : 'bg-indigo-600'
          }`}>
            {counts.markedReview}
          </div>
          <span className="truncate flex items-center gap-1">
            <span className="text-indigo-400" aria-hidden="true">●</span>
            <span>Marked Review</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 col-span-2 min-w-0" title="Answered & Marked for Review (Circle with checkmark)">
          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full relative after:content-[''] after:absolute after:w-1.5 after:h-1.5 after:rounded-full after:-bottom-0.5 after:-right-0.5 flex items-center justify-center text-white text-[9px] sm:text-[10px] shrink-0 font-bold shadow-xs ${
            isAuthenticTheme 
              ? 'bg-[#6f42c1] ring-1 ring-[#28a745] after:bg-[#28a745]' 
              : 'bg-indigo-600 border border-emerald-400 after:bg-emerald-400'
          }`}>
            {counts.answeredMarked}
          </div>
          <span className="truncate flex items-center gap-1">
            <span className="font-bold text-purple-400" aria-hidden="true">●<span className="text-emerald-400 text-[9px] font-black">✓</span></span>
            <span>Answered & Marked for Review</span>
          </span>
        </div>
      </div>

      {/* Question Numbers Grid with Accessibility & CSS content-visibility Optimization */}
      <div 
        role="region" 
        aria-label="Question Navigation Palette" 
        className={`flex-1 overflow-y-auto p-3 sm:p-4 ${
          isAuthenticTheme ? 'bg-[#f4f6f9]' : 'bg-[#070709]'
        }`}
      >
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${
            isAuthenticTheme ? 'text-slate-700' : 'text-zinc-400'
          }`}>
            {currentSubject} Palette
          </h3>
          <span className={`text-[10px] font-mono ${
            isAuthenticTheme ? 'text-slate-500' : 'text-zinc-500'
          }`}>
            {activeSection.questions.length} Questions
          </span>
        </div>

        <div className="grid grid-cols-5 min-[360px]:grid-cols-6 sm:grid-cols-5 gap-1.5 sm:gap-2">
          {activeSection.questions.map((q, idx) => {
            const entry = attempt.questions[q.id];
            const status = entry?.status ?? 'Not Visited';
            const isCurrent = currentQIdx === idx;
            const badgeStyle = getStatusBadgeStyle(status, isAuthenticTheme);

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => navigateToQuestion(idx)}
                aria-label={`Question ${idx + 1}, ${status}${isCurrent ? ', Currently Selected' : ''}`}
                aria-current={isCurrent ? "true" : undefined}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '36px' }}
                className={`h-8 sm:h-9 text-xs flex items-center justify-center transition-all cursor-pointer ${badgeStyle} ${
                  isCurrent 
                    ? (isAuthenticTheme ? 'ring-2 ring-blue-600 scale-105 z-10 shadow-md' : 'ring-2 ring-white scale-105 z-10 shadow-md')
                    : 'hover:opacity-85'
                }`}
              >
                <span className="flex items-center justify-center gap-0.5">
                  <span>{idx + 1}</span>
                  {status === 'Answered' && (
                    <span className="text-[9px] font-black leading-none ml-0.5" aria-hidden="true">✓</span>
                  )}
                  {status === 'Not Answered' && (
                    <span className="text-[8px] font-bold leading-none ml-0.5" aria-hidden="true">✕</span>
                  )}
                  {status === 'Marked for Review' && (
                    <span className="text-[8px] leading-none ml-0.5" aria-hidden="true">●</span>
                  )}
                  {status === 'Answered & Marked for Review' && (
                    <span className="text-[8px] font-black leading-none ml-0.5 text-emerald-300" aria-hidden="true">✓</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Test Button */}
      <div className={`p-4 border-t ${
        isAuthenticTheme ? 'border-slate-300 bg-[#eef2f6]' : 'border-zinc-800 bg-[#0c0c0e]'
      }`}>
        <button
          type="button"
          onClick={() => setIsConfirmSubmitOpen(true)}
          className={`w-full py-2.5 text-white text-xs font-mono font-bold tracking-widest uppercase rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
            isAuthenticTheme ? 'bg-[#0b3366] hover:bg-[#082245]' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>Submit Test</span>
        </button>
      </div>
    </aside>
  );
}
