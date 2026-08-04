import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, CheckCircle, AlertTriangle, Loader2, Sparkles, Settings } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { MockTestParsingEngine } from '@jee-os/engines';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface UploadPDFModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function UploadPDFModal({ onSuccess, onCancel }: UploadPDFModalProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  
  // Free tier API key handling (Option A)
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showApiSettings, setShowApiSettings] = useState(!localStorage.getItem('gemini_api_key'));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setShowApiSettings(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }
    return fullText;
  };

  const processFile = async (file: File) => {
    if (!localStorage.getItem('gemini_api_key')) {
      setError("Please configure your Gemini API Key first.");
      setShowApiSettings(true);
      return;
    }

    setFileName(file.name);
    setError(null);
    setIsProcessing(true);
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError("Please upload a valid PDF file.");
      setIsProcessing(false);
      return;
    }

    try {
      setStatusText('Extracting text from PDF...');
      const rawText = await extractTextFromPDF(file);

      if (!rawText || rawText.trim().length === 0) {
        throw new Error("Could not extract any text from the PDF. It might be an image-based scan.");
      }

      setStatusText('AI analyzing and grading scorecard...');
      const engine = new MockTestParsingEngine(localStorage.getItem('gemini_api_key')!);
      const result = await engine.parseMockTestResults(rawText);

      setStatusText('Saving mistakes to Mistake Log...');
      // Convert to MockResult schema and add to Firestore
      const subjectBreakdown = {
        Physics: { score: 0, attempted: 0, correct: 0 },
        Chemistry: { score: 0, attempted: 0, correct: 0 },
        Maths: { score: 0, attempted: 0, correct: 0 }
      };

      // Calculate subjects from mistakes (approximate since we only have mistake data, not per-question subject map)
      result.mistakes.forEach(m => {
        if (subjectBreakdown[m.subject]) {
          subjectBreakdown[m.subject].attempted++; // we know they attempted and failed
        }
      });

      const mockResultData = {
        date: new Date().toISOString(),
        title: `AI Graded: ${file.name.replace('.pdf', '')}`,
        totalScore: result.score,
        totalQuestions: result.totalQuestions,
        attempted: result.attempted,
        correct: result.correct,
        incorrect: result.incorrect,
        duration: 180, // Default 3 hours assumption
        subjectBreakdown: subjectBreakdown as any,
      };

      await actions.addMockResult(mockResultData);

      // Add each mistake to Mistake Engine
      for (const m of result.mistakes) {
        await actions.addMistake({
          questionText: `Topic: ${m.topic} (Question ${m.questionNumber})`,
          correctSolution: m.correctAnswer,
          chapter: 'ai-parsed-chapter',
          topic: m.topic,
          subtopic: 'General',
          subject: m.subject.toLowerCase() as any,
          mistakeTypes: ['Conceptual Error'],
          difficulty: 'Medium',
          source: 'AI Mock Test Parser',
          timeTaken: 2,
          correctMethod: m.reasoning || 'Refer to solution',
          studentMethod: m.studentAnswer || 'Unknown',
          confidence: 20,
          revisionSchedule: '1_day',
          masteryImpact: 'High',
          attemptNumber: 1,
          revisionStatus: 'New',
          recoveryScore: 0,
          teacherNotes: 'Parsed by AI Grading Engine',
          personalNotes: `Student answered: ${m.studentAnswer}, Correct: ${m.correctAnswer}\nReasoning: ${m.reasoning || 'N/A'}`,
          aiAdvice: 'Review this concept carefully.',
          priority: 'High',
          dateLogged: new Date().toISOString(),
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process PDF.");
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">AI PDF Grader</h2>
              <p className="text-xs text-zinc-400 font-mono">Auto-extract score & mistakes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowApiSettings(!showApiSettings)} className="text-zinc-500 hover:text-white transition-colors p-1 bg-zinc-900 rounded-md">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showApiSettings ? (
          <form onSubmit={saveApiKey} className="mb-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <div>
              <label className="text-xs font-mono font-bold text-zinc-400 mb-1 block">Gemini API Key (Option A - Free Tier)</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Stored securely in your local browser storage.</p>
            </div>
            <button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-sm font-bold transition-colors">
              Save Key
            </button>
          </form>
        ) : (
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive ? 'border-purple-500 bg-purple-500/5' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
            } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDrop={handleDrop}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={(e) => e.target.files && processFile(e.target.files[0])}
            />
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                <p className="text-sm font-bold text-purple-400 animate-pulse">{statusText}</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-sm text-zinc-300 font-medium mb-1">Drag and drop scorecard PDF</p>
                <p className="text-xs text-zinc-500 font-mono mb-4">Or click to browse your files</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-mono font-bold rounded-lg transition-colors"
                >
                  Select PDF
                </button>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
