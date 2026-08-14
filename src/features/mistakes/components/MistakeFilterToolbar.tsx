import React from 'react';
import { motion } from 'motion/react';
import { SubjectId } from '@/types/index';
import { Icon } from '@/components/ui/Icon';
import { springs } from '@/constants/motion';

export interface MistakeFilterToolbarProps {
  activeSubject: SubjectId | 'all';
  setActiveSubject: (subject: SubjectId | 'all') => void;
  statusFilter: 'all' | 'unresolved' | 'resolved';
  setStatusFilter: (status: 'all' | 'unresolved' | 'resolved') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function MistakeFilterToolbar({
  activeSubject,
  setActiveSubject,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery
}: MistakeFilterToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/60 border border-zinc-850/80 p-3 rounded-2xl">
      {/* Subject Filter Pills with layoutId Glider */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl font-mono text-[10px] relative">
        {(['all', 'physics', 'chemistry', 'maths'] as const).map(sub => {
          const isActive = activeSubject === sub;
          return (
            <button
              key={sub}
              onClick={() => setActiveSubject(sub)}
              className={`relative px-3 py-1 rounded-lg uppercase font-bold transition-colors cursor-pointer select-none z-10 ${
                isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMistakeSubjectPill"
                  className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md shadow-indigo-600/30 -z-10"
                  transition={springs.fluid}
                />
              )}
              {sub}
            </button>
          );
        })}
      </div>

      {/* Status Filter with layoutId Glider */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl font-mono text-[10px] relative">
        {(['unresolved', 'resolved', 'all'] as const).map(st => {
          const isActive = statusFilter === st;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`relative px-3 py-1 rounded-lg uppercase font-bold transition-colors cursor-pointer select-none z-10 ${
                isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMistakeStatusPill"
                  className="absolute inset-0 bg-zinc-800 rounded-lg border border-zinc-700/60 -z-10 shadow-sm"
                  transition={springs.fluid}
                />
              )}
              {st}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-xs">
        <Icon name="Search" className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search mistakes by topic or chapter..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 font-sans transition-all duration-200"
        />
      </div>
    </div>
  );
}

