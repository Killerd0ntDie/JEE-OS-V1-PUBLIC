import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, BookOpen, BarChart3, Brain, Printer, X 
} from 'lucide-react';
import { springs } from '@/constants/motion';
import { PageId } from '../../../../types';
import { storageAdapter } from '@/services/StorageAdapter';

export interface ResultHeaderProps {
  testName: string;
  questionCount: number;
  totalScore: number;
  totalMarks: number;
  accuracyRate: number;
  activeTab: 'questions' | 'forensics';
  handleTabChange: (newTab: 'questions' | 'forensics') => void;
  onClose: () => void;
  onNavigate?: (pageId: PageId) => void;
  correctCount: number;
  incorrectCount: number;
  setShowPrintModal: (val: boolean) => void;
}

export function ResultHeader({
  testName,
  questionCount,
  totalScore,
  totalMarks,
  accuracyRate,
  activeTab,
  handleTabChange,
  onClose,
  onNavigate,
  correctCount,
  incorrectCount,
  setShowPrintModal
}: ResultHeaderProps) {
  return (
    <header className="bg-[#101116] border border-zinc-800/90 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Test Title & Context */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer shrink-0"
            title="Return to Test Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-display font-bold text-white tracking-tight truncate max-w-md sm:max-w-xl">
                {testName}
              </h1>
              <span className="text-[10px] font-mono font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md shrink-0">
                {questionCount} Questions
              </span>
            </div>
          </div>
        </div>

        {/* Center: Clean Segmented Mode Glider */}
        <div className="flex items-center self-start md:self-center">
          <div className="flex gap-1 bg-zinc-950/80 border border-zinc-800/80 p-1 rounded-xl relative select-none">
            <button
              onClick={() => handleTabChange('questions')}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 ${
                activeTab === 'questions' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeTab === 'questions' && (
                <motion.div
                  layoutId="activeAnalysisTabGlider"
                  className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                  transition={springs.fluid}
                />
              )}
              <BookOpen className="w-3.5 h-3.5" />
              <span>Questions Studio</span>
            </button>

            <button
              onClick={() => handleTabChange('forensics')}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none z-10 flex items-center gap-1.5 ${
                activeTab === 'forensics' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeTab === 'forensics' && (
                <motion.div
                  layoutId="activeAnalysisTabGlider"
                  className="absolute inset-0 bg-indigo-600 rounded-lg shadow-sm -z-10"
                  transition={springs.fluid}
                />
              )}
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Performance Forensics</span>
            </button>
          </div>
        </div>

        {/* Right: Telemetry Pill & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <div className="hidden sm:flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/80 px-2.5 py-1 rounded-xl text-xs font-mono">
            <span className="font-bold text-indigo-300">
              {totalScore} / {totalMarks} M
            </span>
            <span className="text-zinc-600">•</span>
            <span className="font-bold text-emerald-400">
              {accuracyRate}% Acc
            </span>
          </div>

          <button
            onClick={() => {
              const prompt = `I just completed the Mock Test "${testName}". I scored ${totalScore} out of ${totalMarks}. I attempted ${correctCount + incorrectCount} questions, got ${correctCount} correct and ${incorrectCount} incorrect. Can you analyze my performance and suggest a revision strategy?`;
              storageAdapter.setSession('jeeos_pending_coach_prompt', prompt);
              onNavigate?.('ai-coach');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 rounded-xl border border-indigo-500/30 text-xs font-bold transition-colors cursor-pointer"
            title="Chat with AI Mentor about this Test"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Mentor</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 text-xs font-bold transition-colors cursor-pointer"
            title="Print Authentic NTA Exam Booklet & Step-by-Step Solutions (PDF)"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            title="Close Analysis"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
