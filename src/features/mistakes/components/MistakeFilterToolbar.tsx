import React from 'react';
import { SubjectId } from '../../../types/index';
import { Icon } from '../../../components/ui/Icon';

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
      {/* Subject Filter Pills */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl font-mono text-[10px]">
        {(['all', 'physics', 'chemistry', 'maths'] as const).map(sub => (
          <button
            key={sub}
            onClick={() => setActiveSubject(sub)}
            className={`px-3 py-1 rounded-lg uppercase font-bold transition-all cursor-pointer ${
              activeSubject === sub ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl font-mono text-[10px]">
        {(['unresolved', 'resolved', 'all'] as const).map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-lg uppercase font-bold transition-all cursor-pointer ${
              statusFilter === st ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-xs">
        <Icon name="Search" className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search mistakes by topic or chapter..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 font-sans"
        />
      </div>
    </div>
  );
}
