import React from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'motion/react';
import { 
  AlertTriangle, BookOpen, Printer, X, HelpCircle, 
  Check, Shield, Maximize2, ShieldAlert 
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { MockTest, MockTestAttempt } from '../../types/mockTest';
import { useAuth } from '@/features/auth';
import { PrintableTestPaperModal } from './components/PrintableTestPaperModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { useExamEngine } from './hooks/useExamEngine';
import { ArenaHeader } from './components/arena/ArenaHeader';
import { QuestionWorkspace } from './components/arena/QuestionWorkspace';
import { ExamControls } from './components/arena/ExamControls';
import { ExamPalette } from './components/arena/ExamPalette';
import { ArenaCountdown } from './components/arena/ArenaCountdown';

interface MockTestArenaProps {
  test: MockTest;
  onComplete: (attempt: MockTestAttempt) => void;
  onExit: () => void;
  initialExamStarted?: boolean;
}

export function MockTestArena({ test, onComplete, onExit, initialExamStarted = false }: MockTestArenaProps) {
  const { user } = useAuth();
  const userId = user?.uid || 'guest';
  const candidateName = user?.displayName || (userId === 'guest' ? 'Guest Aspirant' : 'Candidate');

  const {
    isAuthenticTheme,
    toggleTheme,
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    isExamStarted,
    handleBeginExam,
    proctorWarnings,
    isProctorAlertOpen,
    setIsProctorAlertOpen,
    proctorAlertMessage,
    triageMap,
    setTriageMap,
    isInitializing,
    currentSubject,
    setCurrentSubject,
    currentQIdx,
    setCurrentQIdx,
    targetEndTime,
    attempt,
    isSubmitting,
    isConfirmSubmitOpen,
    setIsConfirmSubmitOpen,
    isConfirmExitOpen,
    setIsConfirmExitOpen,
    isDuplicateTab,
    currentAnswer,
    setCurrentAnswer,
    activeSection,
    activeQuestion,
    questionAttempts,
    counts,
    workspaceScrollRef,
    isMobilePaletteOpen,
    setIsMobilePaletteOpen,
    isQuestionPaperOpen,
    setIsQuestionPaperOpen,
    isInstructionsOpen,
    setIsInstructionsOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    showPrintModal,
    setShowPrintModal,
    handleResumeInThisTab,
    navigateToQuestion,
    handleNext,
    handlePrev,
    handleSaveAndNext,
    handleSaveAndMark,
    handleMarkForReview,
    handleClear,
    handleKeypadPress,
    handleSubmitTest,
    handleConfirmExitAndDiscard
  } = useExamEngine({
    test,
    userId,
    initialExamStarted,
    onComplete,
    onExit
  });

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070709] text-zinc-300 font-sans flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Initializing NTA CBT Arena...</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-2 px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel / Exit
          </button>
        </div>
      </div>
    );
  }

  if (!test.sections || test.sections.length === 0 || !activeSection || !activeQuestion) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070709] text-zinc-300 font-sans flex items-center justify-center p-4">
        <div className="max-w-md text-center p-6 bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl space-y-4">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <h2 className="text-base font-bold text-zinc-100">Empty or Invalid Mock Test</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This test does not contain playable question sections. Please check the question format or generate a new mock test.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
          >
            Exit Arena
          </button>
        </div>
      </div>
    );
  }

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[99990] w-screen h-screen font-sans flex flex-col overflow-hidden select-none ${
        isAuthenticTheme ? 'bg-[#f4f6f9] text-slate-900' : 'bg-[#070709] text-zinc-200'
      }`}
    >
      {/* 1. TOP NTA CBT HEADER BAR */}
      <ArenaHeader
        test={test}
        candidateName={candidateName}
        isAuthenticTheme={isAuthenticTheme}
        toggleTheme={toggleTheme}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        proctorWarnings={proctorWarnings}
        setIsQuestionPaperOpen={setIsQuestionPaperOpen}
        setIsInstructionsOpen={setIsInstructionsOpen}
        setIsShortcutsOpen={setIsShortcutsOpen}
      />

      {/* 2. MAIN TESTING ARENA (SPLIT VIEW: LEFT QUESTION AREA, RIGHT PALETTE) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Subject Tabs, Question View, Answer Controls, Action Footer */}
        <div className={`flex-1 flex flex-col overflow-hidden ${isAuthenticTheme ? 'bg-[#f8fafc]' : 'bg-[#070709]'}`}>
          <QuestionWorkspace
            test={test}
            attempt={attempt}
            currentSubject={currentSubject}
            setCurrentSubject={setCurrentSubject}
            currentQIdx={currentQIdx}
            setCurrentQIdx={setCurrentQIdx}
            activeSection={activeSection}
            activeQuestion={activeQuestion}
            currentAnswer={currentAnswer}
            setCurrentAnswer={setCurrentAnswer}
            triageMap={triageMap}
            setTriageMap={setTriageMap}
            targetEndTime={targetEndTime}
            isExamStarted={isExamStarted}
            isAuthenticTheme={isAuthenticTheme}
            isMobilePaletteOpen={isMobilePaletteOpen}
            setIsMobilePaletteOpen={setIsMobilePaletteOpen}
            workspaceScrollRef={workspaceScrollRef}
            handleKeypadPress={handleKeypadPress}
            handleSubmitTest={handleSubmitTest}
          />

          <ExamControls
            isAuthenticTheme={isAuthenticTheme}
            handleSaveAndNext={handleSaveAndNext}
            handleSaveAndMark={handleSaveAndMark}
            handleClear={handleClear}
            handleMarkForReview={handleMarkForReview}
            handlePrev={handlePrev}
            handleNext={handleNext}
          />
        </div>

        {/* Right Side: NTA CBT PALETTE & TIMER DOCK */}
        <ExamPalette
          isAuthenticTheme={isAuthenticTheme}
          isMobilePaletteOpen={isMobilePaletteOpen}
          targetEndTime={targetEndTime}
          isExamStarted={isExamStarted}
          counts={counts}
          activeSection={activeSection}
          currentSubject={currentSubject}
          currentQIdx={currentQIdx}
          attempt={attempt}
          navigateToQuestion={navigateToQuestion}
          setIsConfirmSubmitOpen={setIsConfirmSubmitOpen}
          handleSubmitTest={handleSubmitTest}
        />
      </div>

      {/* 4. QUESTION PAPER OVERVIEW MODAL */}
      <Modal
        isOpen={isQuestionPaperOpen}
        onClose={() => setIsQuestionPaperOpen(false)}
        className="max-w-4xl w-full"
        zIndex={100000}
      >
        <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Question Paper Overview</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Print Authentic NTA Question Paper (PDF)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Paper (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQuestionPaperOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {test.sections.map((sec) => (
              <div key={sec.subject} className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase text-indigo-400 tracking-wider pb-1 border-b border-zinc-800">
                  {sec.subject} ({sec.questions.length} Questions)
                </h3>
                <div className="space-y-3">
                  {sec.questions.map((q, idx) => {
                    const status = attempt.questions[q.id]?.status || 'Not Visited';
                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setCurrentSubject(sec.subject);
                          setCurrentQIdx(idx);
                          setIsQuestionPaperOpen(false);
                        }}
                        className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors flex items-start gap-3"
                      >
                        <span className="w-7 h-7 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                            {q.content.replace(/\$+/g, '')}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                            <span>{q.type}</span>
                            <span>•</span>
                            <span className="text-indigo-400">Status: {status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 5. INSTRUCTIONS & MARKING SCHEME MODAL */}
      <Modal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        className="max-w-2xl w-full"
        zIndex={100000}
      >
        <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-100">NTA CBT Examination Instructions</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsInstructionsOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4 text-xs text-zinc-300 leading-relaxed overflow-y-auto">
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-100">General Instructions:</h4>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>Total test duration is {test.durationMinutes} minutes.</li>
                <li>The clock will be set at the server. The countdown timer at the top right displays remaining time.</li>
                <li>When the timer reaches zero, the examination will end automatically and answers will be submitted.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <h4 className="font-bold text-zinc-100">Marking Scheme:</h4>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong className="text-emerald-400">+4 Marks</strong> for each correct answer.</li>
                <li><strong className="text-rose-400">-1 Mark</strong> for each incorrect MCQ answer.</li>
                <li><strong className="text-zinc-200">0 Marks</strong> for unanswered questions or incorrect numerical questions.</li>
                <li>Questions marked for review that have an answer selected <strong>will be evaluated</strong> in the final scoring.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <h4 className="font-bold text-zinc-100">Navigating to a Question:</h4>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>Click on the question number in the Question Palette to go directly to that question.</li>
                <li>Click <strong>Save & Next</strong> to save your answer and proceed to the next question.</li>
                <li>Click <strong>Mark for Review & Next</strong> to save your answer and mark it for review.</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>

      {/* 6. SUBMIT EXAM CONFIRMATION MODAL */}
      <Modal
        isOpen={isConfirmSubmitOpen}
        onClose={() => setIsConfirmSubmitOpen(false)}
        className="max-w-md w-full"
        zIndex={100000}
      >
        <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Submit CBT Examination?</h3>
              <p className="text-xs text-zinc-400">Review your attempt telemetry before submitting:</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3.5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Questions:</span>
              <span className="text-zinc-200 font-bold">{questionAttempts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400">Answered:</span>
              <span className="text-emerald-400 font-bold">{counts.answered + counts.answeredMarked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-400">Not Answered:</span>
              <span className="text-rose-400 font-bold">{counts.notAnswered}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-400">Marked for Review:</span>
              <span className="text-indigo-400 font-bold">{counts.markedReview}</span>
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsConfirmSubmitOpen(false)}
              className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Resume Test
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirmSubmitOpen(false);
                handleSubmitTest();
              }}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              Confirm & Submit
            </button>
          </div>
        </div>
      </Modal>

      {/* 7. EXIT EXAM CONFIRMATION MODAL */}
      <Modal
        isOpen={isConfirmExitOpen}
        onClose={() => setIsConfirmExitOpen(false)}
        className="max-w-md w-full"
        zIndex={100000}
      >
        <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Exit Examination?</h3>
              <p className="text-xs text-zinc-400">Progress in this session will be discarded.</p>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsConfirmExitOpen(false)}
              className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Resume Test
            </button>
            <button
              type="button"
              onClick={handleConfirmExitAndDiscard}
              className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              Exit & Discard
            </button>
          </div>
        </div>
      </Modal>

      {/* 8. SUBMITTING SPINNER OVERLAY */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100010] bg-black/85 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest animate-pulse">
              Calculating Scores & Submitting...
            </p>
          </div>
        </div>
      )}

      {/* 8.4 CBT SECURE PRE-FLIGHT GATEWAY (USER GESTURE LAUNCHER) */}
      {!isExamStarted && !isInitializing && !isSubmitting && (
        <div className="fixed inset-0 z-[100020] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-xl w-full bg-[#0d0d12] border-2 border-indigo-500/60 rounded-2xl p-6 sm:p-8 shadow-[0_0_80px_rgba(99,102,241,0.3)] space-y-6 text-left">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Shield className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                    CBT Secure Exam Environment
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300">
                    READY
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">
                  National Testing Agency (NTA) Standard Interface
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="text-sm font-bold text-white border-b border-zinc-800 pb-2">
                {test.name}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-black/40 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400 font-mono uppercase">Duration</div>
                  <div className="text-xs font-bold text-indigo-400 font-mono">{test.durationMinutes || 180} mins</div>
                </div>
                <div className="bg-black/40 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400 font-mono uppercase">Questions</div>
                  <div className="text-xs font-bold text-white font-mono">
                    {test.sections?.reduce((sum, s) => sum + (s.questions?.length || 0), 0) || 0} Qs
                  </div>
                </div>
                <div className="bg-black/40 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400 font-mono uppercase">Total Marks</div>
                  <div className="text-xs font-bold text-white font-mono">{test.totalMarks || 300}</div>
                </div>
                <div className="bg-black/40 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-400 font-mono uppercase">Marking</div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">+4 / -1</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5 text-xs text-zinc-300 leading-relaxed">
              <div className="font-semibold text-indigo-300 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
                Examination Proctoring Protocol
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400">
                <li>Continuous fullscreen mode is required to maintain CBT integrity.</li>
                <li>Exiting fullscreen, switching tabs, or minimizing window registers an infraction.</li>
                <li>Accumulating 3 infractions results in immediate automatic exam submission.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleBeginExam}
                className="flex-1 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Enter Fullscreen & Begin Exam</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="py-3 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-white text-xs font-mono transition-colors text-center cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8.5 UNIFIED FULL-SCREEN PROCTOR WARNING & LOCKOUT SHIELD */}
      {isExamStarted && (!isFullscreen || isProctorAlertOpen) && !isInitializing && !isSubmitting && (
        <div className="fixed inset-0 z-[100020] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-lg w-full bg-[#0d0d12] border-2 border-rose-500/80 rounded-2xl p-6 sm:p-8 shadow-[0_0_80px_rgba(244,63,94,0.35)] space-y-6 text-left">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert className="w-8 h-8 animate-pulse text-rose-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                    Anti-Cheat Alert
                  </h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    proctorWarnings >= 3 ? 'bg-rose-600 text-white' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {proctorWarnings >= 3 ? 'AUTO-SUBMITTING' : `WARNING ${proctorWarnings}/3`}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">
                  NTA CBT Strict Proctoring & Exam Integrity Active
                </p>
              </div>
            </div>

            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-semibold">Test Timer Status:</span>
                <ArenaCountdown
                  targetEndTime={targetEndTime}
                  isExamStarted={isExamStarted}
                  onExpire={handleSubmitTest}
                  variant="proctor"
                />
              </div>
              <div className="text-xs text-rose-200 font-mono whitespace-pre-line leading-relaxed border-t border-rose-900/40 pt-2">
                {proctorAlertMessage || "You exited Fullscreen Mode! CBT guidelines require active continuous fullscreen throughout the test."}
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed pt-1">
                Exam timer is continuous and does <strong className="text-white">NOT</strong> pause during infractions. All test interaction, question viewing, and answer selection are locked out while outside fullscreen mode.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Infraction Allowance:</span>
                <span className="font-bold text-white">{proctorWarnings} / 3 Infractions</span>
              </div>
              <div className="flex gap-1.5 h-2">
                <div className={`flex-1 rounded-full ${proctorWarnings >= 1 ? 'bg-rose-500' : 'bg-zinc-800'}`} />
                <div className={`flex-1 rounded-full ${proctorWarnings >= 2 ? 'bg-rose-500' : 'bg-zinc-800'}`} />
                <div className={`flex-1 rounded-full ${proctorWarnings >= 3 ? 'bg-rose-600 animate-pulse' : 'bg-zinc-800'}`} />
              </div>
              <p className="text-[10px] text-zinc-400">
                Notice: Navigating away, minimizing browser, or reaching 3 infractions triggers immediate automatic submission of your exam.
              </p>
            </div>

            <div className="pt-2">
              {proctorWarnings < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsProctorAlertOpen(false);
                    enterFullscreen();
                  }}
                  className="w-full py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Return to Fullscreen & Resume Test</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-center font-mono text-xs text-rose-300 font-bold animate-pulse">
                  Maximum infractions reached (3/3). Auto-submitting exam telemetry...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8.6 NTA STANDARD PRINTABLE TEST PAPER MODAL */}
      <PrintableTestPaperModal
        test={test}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        defaultMode="QUESTION_PAPER"
      />

      {/* 9. CBT KEYBOARD SHORTCUTS REFERENCE MODAL */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* 9.5 DUPLICATE TAB EXCLUSIVITY LOCK MODAL */}
      <Modal
        isOpen={isDuplicateTab}
        onClose={() => {}}
        className="max-w-md w-full"
        zIndex={100002}
      >
        <div className="bg-[#0c0c0e] border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-white">Exam Active in Another Tab</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This mock test is active in another browser window or tab. To protect exam state integrity and prevent desynchronized timer data, an exam can only be active in one tab at a time.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleResumeInThisTab}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Resume In This Tab
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>,
    document.body
  );
}
