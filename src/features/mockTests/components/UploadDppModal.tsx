import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, FileText, CheckCircle2, AlertCircle, Loader2, 
  Sparkles, X, ArrowRight, Clock, BookOpen, Layers, Check,
  Atom, FlaskConical, Calculator, Wand2, Edit3
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { PdfPaperParserService, DppMetadataAnalysis, validatePdfMagicBytes } from '../services/PdfPaperParserService';
import { MockTest } from '@/types/mockTest';
import { SubjectId } from '@/types';
import { springs } from '@/constants/motion';
import { ParsedQuestionsReviewModal } from './ParsedQuestionsReviewModal';

interface UploadDppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestCreated?: (test: MockTest) => void;
  initialSubject?: SubjectId;
  initialChapterId?: string;
  initialChapterName?: string;
}

const SUBJECT_THEME_MAP = {
  physics: {
    name: 'Physics',
    icon: Atom,
    accent: 'sky',
    border: 'border-sky-500/40',
    shadowGlow: 'shadow-[0_0_50px_rgba(56,189,248,0.22)]',
    headerIconBg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    dropActiveBorder: 'border-sky-500 bg-sky-500/10',
    dropSuccessBorder: 'border-sky-500/60 bg-sky-950/20',
    pillActive: 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/30',
    durationPill: 'bg-sky-600 text-white border-sky-500',
    processButton: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-600/30',
    launchButton: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-600/25',
    focusBorder: 'focus:border-sky-500',
    badgeText: 'text-sky-400',
    badgeBg: 'bg-sky-950/50 border-sky-800/60 text-sky-300'
  },
  chemistry: {
    name: 'Chemistry',
    icon: FlaskConical,
    accent: 'amber',
    border: 'border-amber-500/40',
    shadowGlow: 'shadow-[0_0_50px_rgba(245,158,11,0.22)]',
    headerIconBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    dropActiveBorder: 'border-amber-500 bg-amber-500/10',
    dropSuccessBorder: 'border-amber-500/60 bg-amber-950/20',
    pillActive: 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30',
    durationPill: 'bg-amber-600 text-white border-amber-500',
    processButton: 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/30',
    launchButton: 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/25',
    focusBorder: 'focus:border-amber-500',
    badgeText: 'text-amber-400',
    badgeBg: 'bg-amber-950/50 border-amber-800/60 text-amber-300'
  },
  maths: {
    name: 'Mathematics',
    icon: Calculator,
    accent: 'rose',
    border: 'border-rose-500/40',
    shadowGlow: 'shadow-[0_0_50px_rgba(244,63,94,0.22)]',
    headerIconBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    dropActiveBorder: 'border-rose-500 bg-rose-500/10',
    dropSuccessBorder: 'border-rose-500/60 bg-rose-950/20',
    pillActive: 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30',
    durationPill: 'bg-rose-600 text-white border-rose-500',
    processButton: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/30',
    launchButton: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/25',
    focusBorder: 'focus:border-rose-500',
    badgeText: 'text-rose-400',
    badgeBg: 'bg-rose-950/50 border-rose-800/60 text-rose-300'
  }
};

export function UploadDppModal({ isOpen, onClose, onTestCreated, initialSubject, initialChapterId, initialChapterName }: UploadDppModalProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const chapters = useStudyBrainStore(state => state.chapters) || [];

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [targetSubject, setTargetSubject] = useState<SubjectId>(initialSubject || 'physics');
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(initialChapterId);
  const [selectedChapter, setSelectedChapter] = useState<string>(initialChapterName || 'General Concept Drill');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [examMode, setExamMode] = useState<'main' | 'advanced'>('main');
  
  // AI Auto-Fill & Parsing State
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<DppMetadataAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsedTest, setParsedTest] = useState<MockTest | null>(null);
  const [isReviewStudioOpen, setIsReviewStudioOpen] = useState(false);
  const [isScannedPdf, setIsScannedPdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSubject) setTargetSubject(initialSubject);
      if (initialChapterId) setSelectedChapterId(initialChapterId);
      if (initialChapterName) setSelectedChapter(initialChapterName);
    }
  }, [isOpen, initialSubject, initialChapterId, initialChapterName]);

  const filteredChapters = chapters.filter(c => c.subject === targetSubject);
  const currentTheme = SUBJECT_THEME_MAP[targetSubject] || SUBJECT_THEME_MAP.physics;
  const HeaderIcon = currentTheme.icon;

  const resetState = () => {
    setSelectedFile(null);
    setCustomTitle('');
    setTargetSubject(initialSubject || 'physics');
    setSelectedChapterId(initialChapterId);
    setSelectedChapter(initialChapterName || 'General Concept Drill');
    setDurationMinutes(45);
    setExamMode('main');
    setIsAnalyzingAi(false);
    setAiAnalysisResult(null);
    setIsProcessing(false);
    setStatusText('');
    setError(null);
    setParsedTest(null);
    setIsReviewStudioOpen(false);
    setIsScannedPdf(false);
  };

  const forceClose = () => {
    resetState();
    onClose();
  };

  const handleClose = () => {
    if (parsedTest && !isProcessing) {
      const confirmed = window.confirm('You have parsed questions ready to save. Are you sure you want to close and discard them?');
      if (!confirmed) return;
    }
    forceClose();
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
      setError('Please select a valid PDF file (.pdf).');
      return;
    }
    if (file.size === 0) {
      setError('The selected PDF file is empty (0 bytes). Please choose a valid coaching DPP.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('PDF file exceeds 15 MB limit. Please use a smaller or text-based PDF for best results.');
      return;
    }
    const isValidMagic = await validatePdfMagicBytes(file);
    if (!isValidMagic) {
      setError('Invalid PDF file: Missing authentic %PDF- header. The file may be renamed, corrupted, or not a genuine PDF.');
      return;
    }
    setError(null);
    setSelectedFile(file);

    // Pre-flight check for scanned / image-only PDF (MED-02)
    setIsScannedPdf(false);
    PdfPaperParserService.detectScannedPdf(file)
      .then(res => {
        if (res.isScanned) setIsScannedPdf(true);
      })
      .catch(() => {});

    // Set immediate default clean name
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setCustomTitle(cleanName);

    // Trigger AI Auto-Fill Analysis for title, subject, chapter, and duration
    setIsAnalyzingAi(true);
    try {
      const analysis = await PdfPaperParserService.analyzeDppMetadata(file, chapters);
      if (analysis) {
        setAiAnalysisResult(analysis);
        if (analysis.title) setCustomTitle(analysis.title);
        
        // Find best matching chapter across all subjects
        let detectedSubject = analysis.subject;
        let matchedChap = chapters.find(c => c.name.toLowerCase() === analysis.chapterName?.toLowerCase());
        if (!matchedChap && analysis.chapterName && analysis.chapterName !== 'General Concept Drill') {
          matchedChap = chapters.find(c => {
            const chapName = c.name.toLowerCase();
            const target = analysis.chapterName.toLowerCase();
            return chapName.includes(target) || target.includes(chapName);
          });
        }
        if (matchedChap && matchedChap.subject) {
          detectedSubject = matchedChap.subject;
        }

        // Only preserve initial binding if user specifically opened uploader for a dedicated chapter
        const isPreLockedChapter = Boolean(initialChapterId || initialChapterName);
        if (!isPreLockedChapter) {
          if (detectedSubject) setTargetSubject(detectedSubject);
          if (matchedChap) {
            setSelectedChapter(matchedChap.name);
            setSelectedChapterId(matchedChap.id);
          } else if (analysis.chapterName && analysis.chapterName !== 'General Concept Drill') {
            setSelectedChapter(analysis.chapterName);
          }
        }
        if (analysis.recommendedDurationMinutes) {
          setDurationMinutes(analysis.recommendedDurationMinutes);
        }
      }
    } catch (err) {
      console.warn("AI metadata extraction encountered an issue, kept default name:", err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setError(null);
    setIsProcessing(true);
    setStatusText('Preparing coaching DPP splitter...');

    try {
      const matchedChap = chapters.find(c => c.id === selectedChapterId) || 
                          chapters.find(c => c.name.toLowerCase() === selectedChapter.toLowerCase() && c.subject === targetSubject) ||
                          chapters.find(c => c.name.toLowerCase() === selectedChapter.toLowerCase());
      const finalChapterId = selectedChapterId || matchedChap?.id;
      const finalChapterName = matchedChap?.name || selectedChapter;

      const test = await PdfPaperParserService.parseDppToMockTest(selectedFile, {
        dppTitle: customTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, ''),
        subject: targetSubject,
        chapterId: finalChapterId,
        chapterName: finalChapterName,
        durationMinutes,
        examMode,
        onProgress: (status) => setStatusText(status)
      });

      // Defensively stamp chapter details, creation timestamp, and custom flag
      test.chapterId = finalChapterId;
      test.chapterName = finalChapterName;
      test.createdAt = Date.now();
      test.isCustom = true;
      test.source = 'dpp';
      test.sections.forEach(sec => {
        sec.questions.forEach(q => {
          q.chapter = finalChapterName;
        });
      });

      setParsedTest(test);
      setIsProcessing(false);
    } catch (err: any) {
      console.error("DPP parsing failure:", err);
      setError(err.message || 'Failed to parse DPP worksheet. Please ensure the document is clear text.');
      setIsProcessing(false);
    }
  };

  const handleSaveToBank = async () => {
    if (!parsedTest) return;
    try {
      await actions.addCustomMockTest(parsedTest);
      forceClose();
    } catch (err) {
      console.error("Failed to save DPP test:", err);
      setError("Failed to save DPP to database.");
    }
  };

  const handleStartDrillImmediately = async () => {
    if (!parsedTest) return;
    const testToLaunch = parsedTest;
    try {
      await actions.addCustomMockTest(testToLaunch);
    } catch (e) {
      console.warn("Storage sync warning:", e);
    }
    forceClose();
    onTestCreated?.(testToLaunch);
  };

  const totalExtractedQuestions = parsedTest?.sections.reduce((sum, s) => sum + s.questions.length, 0) || 0;
  const mcqCount = parsedTest?.sections.reduce((sum, s) => sum + s.questions.filter(q => q.type !== 'NUMERICAL').length, 0) || 0;
  const numCount = parsedTest?.sections.reduce((sum, s) => sum + s.questions.filter(q => q.type === 'NUMERICAL').length, 0) || 0;
  const verifiedCount = parsedTest?.sections.reduce((sum, s) => sum + s.questions.filter(q => q.isVerified).length, 0) || 0;

  return (
    <>
      <Modal
        isOpen={isOpen && !isReviewStudioOpen}
        onClose={handleClose}
        zIndex={100010}
        className={`max-w-xl w-full overflow-hidden p-3.5 sm:p-4 bg-[#0d0d12] border-2 ${currentTheme.border} ${currentTheme.shadowGlow} text-white rounded-2xl transition-colors duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
      <div className="space-y-2.5 font-sans text-left">
        {/* Header with Dynamic Subject Icon & Theme */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div 
              key={targetSubject}
              initial={{ scale: 0.85, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={springs.bouncy}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-200 ${currentTheme.headerIconBg}`}
            >
              <HeaderIcon className="w-3.5 h-3.5" />
            </motion.div>
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white font-display truncate">
                  Coaching DPP & Assignment Solver
                </h2>
                <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${currentTheme.badgeBg}`}>
                  {currentTheme.name}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                Transform Allen, Resonance, FIITJEE, PW sheets into timed CBT drills
              </p>
            </div>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={springs.snappy}
            onClick={handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Error Notification */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.snappy}
            className="p-2 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2 font-mono"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ================= STEP 1: UPLOAD & CONFIGURATION ================= */}
          {!parsedTest ? (
            <motion.div
              key="step-upload-config"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={springs.gentle}
              className="space-y-2"
            >
              {/* File Drag and Drop Zone */}
              <motion.div
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                transition={springs.snappy}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                  selectedFile ? 'py-1.5 px-3' : 'py-2.5 px-3'
                } ${
                  dragActive
                    ? currentTheme.dropActiveBorder
                    : selectedFile
                    ? currentTheme.dropSuccessBorder
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1 rounded-md border ${currentTheme.headerIconBg}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-xs sm:max-w-sm">{selectedFile.name}</div>
                        <div className="text-[9.5px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">Ready</span>
                          {isAnalyzingAi && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-sky-400 animate-pulse">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                <span>AI thinking...</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setAiAnalysisResult(null);
                      }}
                      className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-0.5 py-0.5">
                    <FileUp className={`w-5 h-5 mx-auto ${currentTheme.badgeText}`} />
                    <div className="text-xs font-bold text-zinc-200">
                      Drop coaching DPP or worksheet PDF here
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-mono">
                      Supports Allen, Resonance, FIITJEE, PW text & scanned worksheets
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Scanned PDF / Vision OCR Pre-Flight Notice (MED-02) */}
              <AnimatePresence>
                {isScannedPdf && selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={springs.snappy}
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <p className="font-semibold text-amber-300">Scanned / Image-Only Document Detected</p>
                      <p className="text-[11px] text-amber-300/80 leading-relaxed">
                        No embedded digital text layer was found in this PDF. JEE-OS will automatically use Gemini Vision OCR to transcribe questions, formulas, and diagrams. Processing may take slightly longer.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Auto-Detected Intelligence Banner */}
              <AnimatePresence>
                {aiAnalysisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={springs.snappy}
                    className={`py-1.5 px-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${currentTheme.badgeBg}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-md bg-white/10 shrink-0">
                        <Wand2 className={`w-3 h-3 ${currentTheme.badgeText}`} />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-white text-[10.5px] truncate">
                          AI Inferred: {aiAnalysisResult.title}
                        </div>
                        <div className="text-[9.5px] opacity-80 font-mono flex items-center gap-1.5 mt-0.5">
                          {aiAnalysisResult.detectedInstitute && aiAnalysisResult.detectedInstitute !== 'null' && aiAnalysisResult.detectedInstitute !== 'undefined' && (
                            <span>{aiAnalysisResult.detectedInstitute} •</span>
                          )}
                          <span>{aiAnalysisResult.chapterName}</span>
                          <span>•</span>
                          <span>~{aiAnalysisResult.questionCountEstimate} Qs</span>
                          <span>•</span>
                          <span>{aiAnalysisResult.recommendedDurationMinutes}m</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
                      Auto-filled
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* DPP Parameters Container */}
              <div className="space-y-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850">
                {/* Title Input */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      DPP Title / Sheet Name:
                    </label>
                    {aiAnalysisResult?.title && (
                      <span className={`text-[8.5px] font-mono flex items-center gap-1 ${currentTheme.badgeText}`}>
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Detected
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Allen Physics DPP #04 - Rotational Dynamics"
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-600 outline-none transition-all font-sans ${currentTheme.focusBorder}`}
                  />
                </div>

                {/* Subject Selector with Sliding Spring Pill */}
                <div className="space-y-0.5">
                  <label className="text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    Target Subject:
                  </label>
                  <div className="grid grid-cols-3 gap-1 font-mono text-xs p-0.5 bg-zinc-950/80 rounded-xl border border-zinc-850">
                    {(['physics', 'chemistry', 'maths'] as SubjectId[]).map((subj) => {
                      const isSelected = targetSubject === subj;
                      const subjTheme = SUBJECT_THEME_MAP[subj];
                      const SubjIcon = subjTheme.icon;

                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => {
                            setTargetSubject(subj);
                            setSelectedChapter('General Concept Drill');
                            setSelectedChapterId(undefined);
                          }}
                          className={`relative py-1 px-1.5 rounded-lg font-bold uppercase transition-colors cursor-pointer text-center select-none text-[10.5px] ${
                            isSelected ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="dppSubjectHighlight"
                              className={`absolute inset-0 rounded-lg ${subjTheme.pillActive}`}
                              transition={springs.snappy}
                            />
                          )}
                          <span className="relative z-10 flex items-center justify-center gap-1.5">
                            <SubjIcon className="w-3 h-3" />
                            <span>{subj}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chapter Mapping */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Chapter Focus Tag:
                    </label>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {filteredChapters.length} {currentTheme.name} Chapters Available
                    </span>
                  </div>
                  <select
                    value={selectedChapter}
                    onChange={(e) => {
                      const name = e.target.value;
                      setSelectedChapter(name);
                      const matched = filteredChapters.find(ch => ch.name === name);
                      setSelectedChapterId(matched?.id);
                    }}
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none transition-all font-sans ${currentTheme.focusBorder}`}
                  >
                    <option value="General Concept Drill">General / Mixed Syllabus Drill</option>
                    {filteredChapters.map((chap) => (
                      <option key={chap.id} value={chap.name}>
                        {chap.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration Presets with Sliding Spring Pill */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Target Solving Duration:
                    </label>
                    {aiAnalysisResult?.recommendedDurationMinutes && (
                      <span className={`text-[8.5px] font-mono flex items-center gap-1 ${currentTheme.badgeText}`}>
                        <Clock className="w-2.5 h-2.5" />
                        AI Inferred
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1 font-mono text-xs p-0.5 bg-zinc-950/80 rounded-xl border border-zinc-850">
                    {[
                      { label: '30m (Speed)', mins: 30 },
                      { label: '45m (Standard)', mins: 45 },
                      { label: '60m (Deep)', mins: 60 }
                    ].map((preset) => {
                      const isSelected = durationMinutes === preset.mins;

                      return (
                        <button
                          key={preset.mins}
                          type="button"
                          onClick={() => setDurationMinutes(preset.mins)}
                          className={`relative py-1 rounded-lg font-bold transition-colors cursor-pointer text-center select-none text-[10.5px] ${
                            isSelected ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="dppDurationHighlight"
                              className={`absolute inset-0 rounded-lg ${currentTheme.durationPill}`}
                              transition={springs.snappy}
                            />
                          )}
                          <span className="relative z-10">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Exam Mode Marking Scheme */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Marking Scheme:
                    </label>
                    <span className="text-[8.5px] text-zinc-500 font-mono">
                      {examMode === 'advanced' ? 'Adv (+3 Single / +4 Multi / -2 Wrong)' : 'Main (+4 Single / -1 Wrong / -2 Multi)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 font-mono text-xs p-0.5 bg-zinc-950/80 rounded-xl border border-zinc-850">
                    <button
                      type="button"
                      onClick={() => setExamMode('main')}
                      className={`relative py-1 rounded-lg font-bold transition-colors cursor-pointer text-center select-none text-[10.5px] ${
                        examMode === 'main' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {examMode === 'main' && (
                        <motion.div
                          layoutId="dppExamModeHighlight"
                          className={`absolute inset-0 rounded-lg ${currentTheme.durationPill}`}
                          transition={springs.snappy}
                        />
                      )}
                      <span className="relative z-10">JEE Main (+4 / -1)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExamMode('advanced')}
                      className={`relative py-1 rounded-lg font-bold transition-colors cursor-pointer text-center select-none text-[10.5px] ${
                        examMode === 'advanced' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {examMode === 'advanced' && (
                        <motion.div
                          layoutId="dppExamModeHighlight"
                          className={`absolute inset-0 rounded-lg ${currentTheme.durationPill}`}
                          transition={springs.snappy}
                        />
                      )}
                      <span className="relative z-10">JEE Advanced (+4 / -2)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Action with Dynamic Spring Hover & Subject Gradient */}
              <motion.button
                type="button"
                whileHover={selectedFile && !isProcessing && !isAnalyzingAi ? { scale: 1.01 } : {}}
                whileTap={selectedFile && !isProcessing && !isAnalyzingAi ? { scale: 0.98 } : {}}
                transition={springs.snappy}
                disabled={!selectedFile || isProcessing || isAnalyzingAi}
                onClick={handleProcess}
                className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !selectedFile || isProcessing || isAnalyzingAi
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : currentTheme.processButton
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>{statusText || 'Extracting questions...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Extract & Build Interactive DPP Drill</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          ) : (
            /* ================= STEP 2: PARSED PREVIEW & LAUNCH ================= */
            <motion.div
              key="step-parsed-preview"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              transition={springs.gentle}
              className="space-y-3"
            >
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${currentTheme.badgeBg}`}>
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <CheckCircle2 className={`w-4 h-4 ${currentTheme.badgeText}`} />
                  <span className="text-white">DPP Converted to CBT Format</span>
                </div>
                <div className="text-xs text-zinc-300">
                  <strong className="text-white">{parsedTest.name}</strong>
                </div>

                {/* Stats Strip */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="bg-black/50 p-2 rounded-lg border border-zinc-800">
                    <div className="text-[9px] text-zinc-400 uppercase tracking-wider">Total Questions</div>
                    <div className="text-sm font-bold text-white mt-0.5">{totalExtractedQuestions}</div>
                  </div>
                  <div className="bg-black/50 p-2 rounded-lg border border-zinc-800">
                    <div className="text-[9px] text-zinc-400 uppercase tracking-wider">MCQ / Numerical</div>
                    <div className={`text-sm font-bold mt-0.5 ${currentTheme.badgeText}`}>
                      {mcqCount} / {numCount}
                    </div>
                  </div>
                  <div className="bg-black/50 p-2 rounded-lg border border-zinc-800">
                    <div className="text-[9px] text-zinc-400 uppercase tracking-wider">Duration</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{parsedTest.durationMinutes}m</div>
                  </div>
                </div>
              </div>

              {/* Pre-verification reassurance banner */}
              {verifiedCount > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white">AI Pre-verified ({verifiedCount} tricky questions):</span> Visual diagrams, chemical structures, and keys resolved with dedicated AI reasoning.
                  </div>
                </div>
              )}

              {/* Launch Actions (Primary Hero) */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={springs.snappy}
                  onClick={handleStartDrillImmediately}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg ${currentTheme.launchButton}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Timed Drill Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={springs.snappy}
                  onClick={handleSaveToBank}
                  className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer border border-zinc-700/50"
                >
                  Save to Available Tests
                </motion.button>
              </div>

              {/* Subtle Secondary Studio Link (Optional - prevents memorizing answers) */}
              <div className="flex items-center justify-center pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsReviewStudioOpen(true)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer font-mono hover:underline py-1 px-2"
                >
                  <Edit3 className="w-3 h-3 text-zinc-500" />
                  <span>Review questions in studio (optional - may reveal answers)</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>

    {parsedTest && (
      <ParsedQuestionsReviewModal
        isOpen={isReviewStudioOpen}
        test={parsedTest}
        zIndex={100020}
        onClose={() => setIsReviewStudioOpen(false)}
        onSave={async (updatedTest) => {
          try {
            await actions.addCustomMockTest(updatedTest);
            setIsReviewStudioOpen(false);
            forceClose();
          } catch (e) {
            console.error("Failed to save reviewed test:", e);
          }
        }}
        onStart={async (updatedTest) => {
          try {
            await actions.addCustomMockTest(updatedTest);
          } catch (e) {
            console.warn("Storage sync warning:", e);
          }
          setIsReviewStudioOpen(false);
          forceClose();
          onTestCreated?.(updatedTest);
        }}
      />
    )}
  </>
  );
}
