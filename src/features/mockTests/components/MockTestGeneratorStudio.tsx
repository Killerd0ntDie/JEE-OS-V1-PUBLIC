import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Zap, BookOpen, Layers, X, Search, CheckCircle2, 
  AlertCircle, ArrowRight, Clock, Target, Award, Loader2, 
  StopCircle, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { springs } from '@/constants/motion';
import { SubjectId } from '@/types/index';
import { MockTest } from '@/types/mockTest';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { 
  MockTestGeneratorService, 
  GenerationProgress, 
  MockGeneratorMode 
} from '../services/MockTestGeneratorService';
import { storageAdapter } from '@/services/StorageAdapter';

interface MockTestGeneratorStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onTestGenerated: (test: MockTest) => void;
  onOpenPyqUploader?: () => void;
  initialMode?: MockGeneratorMode;
  initialSubject?: SubjectId;
  initialChapterId?: string;
}

export function MockTestGeneratorStudio({
  isOpen,
  onClose,
  onTestGenerated,
  onOpenPyqUploader,
  initialMode,
  initialSubject,
  initialChapterId
}: MockTestGeneratorStudioProps) {
  const chapters = useStudyBrainStore(state => state.chapters) || [];

  // Studio Mode: FULL_JEE (75 Qs or Express 30 Qs), SUBJECT_SPRINT (25 Qs), CHAPTER_DRILL (10-25 Qs)
  const [activeMode, setActiveMode] = useState<MockGeneratorMode>(initialMode || 'FULL_JEE');

  useEffect(() => {
    if (isOpen) {
      if (initialMode) setActiveMode(initialMode);
      if (initialSubject) {
        setSelectedSubject(initialSubject);
        setChapterSubject(initialSubject);
      }
      if (initialChapterId) {
        setSelectedChapterId(initialChapterId);
      }
    }
  }, [initialMode, initialSubject, initialChapterId, isOpen]);

  const [difficulty, setDifficulty] = useState<'JEE_MAIN' | 'JEE_ADVANCED'>('JEE_MAIN');

  // Full JEE Options
  const [fullJeeVariant, setFullJeeVariant] = useState<'FULL_75' | 'EXPRESS_30'>('FULL_75');

  // Subject Sprint Options
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>('physics');

  // Chapter Drill Options
  const [chapterSubject, setChapterSubject] = useState<SubjectId>('physics');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterCount, setChapterCount] = useState<10 | 15 | 25>(15);

  // Generation & Telemetry State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Gemini API Key State & Health Detection
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);
  const [localKey, setLocalKey] = useState<string>(() => {
    return storageAdapter.getGeminiApiKey() || '';
  });
  const [isKeyInputOpen, setIsKeyInputOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (typeof data.hasGeminiKey === 'boolean') {
          setHasServerKey(data.hasGeminiKey);
        }
      })
      .catch(() => setHasServerKey(false));
  }, []);

  const isAiConnected = Boolean(hasServerKey || localKey);

  const handleSaveKey = () => {
    const trimmed = keyDraft.trim();
    if (trimmed) {
      storageAdapter.setGeminiApiKey(trimmed);
      setLocalKey(trimmed);
      setIsKeyInputOpen(false);
      setKeyDraft('');
    }
  };

  const handleClearKey = () => {
    storageAdapter.removeGeminiApiKey();
    setLocalKey('');
    setIsKeyInputOpen(false);
  };

  // Filter chapters by subject & search query
  const filteredChapters = useMemo(() => {
    return chapters
      .filter(c => c.subject === chapterSubject)
      .filter(c => c.name.toLowerCase().includes(chapterSearch.toLowerCase()));
  }, [chapters, chapterSubject, chapterSearch]);

  // Set default selected chapter if none selected or if subject changes
  const activeChapter = useMemo(() => {
    if (!filteredChapters.length) return null;
    return filteredChapters.find(c => c.id === selectedChapterId) || filteredChapters[0];
  }, [filteredChapters, selectedChapterId]);

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setProgress(null);
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let generatedTest: MockTest;

      if (activeMode === 'FULL_JEE') {
        if (fullJeeVariant === 'FULL_75') {
          generatedTest = await MockTestGeneratorService.generateFullJeeMock(
            { difficulty },
            setProgress,
            signal
          );
        } else {
          generatedTest = await MockTestGeneratorService.generateExpressMiniMock(
            { difficulty },
            setProgress,
            signal
          );
        }
      } else if (activeMode === 'SUBJECT_SPRINT') {
        generatedTest = await MockTestGeneratorService.generateSubjectMock(
          { subject: selectedSubject, difficulty, questionCount: 25 },
          setProgress,
          signal
        );
      } else {
        // CHAPTER_DRILL
        if (!activeChapter) {
          throw new Error('Please select a chapter to synthesize questions.');
        }
        generatedTest = await MockTestGeneratorService.generateChapterMock(
          {
            subject: chapterSubject,
            chapterId: activeChapter.id,
            chapterName: activeChapter.name,
            questionCount: chapterCount,
            difficulty
          },
          setProgress,
          signal
        );
      }

      onTestGenerated(generatedTest);
      onClose();
    } catch (err: any) {
      if (signal.aborted || err.name === 'AbortError') {
        console.log('Mock generation cancelled by user.');
        return;
      }
      console.error('Mock synthesis failure:', err);
      setErrorMessage(err.message || 'Failed to generate mock test. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isGenerating ? () => {} : onClose}
      zIndex={120}
      backdropClassName="bg-black/35 backdrop-blur-sm p-3 sm:p-6"
      className="w-full max-w-3xl h-[660px] max-h-[85vh] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-left surface-1 flex flex-col overflow-hidden"
    >
      {/* Top bar with close button */}
      {!isGenerating && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-zinc-700 z-10"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-indigo-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
            Mock Test Generator Studio
          </h2>
          <p className="text-xs font-mono text-zinc-400">
            Multi-Batch Question Synthesizer • NTA Standard Blueprints • Zero Duplicate Cache
          </p>
        </div>
      </div>

      {/* AI Engine Status Banner & Key Switcher */}
      <div className="mb-4 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isAiConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Gemini AI Engine Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Offline Seed Bank Active (Instant Mode)
            </span>
          )}
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            {isAiConnected 
              ? 'Synthesizing authentic, original questions via Google Gemini API'
              : 'Add GEMINI_API_KEY in .env.local or enter here for live AI synthesis'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setKeyDraft(localKey);
            setIsKeyInputOpen(prev => !prev);
          }}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer border border-zinc-700"
        >
          <span>{localKey ? 'Edit Key' : 'Configure API Key'}</span>
        </button>
      </div>

      {isKeyInputOpen && (
        <div className="mb-4 p-3 rounded-xl bg-black/40 border border-indigo-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">Gemini API Key:</span>
            {localKey && (
              <button
                type="button"
                onClick={handleClearKey}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-mono cursor-pointer"
              >
                Clear Key
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy... (Gemini API Key)"
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveKey}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              Save Key
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono">
            Key is stored locally in your browser and used securely to synthesize authentic JEE questions.
          </p>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white font-bold text-[11px]"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* TELEMETRY HUD (When generating) */}
      {isGenerating ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col justify-center py-4 space-y-5 overflow-y-auto custom-scrollbar"
        >
          {/* Active Stage & Spinner */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                Live Multi-Batch Synthesis
              </span>
              <h3 className="text-lg font-display font-bold text-white">
                {progress?.stage || 'Initializing Pipeline...'}
              </h3>
            </div>
            <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>{progress?.percent ?? 0}%</span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 relative">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, progress?.percent ?? 0)}%` }}
                transition={{ ease: 'easeOut', duration: 0.4 }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400">
              <span>{progress?.message || 'Connecting to generation cluster...'}</span>
              <span>
                Step {progress?.currentStep ?? 1} / {progress?.totalSteps ?? 1}
              </span>
            </div>
          </div>

          {/* Telemetry Architecture Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-left">
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Layers className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold">10-Question Batches</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Guarantees complete LaTeX formulas and step-by-step derivations without output clipping.
              </p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-left">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold">Resilient Fallback</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Curated offline seed bank ensures instant test generation even when offline or quota-limited.
              </p>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-xl p-3 text-left">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-[11px] font-mono font-bold">NTA Pattern Engine</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Strict +4/-1 MCQ marking and non-negative integer numerical formats.
              </p>
            </div>
          </div>

          {/* Abort Button */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleCancelGeneration}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              <span>Cancel Synthesis</span>
            </button>
          </div>
        </motion.div>
      ) : (
        /* CONFIGURATION INTERFACE */
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Main Mode Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/10 p-1.5 rounded-2xl shrink-0 mb-3">
            <button
              onClick={() => setActiveMode('FULL_JEE')}
              className={`relative py-3 px-2 rounded-xl text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-1 ${
                activeMode === 'FULL_JEE'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeMode === 'FULL_JEE' && (
                <motion.div
                  layoutId="studioModeGlider"
                  className="absolute inset-0 bg-indigo-600 rounded-xl -z-10 shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                  transition={springs.fluid}
                />
              )}
              <Award className="w-4 h-4" />
              <span className="font-display font-bold text-xs sm:text-sm">Full JEE Mock</span>
              <span className="text-[10px] font-mono opacity-80">75 or 30 Qs</span>
            </button>

            <button
              onClick={() => setActiveMode('SUBJECT_SPRINT')}
              className={`relative py-3 px-2 rounded-xl text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-1 ${
                activeMode === 'SUBJECT_SPRINT'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeMode === 'SUBJECT_SPRINT' && (
                <motion.div
                  layoutId="studioModeGlider"
                  className="absolute inset-0 bg-indigo-600 rounded-xl -z-10 shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                  transition={springs.fluid}
                />
              )}
              <Zap className="w-4 h-4" />
              <span className="font-display font-bold text-xs sm:text-sm">Subject Sprint</span>
              <span className="text-[10px] font-mono opacity-80">25 Questions</span>
            </button>

            <button
              onClick={() => setActiveMode('CHAPTER_DRILL')}
              className={`relative py-3 px-2 rounded-xl text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-1 ${
                activeMode === 'CHAPTER_DRILL'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeMode === 'CHAPTER_DRILL' && (
                <motion.div
                  layoutId="studioModeGlider"
                  className="absolute inset-0 bg-indigo-600 rounded-xl -z-10 shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                  transition={springs.fluid}
                />
              )}
              <BookOpen className="w-4 h-4" />
              <span className="font-display font-bold text-xs sm:text-sm">Chapter Drill</span>
              <span className="text-[10px] font-mono opacity-80">10, 15, or 25 Qs</span>
            </button>
          </div>

          {/* SCROLLABLE MODE CONFIGURATION BODY */}
          <div className="flex-1 overflow-y-auto pr-1 my-1 custom-scrollbar space-y-4">
            {/* MODE 1: FULL JEE CONFIGURATION */}
          {activeMode === 'FULL_JEE' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 75 Qs Option */}
                <div
                  onClick={() => setFullJeeVariant('FULL_75')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all text-left relative ${
                    fullJeeVariant === 'FULL_75'
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-600/10'
                      : 'bg-black/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                      NTA STANDARD
                    </span>
                    <span className="text-xs font-mono text-zinc-400 font-bold">180 Mins</span>
                  </div>
                  <h4 className="text-base font-display font-bold text-white mb-1">
                    75 Questions Grand Simulation
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                    Authentic 3-subject simulation: 25 Physics, 25 Chemistry, 25 Mathematics (20 MCQs + 5 Numericals each).
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 border-t border-white/5 pt-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>3 Hours</span>
                    <span className="text-zinc-600">•</span>
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>300 Marks</span>
                  </div>
                </div>

                {/* 30 Qs Option */}
                <div
                  onClick={() => setFullJeeVariant('EXPRESS_30')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all text-left relative ${
                    fullJeeVariant === 'EXPRESS_30'
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-600/10'
                      : 'bg-black/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                      HIGH-SPEED SPRINT
                    </span>
                    <span className="text-xs font-mono text-zinc-400 font-bold">60 Mins</span>
                  </div>
                  <h4 className="text-base font-display font-bold text-white mb-1">
                    30 Questions Express Mini
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                    Fast multi-subject warm-up: 10 Physics, 10 Chemistry, 10 Mathematics in 3 fast batches.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 border-t border-white/5 pt-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>1 Hour</span>
                    <span className="text-zinc-600">•</span>
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>120 Marks</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* MODE 2: SUBJECT SPRINT CONFIGURATION */}
          {activeMode === 'SUBJECT_SPRINT' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-left">
                <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold block mb-2">
                  Select Subject Section
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['physics', 'chemistry', 'maths'] as const).map(sub => {
                    const isSelected = selectedSubject === sub;
                    const subTitle = sub.charAt(0).toUpperCase() + sub.slice(1);
                    return (
                      <button
                        key={sub}
                        onClick={() => setSelectedSubject(sub)}
                        className={`py-3 px-4 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-md'
                            : 'bg-black/20 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <span className="font-display font-bold text-sm block">{subTitle}</span>
                        <span className="text-[10px] font-mono text-zinc-400">25 Questions</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject blueprint overview */}
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <span>
                    Pattern: <strong className="text-white">20 MCQs (+4/-1) + 5 Numericals (+4/0)</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-zinc-400 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>60 Mins • 100 Marks</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* MODE 3: CHAPTER DRILL CONFIGURATION */}
          {activeMode === 'CHAPTER_DRILL' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 text-left"
            >
              {/* Subject Switcher */}
              <div className="flex gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl font-mono text-xs">
                {(['physics', 'chemistry', 'maths'] as const).map(sub => {
                  const isActive = chapterSubject === sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => setChapterSubject(sub)}
                      className={`flex-1 py-1.5 rounded-lg uppercase font-bold text-center transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>

              {/* Question Count Picker */}
              <div>
                <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold block mb-2">
                  Question Volume & Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([10, 15, 25] as const).map(cnt => {
                    const isSelected = chapterCount === cnt;
                    const mins = cnt === 10 ? 30 : cnt === 15 ? 45 : 60;
                    return (
                      <button
                        key={cnt}
                        onClick={() => setChapterCount(cnt)}
                        className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-sm'
                            : 'bg-black/20 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <span className="font-display font-bold text-sm block">{cnt} Qs</span>
                        <span className="text-[10px] font-mono text-zinc-500">{mins} mins</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chapter Search & List */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold block">
                  Select Chapter
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    placeholder={`Search ${chapterSubject} chapters...`}
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500/80 font-sans"
                  />
                </div>
                
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredChapters.map(chap => {
                    const isSelected = activeChapter?.id === chap.id;
                    return (
                      <div
                        key={chap.id}
                        onClick={() => setSelectedChapterId(chap.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600/25 border-indigo-500/80 text-white font-semibold'
                            : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{chap.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick link to PYQ Paper PDF Uploader */}
          {onOpenPyqUploader && (
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Have an official PDF question paper? Extract questions into a CBT test.</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenPyqUploader();
                }}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-mono text-[11px] font-bold transition-colors cursor-pointer"
              >
                Upload Paper PDF →
              </button>
            </div>
          )}
          </div>

          {/* Difficulty & Pattern Options */}
          <div className="shrink-0 pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Target Standard
              </span>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setDifficulty('JEE_MAIN')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    difficulty === 'JEE_MAIN'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  JEE Main
                </button>
                <button
                  onClick={() => setDifficulty('JEE_ADVANCED')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    difficulty === 'JEE_ADVANCED'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  JEE Advanced
                </button>
              </div>
            </div>

            {/* Launch Action */}
            <button
              onClick={handleStartGeneration}
              disabled={isGenerating || (activeMode === 'CHAPTER_DRILL' && !activeChapter)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-xs uppercase font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {activeMode === 'FULL_JEE'
                  ? fullJeeVariant === 'FULL_75'
                    ? 'Synthesize Full 75 Qs Exam'
                    : 'Synthesize 30 Qs Mini'
                  : activeMode === 'SUBJECT_SPRINT'
                  ? `Synthesize 25 Qs ${selectedSubject}`
                  : `Synthesize ${chapterCount} Qs Drill`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
