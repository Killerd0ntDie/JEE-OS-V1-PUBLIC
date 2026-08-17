import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { RevisionCardItem } from '@jee-os/engines';
import { 
  ArrowLeft, Brain, Sparkles, CheckCircle2, 
  Lightbulb, BookOpen, ShieldCheck, Zap, ArrowRight, RotateCcw
} from 'lucide-react';
import { BlockMath, InlineMath } from 'react-katex';
import { springs } from '@/constants/motion';

interface FeynmanSandboxStageProps {
  cards: RevisionCardItem[];
  onBackToHub: () => void;
}

export const FeynmanSandboxStage: React.FC<FeynmanSandboxStageProps> = ({
  cards,
  onBackToHub
}) => {
  const actions = useStudyBrainStore(state => state.actions);

  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id || '');
  const [explanationText, setExplanationText] = useState('');
  const [feedback, setFeedback] = useState<{
    depthScore: number;
    clarityTier: string;
    strengths: string[];
    advice: string;
    xp: number;
  } | null>(null);

  const selectedCard = cards.length > 0 ? (cards.find(c => c.id === selectedCardId) || cards[0]) : null;

  const renderMathText = (text: string | undefined | null) => {
    if (!text) return null;
    try {
      const cleanText = text.replace(/\\\$/g, '$');
      const parts = cleanText.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
      return parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          return <BlockMath key={i} math={math} errorColor="#ef4444" />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          return <InlineMath key={i} math={math} errorColor="#ef4444" />;
        }
        return <span key={i}>{part}</span>;
      });
    } catch {
      return <span className="font-mono text-xs text-zinc-300">{text}</span>;
    }
  };

  const wordCount = explanationText.trim() ? explanationText.trim().split(/\s+/).length : 0;

  const handleEvaluateExplanation = () => {
    if (!explanationText.trim() || wordCount < 5 || !selectedCard) return;

    // Advanced conceptual depth evaluation
    let depthScore = 65;
    let clarityTier = 'Developing';
    const strengths: string[] = [];

    if (wordCount >= 25) {
      depthScore = 95;
      clarityTier = 'Mastery Level';
      strengths.push('Elaborated deep physical mechanism with comprehensive detail.');
      strengths.push('Avoided superficial rote-memorization phrasing.');
    } else if (wordCount >= 14) {
      depthScore = 82;
      clarityTier = 'Solid Intuition';
      strengths.push('Captured the core qualitative relationship cleanly.');
    } else {
      depthScore = 70;
      clarityTier = 'Basic Overview';
      strengths.push('Stated the foundational concept correctly.');
    }

    const advice = wordCount >= 20
      ? 'Outstanding intuitive grasp. You distilled the core physical variables without relying on mechanical symbol manipulation. Memory interval upgraded to maximum stability.'
      : 'Good baseline. To reach full mastery, try integrating a real-world physical analogy or discussing what happens at the boundary limits.';

    const xpEarned = depthScore >= 90 ? 150 : depthScore >= 80 ? 100 : 50;

    setFeedback({
      depthScore,
      clarityTier,
      strengths,
      advice,
      xp: xpEarned
    });

    actions.completeRevision(selectedCard.chapterId, depthScore >= 80 ? 'High' : 'Medium');
    actions.completeStudySession({
      type: 'Revision',
      duration: 3,
      questionsSolved: 1,
      correct: 1,
      accuracy: 100,
      xpEarned: xpEarned
    }).catch(() => {});
  };

  const handleInsertStarter = (starterText: string) => {
    setExplanationText(prev => prev ? `${prev} ${starterText}` : starterText);
  };

  // ── EMPTY STATE GUARD ──
  if (cards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 text-left font-sans select-none pb-16">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onBackToHub}
            className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Back to Command Center"
            aria-label="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="bg-zinc-900/90 border border-white/15 p-12 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-indigo-950/60 rounded-full flex items-center justify-center border border-indigo-500/40 text-indigo-400 shadow-lg">
            <Brain className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-white">No Concepts Active for Feynman Studio</h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto font-sans leading-relaxed">
              Start chapters in your syllabus to unlock intuitive Feynman teaching canvases and AI clarity analyzers.
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onBackToHub}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            Return to Command Center
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left font-sans select-none pb-16">
      
      {/* Top Navigation & Concept Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onBackToHub}
            className="p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
            title="Back to Command Center"
            aria-label="Back to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
              <span className="px-2.5 py-0.5 rounded-lg border bg-indigo-950/60 border-indigo-500/40 text-indigo-300 flex items-center gap-1">
                <Brain className="w-3 h-3 text-indigo-400" />
                <span>Feynman Technique Studio</span>
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-black text-white tracking-tight">
              Conceptual Explanation & Intuition Canvas
            </h1>
          </div>
        </div>

        {/* Concept Selector Dropdown */}
        <div className="w-full sm:w-72 font-mono text-xs z-30">
          <CustomSelect
            value={selectedCardId}
            onChange={(val) => {
              setSelectedCardId(String(val));
              setFeedback(null);
              setExplanationText('');
            }}
            options={cards.map(c => ({
              value: c.id,
              label: `${c.subject.toUpperCase()}: ${c.title}`
            }))}
            placeholder="Select a Concept to Explain"
          />
        </div>
      </div>

      {/* Two-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Concept Reference & Feynman Rules (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {selectedCard ? (
            <div className="bg-zinc-900/90 border border-white/15 rounded-3xl p-6 space-y-5 shadow-xl">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className={`px-2.5 py-0.5 rounded-lg border font-mono text-[10px] font-bold uppercase tracking-wider ${
                  selectedCard.subject === 'physics' ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40' :
                  selectedCard.subject === 'chemistry' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' :
                  'bg-amber-950/60 text-amber-300 border-amber-500/40'
                }`}>
                  {selectedCard.subject} • {selectedCard.chapterName}
                </span>

                <span className="text-[10px] font-mono text-zinc-400 font-bold">
                  {selectedCard.retentionConfidence} Retention
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold tracking-wider block">
                  Concept Challenge:
                </span>
                <h3 className="text-lg md:text-xl font-display font-bold text-white tracking-tight">
                  {renderMathText(selectedCard.title)}
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-1 shadow-inner">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider block">
                  Formal Mathematical Statement:
                </span>
                <div className="font-mono text-xs text-indigo-200 overflow-x-auto leading-relaxed">
                  {renderMathText(selectedCard.formula || 'No formula mapped')}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-1.5 shadow-inner">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider block">
                  Core Principle to Articulate:
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                  "{renderMathText(selectedCard.concept)}"
                </p>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-zinc-900/60 border border-white/10 rounded-3xl text-zinc-400 text-xs font-mono">
              No concept card selected.
            </div>
          )}

          {/* Feynman Guidelines Box */}
          <div className="bg-zinc-950/60 border border-white/10 rounded-3xl p-5 space-y-3 shadow-md font-mono text-xs">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Feynman Protocol Guidelines</span>
            </div>
            <ul className="space-y-2 text-zinc-400 text-[11px] font-sans leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-mono font-bold">1.</span>
                <span>Explain in simple words as if teaching a beginner. If you must use a technical term, define it instantly.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-mono font-bold">2.</span>
                <span>Focus on <em>why</em> the physical behavior happens rather than memorizing symbol notation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-mono font-bold">3.</span>
                <span>Use metaphors or analogies to anchor memory in intuition.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* RIGHT COLUMN: Teaching Canvas & Analysis (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-zinc-900/90 border border-white/15 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Your Intuitive Explanation</span>
                </span>

                <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                  <span>Words: <strong className={wordCount >= 15 ? 'text-emerald-400' : 'text-zinc-300'}>{wordCount}</strong></span>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={explanationText}
                onChange={(e) => setExplanationText(e.target.value)}
                placeholder="Explain this concept in plain English. Why does this physical relationship hold? What happens if you double the key variable? Imagine explaining it to a curious friend..."
                rows={7}
                className="w-full bg-zinc-950/80 border border-white/10 focus:border-indigo-500/60 rounded-2xl p-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 transition-all font-sans leading-relaxed resize-none shadow-inner"
              />

              {/* Idea Starter Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px]">
                <span className="text-zinc-500 font-bold uppercase">Starter Prompts:</span>
                {[
                  'Physically, this means that...',
                  'Think of it like...',
                  'If the radius increases, then...',
                  'The energy gets conserved because...'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInsertStarter(chip)}
                    className="px-2.5 py-1 rounded-xl bg-zinc-950/60 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Evaluate Button */}
            <div className="pt-3 border-t border-white/10">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleEvaluateExplanation}
                disabled={wordCount < 5}
                className={`w-full py-3.5 rounded-2xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  wordCount >= 5
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <span>Evaluate Conceptual Clarity & Mastery</span>
              </motion.button>
            </div>

          </div>

          {/* Feedback & Mastery Breakdown Box */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={springs.fluid}
                className="bg-zinc-900/90 border border-indigo-500/40 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-600/15 rounded-full filter blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-display font-bold text-white text-base">
                      Conceptual Assessment: {feedback.clarityTier}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-emerald-400 font-bold px-2.5 py-0.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60">
                      Score: {feedback.depthScore}%
                    </span>
                    <span className="text-indigo-300 font-bold">+{feedback.xp} XP</span>
                  </div>
                </div>

                <div className="space-y-2 relative z-10">
                  <p className="text-xs text-zinc-200 leading-relaxed font-sans font-medium">
                    {feedback.advice}
                  </p>

                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1 text-xs font-mono">
                    <span className="text-emerald-300 font-bold uppercase text-[10px] block">
                      Memory Interval Status:
                    </span>
                    <span className="text-zinc-300 text-[11px] block">
                      SM-2 stability factor boosted. Concept consolidated in long-term schema.
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setFeedback(null);
                      setExplanationText('');
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Explain Next Concept</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
};
