import React, { useState, useRef } from 'react';
import { FileUp, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, X, ArrowRight, Edit3 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { PdfPaperParserService, validatePdfMagicBytes } from '../services/PdfPaperParserService';
import { MockTest } from '@/types/mockTest';
import { ParsedQuestionsReviewModal } from './ParsedQuestionsReviewModal';

interface UploadPyqPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestCreated?: (test: MockTest) => void;
}

export function UploadPyqPaperModal({ isOpen, onClose, onTestCreated }: UploadPyqPaperModalProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [targetSubject, setTargetSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [examMode, setExamMode] = useState<'main' | 'advanced'>('main');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsedTest, setParsedTest] = useState<MockTest | null>(null);
  const [isReviewStudioOpen, setIsReviewStudioOpen] = useState(false);
  const [isScannedPdf, setIsScannedPdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setCustomTitle('');
    setTargetSubject('all');
    setExamMode('main');
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
    if (selectedFile && !parsedTest && isProcessing) {
      const confirmed = window.confirm('Question paper processing is active. Are you sure you want to close and cancel?');
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
      setError('The selected PDF file is empty (0 bytes). Please choose a valid question paper.');
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

    const suggestedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setCustomTitle(suggestedTitle);
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
    setStatusText('Preparing question paper parser...');

    try {
      const test = await PdfPaperParserService.parsePdfToMockTest(selectedFile, {
        paperTitle: customTitle.trim() || undefined,
        targetSubject,
        examMode,
        onProgress: (status) => setStatusText(status)
      });

      setParsedTest(test);
      // Persist immediately into Store and IndexedDB
      await actions.addCustomMockTest(test);
      setIsProcessing(false);
    } catch (err: any) {
      console.error("PYQ parsing failure:", err);
      setError(err.message || 'Failed to parse question paper. Please ensure the document contains clear text.');
      setIsProcessing(false);
    }
  };

  const handleStartTest = () => {
    if (!parsedTest) return;
    const testToLaunch = parsedTest;
    forceClose();
    onTestCreated?.(testToLaunch);
  };

  const totalQuestions = parsedTest?.sections.reduce((sum, s) => sum + s.questions.length, 0) || 0;
  const verifiedQuestions = parsedTest?.sections.reduce((sum, s) => sum + s.questions.filter(q => q.isVerified).length, 0) || 0;

  return (
    <>
      <Modal isOpen={isOpen && !isReviewStudioOpen} onClose={handleClose} zIndex={100010} className="max-w-xl w-full mx-auto">
      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Import Previous Year Question (PYQ) Paper</h2>
              <p className="text-xs text-zinc-400">Upload any official NTA JEE question paper PDF to convert to CBT format</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {parsedTest ? (
            /* Success Preview State */
            <div className="space-y-5">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-emerald-300">Question Paper Converted Successfully!</h3>
                  <p className="text-xs text-emerald-400/80 mt-1">
                    Your paper is structured with standard JEE marking (+4/-1) and saved permanently to your Available Tests.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400 font-medium">Paper Name</span>
                  <span className="text-xs font-semibold text-zinc-200">{parsedTest.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400 font-medium">Total Questions</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">{totalQuestions} Questions</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400 font-medium">Duration</span>
                  <span className="text-xs font-mono text-zinc-300">{parsedTest.durationMinutes} Minutes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 font-medium">Sections</span>
                  <div className="flex gap-2">
                    {parsedTest.sections.map(s => (
                      <span key={s.subject} className="px-2 py-0.5 rounded text-[11px] font-medium uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {s.subject}: {s.questions.length}Q
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pre-verification reassurance banner */}
              {verifiedQuestions > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white">AI Pre-verified ({verifiedQuestions} tricky questions):</span> Visual diagrams, chemical structures, and keys resolved with dedicated AI reasoning.
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={forceClose}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
                >
                  Done (View in Available Tests)
                </button>
                <button
                  type="button"
                  onClick={handleStartTest}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  Launch CBT Test Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
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
            </div>
          ) : (
            /* Upload & Configuration State */
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : selectedFile
                    ? 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600'
                    : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/40'
                } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
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
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-zinc-200">{selectedFile.name}</span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">
                      Drop your Question Paper PDF here or <span className="text-indigo-400 underline">browse</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Supports official JEE Main / Advanced question papers with printed text
                    </p>
                  </div>
                )}
              </div>

              {/* Scanned PDF Notice (MED-02) */}
              {isScannedPdf && selectedFile && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200 text-left">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-amber-300">Scanned / Image-Only Paper Detected</p>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      No embedded digital text layer was found in this PDF. JEE-OS will automatically use Gemini Vision OCR to transcribe questions, formulas, and diagrams. Processing may take slightly longer.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Options */}
              {selectedFile && !isProcessing && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Paper Title
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. JEE Main 2024 Jan 27 Shift 1"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Subject Scope
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'all', label: 'All Subjects' },
                        { id: 'physics', label: 'Physics' },
                        { id: 'chemistry', label: 'Chemistry' },
                        { id: 'maths', label: 'Maths' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTargetSubject(item.id as any)}
                          className={`py-1.5 text-xs rounded-lg font-medium border transition-colors ${
                            targetSubject === item.id
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-zinc-400">
                        Exam Mode & Marking Scheme
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {examMode === 'advanced' ? '+3 Single / +4 Multi / -2 Wrong' : '+4 Single / -1 Wrong / -2 Multi'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setExamMode('main')}
                        className={`py-1.5 text-xs rounded-lg font-medium border transition-colors ${
                          examMode === 'main'
                            ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-sm'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        JEE Main (+4 / -1)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamMode('advanced')}
                        className={`py-1.5 text-xs rounded-lg font-medium border transition-colors ${
                          examMode === 'advanced'
                            ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-sm'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        JEE Advanced (+4 / -2 Multi)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Spinner / Status */}
              {isProcessing && (
                <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-zinc-200">{statusText}</p>
                    <p className="text-[11px] text-zinc-500">
                      Extracting questions, options, mathematical LaTeX, and solutions...
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-300">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="flex-1 py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={!selectedFile || isProcessing}
                  className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Convert into CBT Test
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
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
