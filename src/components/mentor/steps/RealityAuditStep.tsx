import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle, Clock, BookOpen, Search, Layers } from 'lucide-react';
import { SubjectId, Chapter } from '@/types/index';

interface Props {
  setStep: (step: number) => void;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  activeAuditSubject: SubjectId;
  setActiveAuditSubject: (subject: SubjectId) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  groupedByUnit: { unit: string; chapters: Chapter[] }[];
  chapterReality: Record<string, 'Not Started' | 'In Progress' | 'Completed'>;
  handleRealityChange: (chapterId: string, status: 'Not Started' | 'In Progress' | 'Completed') => void;
}

export const RealityAuditStep: React.FC<Props> = ({
  setStep,
  completedCount,
  inProgressCount,
  notStartedCount,
  activeAuditSubject,
  setActiveAuditSubject,
  searchQuery,
  setSearchQuery,
  groupedByUnit,
  chapterReality,
  handleRealityChange,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-indigo-400 font-mono text-2xs uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5" />
          Reality Check — Zero Assumptions
        </div>
        <h3 className="text-lg font-display font-bold text-white">Chapter Completion Audit</h3>
        <p className="text-xs text-zinc-400">
          Chapters are strictly ordered by curriculum. Toggle status for any chapters you've worked on.
        </p>
      </div>

      {/* Status tally pill summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0d0e14] border border-zinc-800/80 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle className="w-4 h-4" />
            <span>{completedCount} Completed</span>
          </div>
          <span className="text-zinc-800">•</span>
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
            <Clock className="w-4 h-4" />
            <span>{inProgressCount} In Progress</span>
          </div>
          <span className="text-zinc-800">•</span>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <BookOpen className="w-4 h-4" />
            <span>{notStartedCount} Not Started</span>
          </div>
        </div>

        {/* Subject switcher tabs */}
        <div className="flex gap-1.5">
          {(['physics', 'chemistry', 'maths'] as const).map(subj => (
            <button
              key={subj}
              onClick={() => setActiveAuditSubject(subj)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase font-bold tracking-wider transition-all cursor-pointer ${
                activeAuditSubject === subj
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeAuditSubject} chapters or units...`}
          className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 placeholder:text-zinc-600"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-mono"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grouped Chapter List */}
      <div className="space-y-4 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
        {groupedByUnit.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500 font-mono">
            No chapters match your search query.
          </div>
        ) : (
          groupedByUnit.map(group => (
            <div key={group.unit} className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider px-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>{group.unit}</span>
                <span className="text-zinc-600 font-normal">({group.chapters.length})</span>
              </div>
              
              <div className="space-y-1.5">
                {group.chapters.map(chap => {
                  const currentStatus = chapterReality[chap.id] || 'Not Started';
                  return (
                    <div
                      key={chap.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        currentStatus === 'Completed'
                          ? 'border-emerald-500/30 bg-emerald-950/10'
                          : currentStatus === 'In Progress'
                          ? 'border-indigo-500/30 bg-indigo-950/10'
                          : 'border-zinc-800/60 bg-zinc-900/20 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-500 font-bold">{chap.id.toUpperCase()}</span>
                          <span className="text-xs font-semibold text-white truncate block">{chap.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 block">
                          Weightage: {chap.weightage}/10 • Priority {chap.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(['Not Started', 'In Progress', 'Completed'] as const).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleRealityChange(chap.id, st)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                              currentStatus === st
                                ? st === 'Completed'
                                  ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 font-bold'
                                  : st === 'In Progress'
                                  ? 'bg-indigo-500/20 border border-indigo-500/60 text-indigo-300 font-bold'
                                  : 'bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold'
                                : 'bg-zinc-950/60 text-zinc-500 border border-transparent hover:text-zinc-300'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 flex justify-between">
        <button
          onClick={() => setStep(4)}
          className="px-5 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-mono transition-all cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={() => setStep(6)}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
        >
          Synthesize Roadmap
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
