import React from 'react';
import { motion } from 'motion/react';
import { Target, Compass, BookOpen, HeartPulse, Clock } from 'lucide-react';
import { springs } from '@/constants/motion';

export type CoachCategory = 'all' | 'exam' | 'subject' | 'mindset' | 'pacing';

interface CoachCategoryTabsProps {
  activeCategory: CoachCategory;
  onSelectCategory: (cat: CoachCategory) => void;
}

export const CoachCategoryTabs: React.FC<CoachCategoryTabsProps> = ({
  activeCategory,
  onSelectCategory
}) => {
  const categories: { id: CoachCategory; label: string; icon: any }[] = [
    { id: 'all', label: 'All Strategy', icon: Compass },
    { id: 'exam', label: 'Exam Tactics', icon: Target },
    { id: 'subject', label: 'Subject Doubt', icon: BookOpen },
    { id: 'mindset', label: 'Mental Reset', icon: HeartPulse },
    { id: 'pacing', label: 'Syllabus Pacing', icon: Clock }
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
      {categories.map(cat => {
        const Icon = cat.icon;
        const isSelected = activeCategory === cat.id;

        return (
          <motion.button
            key={cat.id}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={springs.snappy}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isSelected
                ? 'bg-indigo-600/30 border border-indigo-500/60 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className={`w-3 h-3 ${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`} />
            <span>{cat.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
