import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { Chapter, Mistake } from '@/types/index';
import { CustomSelect } from '@/components/ui/CustomSelect';

export interface ChapterMistakesTabProps {
  chapter: Chapter;
  chapterMistakes: Mistake[];
  onAddMistake: (mistake: Omit<Mistake, 'id'>) => Promise<any> | undefined;
}

export const ChapterMistakesTab: React.FC<ChapterMistakesTabProps> = ({
  chapter,
  chapterMistakes,
  onAddMistake,
}) => {
  const [newMistakeTitle, setNewMistakeTitle] = useState('');
  const [newMistakeDesc, setNewMistakeDesc] = useState('');
  const [newMistakeTag, setNewMistakeTag] = useState('Calculation');
  const [isAddingMistake, setIsAddingMistake] = useState(false);

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newMistakeTitle.trim() || !chapter) return;
    onAddMistake({
      subject: chapter.subject,
      chapter: chapter.name,
      topic: newMistakeTitle,
      subtopic: '',
      difficulty: 'Medium',
      source: 'Self-Study',
      timeTaken: 0,
      correctMethod: '',
      studentMethod: newMistakeDesc,
      mistakeTypes: [newMistakeTag],
      confidence: 0,
      revisionSchedule: new Date().toISOString(),
      masteryImpact: 'Medium',
      attemptNumber: 1,
      revisionStatus: 'New',
      recoveryScore: 0,
      teacherNotes: '',
      personalNotes: '',
      aiAdvice: '',
      priority: 'Medium',
      dateLogged: new Date().toISOString(),
      questionText: newMistakeTitle,
      correctSolution: '',
    });
    setNewMistakeTitle('');
    setNewMistakeDesc('');
    setIsAddingMistake(false);
  };

  return (
    <motion.div
      key="mistakes"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Chapter Mistakes & Pitfalls Ledger
          </h4>
          <p className="text-[11px] font-mono text-zinc-400">Track recurring conceptual blunders and formula calculation errors.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingMistake(prev => !prev)}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAddingMistake ? 'Close Form' : 'Log New Error'}</span>
        </button>
      </div>

      {isAddingMistake && (
        <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Error Topic / Question Summary</label>
            <input
              type="text"
              value={newMistakeTitle}
              onChange={(e) => setNewMistakeTitle(e.target.value)}
              placeholder="e.g. Sign error in Lenz's law integration"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 relative z-20">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Mistake Tag</label>
              <CustomSelect
                size="sm"
                value={newMistakeTag}
                onChange={(val) => setNewMistakeTag(String(val))}
                options={[
                  { value: 'Calculation', label: 'Calculation Error' },
                  { value: 'Conceptual', label: 'Conceptual Flaw' },
                  { value: 'Formula', label: 'Formula Recall' },
                  { value: 'Speed/Panic', label: 'Speed / Time Pressure' },
                  { value: 'Silly Mistake', label: 'Silly Mistake' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Notes / What went wrong</label>
              <input
                type="text"
                value={newMistakeDesc}
                onChange={(e) => setNewMistakeDesc(e.target.value)}
                placeholder="Forgot minus sign on flux derivative"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Error to Vault</span>
          </button>
        </div>
      )}

      {chapterMistakes.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/40 text-zinc-400 font-mono text-xs space-y-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto opacity-70" />
          <p className="font-bold text-zinc-300">Clean Vault for {chapter.name}</p>
          <p className="text-[11px] text-zinc-500">No active mistake notes logged for this chapter.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {chapterMistakes.map(m => (
            <div key={m.id} className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-850 space-y-1 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">{m.topic || m.questionText}</span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded-lg">
                  {m.mistakeTypes.join(', ')}
                </span>
              </div>
              {m.studentMethod && (
                <p className="text-xs text-zinc-400 font-mono pt-0.5">{m.studentMethod}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
