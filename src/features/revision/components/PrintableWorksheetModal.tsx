import React, { useState, useMemo } from 'react';
import { 
  Printer, X, FileText, CheckCircle2, 
  Layers, Download, BookOpen, AlertTriangle 
} from 'lucide-react';
import { Mistake, Chapter } from '@/types/index';
import { FORMULA_BANK } from '@/constants/formulaBank';
import { MathRenderer, RichTextRenderer } from '@/components/MathRenderer';
import { Modal } from '@/components/ui/Modal';
import { audioEngine } from '@/utils/audioEngine';

export interface PrintableWorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  mistakes: Mistake[];
  chapters: Chapter[];
  initialType?: 'mistakes' | 'formulas' | 'drill';
}

export function PrintableWorksheetModal({
  isOpen,
  onClose,
  mistakes,
  chapters,
  initialType = 'mistakes'
}: PrintableWorksheetModalProps) {
  const [worksheetType, setWorksheetType] = useState<'mistakes' | 'formulas' | 'drill'>(initialType);
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [questionLimit, setQuestionLimit] = useState(10);

  // Filter mistakes for printing
  const printMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (selectedSubject !== 'all' && m.subject !== selectedSubject) return false;
      if (selectedChapterId !== 'all' && m.chapterId !== selectedChapterId && m.chapter !== selectedChapterId) return false;
      return true;
    }).slice(0, questionLimit);
  }, [mistakes, selectedSubject, selectedChapterId, questionLimit]);

  // Filter formulas for printing
  const printFormulas = useMemo(() => {
    return FORMULA_BANK.filter(c => {
      if (selectedSubject !== 'all' && c.subject !== selectedSubject) return false;
      if (selectedChapterId !== 'all' && c.chapterId !== selectedChapterId && c.chapterName !== selectedChapterId) return false;
      return true;
    });
  }, [selectedSubject, selectedChapterId]);

  const handlePrint = () => {
    audioEngine.playMechanicalKey('clack').catch(() => {});
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={100010}
      backdropClassName="bg-black/35 backdrop-blur-sm print:hidden"
      containerClassName="print:static print:p-0 print:block"
      className="w-full max-w-4xl bg-[#0e0f14] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:max-w-none print:border-none print:shadow-none print:bg-white print:text-black print:overflow-visible my-auto"
    >
      {/* Dynamic Print Styles for A4 Output */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .fixed {
            position: static !important;
          }
        }
      `}} />

      {/* Controls Toolbar (Hidden in Print) */}
      <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Printer className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-left">
            <h3 className="text-base font-display font-bold text-white tracking-tight">
              Desk Mode: Printable Offline Worksheet Generator
            </h3>
            <p className="text-xs text-zinc-400 font-sans">
              Clean monochrome A4 layout optimized for manual pencil calculations and full-page problem solving.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print to A4 / Save PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Controls (Hidden in Print) */}
      <div className="p-3.5 sm:p-4 bg-zinc-900/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono print:hidden shrink-0">
        {/* Type Selector */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setWorksheetType('mistakes')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              worksheetType === 'mistakes' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mistakes Drill ({mistakes.length})
          </button>
          <button
            type="button"
            onClick={() => setWorksheetType('formulas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              worksheetType === 'formulas' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Formula Cheat Sheet
          </button>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer text-xs font-mono"
          >
            <option value="all">All Subjects</option>
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
            <option value="maths">Mathematics</option>
          </select>

          {worksheetType === 'mistakes' && (
            <select
              value={questionLimit}
              onChange={(e) => setQuestionLimit(parseInt(e.target.value, 10))}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer text-xs font-mono"
            >
              <option value="5">5 Problems</option>
              <option value="10">10 Problems</option>
              <option value="15">15 Problems</option>
              <option value="25">25 Problems</option>
            </select>
          )}
        </div>
      </div>

      {/* PRINTABLE SHEET CONTAINER - Maximized Vertical Workspace */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#0a0b0f] text-left print:p-0 print:bg-white print:text-black space-y-6 print:space-y-6 print:overflow-visible custom-scrollbar">

        {/* CONTENT A: MISTAKES DRILL WORKSHEET */}
        {worksheetType === 'mistakes' && (
          <div className="space-y-6 print:space-y-8">
            {printMistakes.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500">
                No mistake records match the selected subject filter.
              </div>
            ) : (
              printMistakes.map((m, idx) => (
                <div 
                  key={m.id || idx} 
                  className="p-5 print:p-4 rounded-2xl border border-zinc-800 print:border-black print:rounded-lg bg-zinc-900/40 print:bg-white space-y-4 print-avoid-break"
                >
                  {/* Compact Question Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800 print:border-black pb-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <strong className="text-indigo-400 print:text-black text-sm font-bold">Q{idx + 1}.</strong>
                      <span className="text-zinc-300 print:text-black font-semibold">[{m.subject.toUpperCase()}] {m.chapter}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 print:text-zinc-800">
                      {m.source || 'JEE Mock'} • {m.difficulty}
                    </span>
                  </div>

                  {/* Question Statement with KaTeX */}
                  <div className="text-sm font-serif text-zinc-200 print:text-black leading-relaxed font-medium">
                    <RichTextRenderer content={m.questionText} />
                  </div>

                  {/* SUBSTANTIALLY EXPANDED CALCULATION WORKSPACE */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase text-zinc-400 print:text-black font-bold tracking-wider mb-1.5">
                      <span>Workings & Derivation:</span>
                      <span className="print:inline hidden text-zinc-500">Grid / Calculation Box</span>
                    </div>

                    {/* Generous High-Vertical Calculation Box with Graph Pattern in Print */}
                    <div className="h-64 sm:h-72 print:h-72 border border-dashed border-zinc-700 print:border-zinc-500 rounded-xl print:rounded-md bg-zinc-950/50 print:bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] print:bg-[size:20px_20px] flex flex-col justify-between p-3">
                      <div className="text-[9px] font-mono text-zinc-600 print:text-zinc-400 italic">
                        FBD / Step-by-Step Derivation
                      </div>

                      {/* Bottom Score & Answer Line */}
                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 print:text-black border-t border-zinc-800 print:border-zinc-400 pt-2">
                        <span className="font-bold">Final Numerical / Option: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span>
                        <span>Time: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] m &nbsp;|&nbsp; Marks: [ &nbsp;&nbsp;&nbsp;&nbsp; / 4 ]</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CONTENT B: FORMULAS CHEAT SHEET */}
        {worksheetType === 'formulas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
            {printFormulas.flatMap(c => c.formulas.map((f, fIdx) => (
              <div 
                key={`${c.chapterId}_${fIdx}`}
                className="p-4 rounded-xl border border-zinc-800 print:border-black print:rounded-none bg-zinc-900/40 print:bg-white space-y-2 print-avoid-break"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <strong className="text-indigo-400 print:text-black font-bold uppercase">{c.chapterName}</strong>
                  <span className="text-zinc-400 print:text-black">{c.subject}</span>
                </div>
                <h4 className="text-xs font-bold text-white print:text-black font-serif">{f.title}</h4>
                <p className="text-[10px] text-zinc-400 print:text-zinc-700 italic">{f.concept}</p>
                
                <div className="p-2.5 rounded-lg bg-black/60 print:bg-zinc-100 border border-zinc-800 print:border-black text-center text-xs font-mono text-white print:text-black">
                  <RichTextRenderer content={f.formula} />
                </div>
              </div>
            )))}
          </div>
        )}

        {/* Printable OMR Grid Footer */}
        {worksheetType === 'mistakes' && printMistakes.length > 0 && (
          <div className="mt-6 pt-4 border-t-2 border-zinc-700 print:border-black print-avoid-break">
            <div className="text-[10px] font-mono uppercase font-bold text-zinc-400 print:text-black mb-2">
              Quick OMR Response Strip:
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 font-mono text-[10px]">
              {printMistakes.map((_, i) => (
                <div key={i} className="p-1.5 border border-zinc-800 print:border-black rounded text-center space-y-1 bg-zinc-900/40 print:bg-white">
                  <div className="font-bold">Q{i + 1}</div>
                  <div className="text-zinc-400 print:text-black text-[9px]">(A)(B)(C)(D)</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
