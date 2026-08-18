import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, ShieldCheck, ArrowRight, 
  BookOpen, CheckCircle2, ChevronRight, Sparkles 
} from 'lucide-react';
import { Chapter } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';

// Syllabus Prerequisite Mapping for JEE
export const CHAPTER_PREREQUISITES_MAP: Record<string, string[]> = {
  // Physics
  'Rotational Dynamics': ['Laws of Motion', 'Work Power Energy'],
  'Rotational Motion': ['Laws of Motion', 'Work Power Energy'],
  'Electromagnetic Induction': ['Magnetic Effects of Current', 'Electromagnetic Waves'],
  'Alternating Current': ['Electromagnetic Induction', 'Current Electricity'],
  'Wave Optics': ['Ray Optics & Optical Instruments', 'Waves & Sound'],
  'Gravitation': ['Laws of Motion', 'Work Power Energy'],
  'Electrostatics & Gauss Law': ['Vectors & 3D Geometry'],

  // Chemistry
  'Ionic Equilibrium': ['Chemical Equilibrium', 'Thermodynamics & KTG'],
  'Aldehydes, Ketones & Carboxylic Acids': ['General Organic Chemistry (GOC)', 'Hydrocarbons'],
  'Coordination Compounds': ['Chemical Bonding & Molecular Structure', 'd & f Block Elements'],
  'Electrochemistry & Solutions': ['Thermodynamics & KTG', 'Chemical Equilibrium'],

  // Mathematics
  'Definite Integration & Area Under Curves': ['Indefinite Integration', 'Functions, Limits & Continuity'],
  'Differential Equations': ['Indefinite Integration', 'Definite Integration & Area Under Curves'],
  'Coordinate Geometry (Conics: Parabola, Ellipse, Hyperbola)': ['Straight Lines & Circles'],
  'Probability': ['Permutations & Combinations', 'Sets & Relations']
};

interface PrerequisiteFoundationAlertProps {
  currentChapterName: string;
  onOpenPrerequisite?: (chapterId: string) => void;
}

export function PrerequisiteFoundationAlert({
  currentChapterName,
  onOpenPrerequisite
}: PrerequisiteFoundationAlertProps) {
  const chapters = useStudyBrainStore(state => state.chapters) || [];
  const actions = useStudyBrainStore(state => state.actions);

  const prerequisiteNames = useMemo(() => {
    return CHAPTER_PREREQUISITES_MAP[currentChapterName] || [];
  }, [currentChapterName]);

  // Find prerequisite chapters in store and inspect their confidence
  const weakPrerequisites = useMemo(() => {
    if (prerequisiteNames.length === 0) return [];

    return prerequisiteNames.map(name => {
      const found = chapters.find(c => c.name.toLowerCase() === name.toLowerCase() || c.name.includes(name));
      if (!found) {
        return { name, id: '', confidence: 50, isDecaying: true, exists: false };
      }
      const confidence = found.confidenceScore || found.confidence || 0;
      const isDecaying = (found.lastRevisionDaysAgo ?? 0) > 7 || found.retentionStatus === 'Fading' || found.retentionStatus === 'Forgotten';
      return {
        name: found.name,
        id: found.id,
        confidence,
        isDecaying,
        exists: true
      };
    }).filter(p => p.confidence < 65 || p.isDecaying);
  }, [prerequisiteNames, chapters]);

  if (prerequisiteNames.length === 0 || weakPrerequisites.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-left font-sans space-y-2.5 shadow-lg relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
            Prerequisite Foundation Warning
          </h4>
        </div>
        <span className="text-[10px] font-mono text-amber-400/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
          Cognitive Anchor Alert
        </span>
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
        To prevent conceptual bottlenecks in <strong className="text-white font-semibold">{currentChapterName}</strong>, verify mastery in foundational concepts:
      </p>

      <div className="space-y-1.5 pt-1">
        {weakPrerequisites.map((p, idx) => (
          <div 
            key={idx}
            className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono"
          >
            <div className="space-y-0.5">
              <strong className="text-white">{p.name}</strong>
              <div className="text-[10px] text-amber-400">
                Retention: {p.confidence}% {p.isDecaying ? '• Memory Fading' : '• Low Accuracy'}
              </div>
            </div>

            {p.id && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playMechanicalKey('click').catch(() => {});
                  if (onOpenPrerequisite) {
                    onOpenPrerequisite(p.id);
                  } else {
                    actions.openChapterEditModal(p.id);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <span>Review Prereq</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
