import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, RotateCcw } from 'lucide-react';
import { HorizontalMistakeStage } from './HorizontalMistakeStage';
import { Mistake, SubjectId } from '@/types/index';

export interface MistakePracticeViewProps {
  mistakes: Mistake[];
  activeSubject: SubjectId | 'all';
  setActiveSubject: (sub: SubjectId | 'all') => void;
  statusFilter: 'all' | 'unresolved' | 'resolved';
  setStatusFilter: (st: 'all' | 'unresolved' | 'resolved') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  onUpdateStatus: (id: string, status: Mistake['revisionStatus']) => void;
  onPinToPlanner: (item: Mistake) => void;
  onDelete: (id: string) => void;
  onStartRetest: (item?: Mistake) => void;
  onBackToVault: () => void;
  getSubjectColor: (sub: SubjectId) => { text: string; bg: string; border: string; badge: string };
  getStatusBadge: (status: Mistake['revisionStatus']) => { label: string; style: 'destructive' | 'accent' | 'default' | 'success' };
}

export const MistakePracticeView: React.FC<MistakePracticeViewProps> = ({
  mistakes,
  activeSubject,
  setActiveSubject,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  selectedTag,
  setSelectedTag,
  onUpdateStatus,
  onPinToPlanner,
  onDelete,
  onStartRetest,
  onBackToVault,
  getSubjectColor,
  getStatusBadge,
}) => {
  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-12 font-sans">
      
      {/* Practice Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-950/80 border border-zinc-850 rounded-2xl">
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onBackToVault}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-mono text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Vault</span>
          </motion.button>
          
          <div>
            <h2 className="text-base font-display font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Detailed Mistakes Practice & Step-by-Step Derivations
            </h2>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              {mistakes.length} Problems Loaded • Horizontal Question Stepper
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onStartRetest()}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Launch CBT Retest</span>
        </motion.button>
      </div>

      {/* Horizontal Question Flow Stage */}
      <HorizontalMistakeStage
        mistakes={mistakes}
        activeSubject={activeSubject}
        setActiveSubject={setActiveSubject}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        onUpdateStatus={onUpdateStatus}
        onPinToPlanner={onPinToPlanner}
        onDelete={onDelete}
        onStartRetest={onStartRetest}
        getSubjectColor={getSubjectColor}
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
};
