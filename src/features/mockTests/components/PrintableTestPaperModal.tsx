import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Printer, X, ExternalLink, Loader2, FileText, Check } from 'lucide-react';
import { MockTest } from '@/types/mockTest';
import { generateTestPaperHtml } from '../utils/testPaperHtmlGenerator';

interface PrintableTestPaperModalProps {
  test: MockTest | null;
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'QUESTION_PAPER' | 'SOLUTIONS' | 'COMPLETE';
}

export function PrintableTestPaperModal({
  test,
  isOpen,
  onClose,
  defaultMode = 'COMPLETE'
}: PrintableTestPaperModalProps) {
  const [printMode, setPrintMode] = useState<'QUESTION_PAPER' | 'SOLUTIONS' | 'COMPLETE'>(defaultMode);
  const [fontSize, setFontSize] = useState<'sm' | 'base'>('sm');
  const [showInstructions, setShowInstructions] = useState(true);
  const [showRoughWorkMargin, setShowRoughWorkMargin] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const documentHtml = useMemo(() => {
    if (!test) return '';
    return generateTestPaperHtml(test, {
      printMode,
      fontSize,
      showInstructions,
      showRoughWorkMargin
    });
  }, [test, printMode, fontSize, showInstructions, showRoughWorkMargin]);

  if (!isOpen || !test || typeof document === 'undefined') return null;

  const totalQuestions = (test.sections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      setIsPrinting(true);
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.error('Iframe print failed, falling back to window.print():', err);
        window.print();
      } finally {
        setIsPrinting(false);
      }
    } else {
      window.print();
    }
  };

  const handleOpenInBrowserViewer = () => {
    if (!documentHtml) return;
    try {
      const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, '_blank');
      if (newWindow) {
        newWindow.focus();
      }
    } catch (err) {
      console.error('Failed to open document in new tab:', err);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="printable-modal-overlay fixed inset-0 z-[100050] bg-black/35 backdrop-blur-sm flex flex-col overflow-hidden font-sans"
    >
      {/* 1. TOP TOOLBAR */}
      <header className="no-print bg-[#0d0d12] border-b border-zinc-800 px-4 py-3 sm:px-6 flex items-center justify-between gap-3 text-white shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Printer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate font-display">
              NTA Exam Paper & Solutions Exporter
            </h2>
            <p className="text-[11px] font-mono text-zinc-400 truncate">
              {test.name} • {totalQuestions} Questions • {test.durationMinutes || 180} Mins
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* View Mode Selector */}
          <div className="hidden md:flex bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setPrintMode('QUESTION_PAPER')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                printMode === 'QUESTION_PAPER' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Paper Only
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('COMPLETE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                printMode === 'COMPLETE' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Paper + Solutions
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('SOLUTIONS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                printMode === 'SOLUTIONS' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Solutions Only
            </button>
          </div>

          {/* Open in Browser / Chrome PDF Viewer Button */}
          <button
            type="button"
            onClick={handleOpenInBrowserViewer}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-850 hover:bg-zinc-800 text-cyan-300 border border-cyan-700/50 hover:border-cyan-600 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Open pure A4 document in new browser tab / Chrome PDF Viewer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in Browser Viewer</span>
          </button>

          {/* Primary Print / Save as PDF Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/25 cursor-pointer active:scale-95 disabled:cursor-wait"
            title="Print or Save as PDF using isolated light-mode engine"
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>{isPrinting ? 'Preparing A4 PDF...' : 'Print / Save as PDF'}</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            title="Close Exporter (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. SECONDARY PREFERENCES BAR */}
      <div className="no-print bg-[#13131a] border-b border-zinc-800/80 px-4 py-2 sm:px-6 flex items-center justify-between gap-4 text-xs font-mono text-zinc-400 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInstructions}
              onChange={(e) => setShowInstructions(e.target.checked)}
              className="accent-indigo-600 rounded"
            />
            <span>Include Cover & Instructions</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRoughWorkMargin}
              onChange={(e) => setShowRoughWorkMargin(e.target.checked)}
              className="accent-indigo-600 rounded"
            />
            <span>Include Rough Work Area</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Print Size:</span>
          <button
            type="button"
            onClick={() => setFontSize('sm')}
            className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              fontSize === 'sm' ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'border-zinc-800 text-zinc-400'
            }`}
          >
            Compact (A4)
          </button>
          <button
            type="button"
            onClick={() => setFontSize('base')}
            className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              fontSize === 'base' ? 'bg-indigo-950 border-indigo-500 text-indigo-300' : 'border-zinc-800 text-zinc-400'
            }`}
          >
            Standard
          </button>
        </div>
      </div>

      {/* 3. ISOLATED IFRAME PREVIEW: Complete immunization against host app dark-theme styles */}
      <main className="printable-scroll-wrapper flex-1 overflow-hidden p-3 sm:p-6 bg-zinc-950 flex justify-center items-center">
        <div className="w-full max-w-4xl h-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-white flex flex-col">
          <iframe
            ref={iframeRef}
            srcDoc={documentHtml}
            className="w-full h-full border-0 bg-white"
            title="Authentic A4 Question Paper Booklet Preview"
          />
        </div>
      </main>
    </motion.div>,
    document.body
  );
}
