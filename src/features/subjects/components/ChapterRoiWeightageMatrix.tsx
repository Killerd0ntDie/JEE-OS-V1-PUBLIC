import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Zap, Target, ArrowUpDown, 
  Atom, FlaskConical, Binary, CheckCircle2, 
  AlertTriangle, Filter, ChevronRight, HelpCircle 
} from 'lucide-react';
import { SubjectId } from '@/types/index';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';
import { audioEngine } from '@/utils/audioEngine';

export interface ChapterWeightageData {
  chapterId: string;
  chapterName: string;
  subject: SubjectId;
  tier: 1 | 2 | 3;
  jeeMainAvgQs: number; // Questions per exam session
  jeeAdvAvgMarks: number; // Average marks in Advanced
  estimatedHours: number; // Estimated hours to complete theory + 50 PYQs
  roiScore: number; // Calculated efficiency (0-100)
  keyConcepts: string[];
}

export const JEE_WEIGHTAGE_DATA: ChapterWeightageData[] = [
  // ==================== PHYSICS ====================
  {
    chapterId: 'p24',
    chapterName: 'Modern Physics (Dual Nature & Atoms)',
    subject: 'physics',
    tier: 1,
    jeeMainAvgQs: 2.8,
    jeeAdvAvgMarks: 12,
    estimatedHours: 14,
    roiScore: 96,
    keyConcepts: ['Photoelectric Effect', 'Bohr Model', 'De Broglie Wavelength', 'Nuclear Binding Energy']
  },
  {
    chapterId: 'p11',
    chapterName: 'Thermodynamics & KTG',
    subject: 'physics',
    tier: 1,
    jeeMainAvgQs: 2.5,
    jeeAdvAvgMarks: 10,
    estimatedHours: 16,
    roiScore: 92,
    keyConcepts: ['First Law & Work in Cycles', 'Carnot Efficiency', 'Mean Free Path', 'Molar Specific Heat']
  },
  {
    chapterId: 'p12',
    chapterName: 'Electrostatics & Gauss Law',
    subject: 'physics',
    tier: 1,
    jeeMainAvgQs: 2.2,
    jeeAdvAvgMarks: 12,
    estimatedHours: 20,
    roiScore: 88,
    keyConcepts: ['Flux & Gauss Law', 'Electric Potential Field', 'Conductors in Electrostatics', 'Dipole Torques']
  },
  {
    chapterId: 'p14',
    chapterName: 'Current Electricity',
    subject: 'physics',
    tier: 2,
    jeeMainAvgQs: 2.0,
    jeeAdvAvgMarks: 8,
    estimatedHours: 18,
    roiScore: 82,
    keyConcepts: ['Kirchhoff Laws', 'RC Circuits Transient Analysis', 'Meter Bridge & Potentiometer', 'Drift Velocity']
  },
  {
    chapterId: 'p19',
    chapterName: 'Ray Optics & Optical Instruments',
    subject: 'physics',
    tier: 2,
    jeeMainAvgQs: 1.8,
    jeeAdvAvgMarks: 8,
    estimatedHours: 18,
    roiScore: 78,
    keyConcepts: ['Refraction at Curved Surface', 'Lens Maker Formula', 'Prism Dispersion', 'Microscope & Telescope']
  },
  {
    chapterId: 'p6',
    chapterName: 'Rotational Dynamics',
    subject: 'physics',
    tier: 3,
    jeeMainAvgQs: 1.4,
    jeeAdvAvgMarks: 10,
    estimatedHours: 28,
    roiScore: 58,
    keyConcepts: ['Angular Momentum Conservation', 'Pure Rolling with Friction', 'Moment of Inertia', 'Toppling']
  },

  // ==================== CHEMISTRY ====================
  {
    chapterId: 'c19',
    chapterName: 'Coordination Compounds',
    subject: 'chemistry',
    tier: 1,
    jeeMainAvgQs: 2.6,
    jeeAdvAvgMarks: 12,
    estimatedHours: 12,
    roiScore: 98,
    keyConcepts: ['Crystal Field Theory (CFT)', 'Isomerism', 'IUPAC & Werner Theory', 'Magnetic Moments & Hybridization']
  },
  {
    chapterId: 'c4',
    chapterName: 'Chemical Bonding & Molecular Structure',
    subject: 'chemistry',
    tier: 1,
    jeeMainAvgQs: 2.4,
    jeeAdvAvgMarks: 10,
    estimatedHours: 14,
    roiScore: 94,
    keyConcepts: ['Molecular Orbital Theory (MOT)', 'VSEPR & Hybridization', 'Dipole Moments', 'Hydrogen Bonding']
  },
  {
    chapterId: 'c18',
    chapterName: 'd & f Block Elements',
    subject: 'chemistry',
    tier: 1,
    jeeMainAvgQs: 2.0,
    jeeAdvAvgMarks: 8,
    estimatedHours: 10,
    roiScore: 91,
    keyConcepts: ['KMnO4 & K2Cr2O7 Reactions', 'Lanthanoid Contraction', 'Catalytic & Magnetic Properties', 'Standard Reduction Potentials']
  },
  {
    chapterId: 'c11',
    chapterName: 'Aldehydes, Ketones & Carboxylic Acids',
    subject: 'chemistry',
    tier: 1,
    jeeMainAvgQs: 2.5,
    jeeAdvAvgMarks: 12,
    estimatedHours: 20,
    roiScore: 89,
    keyConcepts: ['Aldol & Cannizzaro Reactions', 'Nucleophilic Addition', 'Tollens & Fehling Tests', 'HVZ Reaction']
  },
  {
    chapterId: 'c8',
    chapterName: 'Electrochemistry & Solutions',
    subject: 'chemistry',
    tier: 2,
    jeeMainAvgQs: 2.0,
    jeeAdvAvgMarks: 8,
    estimatedHours: 16,
    roiScore: 81,
    keyConcepts: ['Nernst Equation', 'Kohlrausch Law', 'Colligative Properties & van\'t Hoff Factor', 'Conductance']
  },
  {
    chapterId: 'c14',
    chapterName: 'Ionic Equilibrium',
    subject: 'chemistry',
    tier: 3,
    jeeMainAvgQs: 1.2,
    jeeAdvAvgMarks: 8,
    estimatedHours: 22,
    roiScore: 60,
    keyConcepts: ['Buffer Solutions & Henderson Equation', 'Solubility Product (Ksp)', 'Salt Hydrolysis', 'Polyprotic Titrations']
  },

  // ==================== MATHEMATICS ====================
  {
    chapterId: 'm14',
    chapterName: 'Vectors & 3D Geometry',
    subject: 'maths',
    tier: 1,
    jeeMainAvgQs: 3.2,
    jeeAdvAvgMarks: 14,
    estimatedHours: 16,
    roiScore: 99,
    keyConcepts: ['Scalar & Vector Triple Product', 'Shortest Distance Between Skew Lines', 'Plane Equations & Projections', 'Angle Bisectors']
  },
  {
    chapterId: 'm3',
    chapterName: 'Matrices & Determinants',
    subject: 'maths',
    tier: 1,
    jeeMainAvgQs: 2.2,
    jeeAdvAvgMarks: 10,
    estimatedHours: 12,
    roiScore: 95,
    keyConcepts: ['Cramer Rule & System of Equations', 'Adjoint & Inverse Properties', 'Cayley-Hamilton Theorem', 'Characteristic Equation']
  },
  {
    chapterId: 'm8',
    chapterName: 'Definite Integration & Area Under Curves',
    subject: 'maths',
    tier: 1,
    jeeMainAvgQs: 2.5,
    jeeAdvAvgMarks: 12,
    estimatedHours: 18,
    roiScore: 90,
    keyConcepts: ['King\'s Property & Periodic Integrals', 'Leibnitz Rule of Differentiation', 'Area with Modulus Curves', 'Integration as Limit of Sum']
  },
  {
    chapterId: 'm10',
    chapterName: 'Differential Equations',
    subject: 'maths',
    tier: 2,
    jeeMainAvgQs: 1.8,
    jeeAdvAvgMarks: 8,
    estimatedHours: 14,
    roiScore: 84,
    keyConcepts: ['Linear Differential Equations (IF)', 'Homogeneous & Exact Form', 'Variable Separable & Substitutions', 'Orthogonal Trajectories']
  },
  {
    chapterId: 'm11',
    chapterName: 'Coordinate Geometry (Conics: Parabola, Ellipse, Hyperbola)',
    subject: 'maths',
    tier: 2,
    jeeMainAvgQs: 2.5,
    jeeAdvAvgMarks: 12,
    estimatedHours: 24,
    roiScore: 79,
    keyConcepts: ['Tangent & Normal Equations (T=0)', 'Director Circle & Chord of Contact', 'Eccentricity & Foci Relationships', 'Parametric Coordinates']
  },
  {
    chapterId: 'm5',
    chapterName: 'Permutations & Combinations',
    subject: 'maths',
    tier: 3,
    jeeMainAvgQs: 1.2,
    jeeAdvAvgMarks: 8,
    estimatedHours: 22,
    roiScore: 56,
    keyConcepts: ['Derangements & Beggar Method', 'Inclusion-Exclusion Principle', 'Circular Permutations', 'Grid Path Counting']
  }
];

interface ChapterRoiWeightageMatrixProps {
  onSelectChapter?: (chapterId: string) => void;
}

export function ChapterRoiWeightageMatrix({ onSelectChapter }: ChapterRoiWeightageMatrixProps) {
  const actions = useStudyBrainStore(state => state.actions);
  const [activeSubject, setActiveSubject] = useState<SubjectId | 'all'>('all');
  const [activeTier, setActiveTier] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'roi' | 'jeeMain' | 'jeeAdv' | 'hours'>('roi');

  const filteredData = useMemo(() => {
    return JEE_WEIGHTAGE_DATA.filter(item => {
      if (activeSubject !== 'all' && item.subject !== activeSubject) return false;
      if (activeTier !== 'all' && item.tier !== activeTier) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'roi') return b.roiScore - a.roiScore;
      if (sortBy === 'jeeMain') return b.jeeMainAvgQs - a.jeeMainAvgQs;
      if (sortBy === 'jeeAdv') return b.jeeAdvAvgMarks - a.jeeAdvAvgMarks;
      if (sortBy === 'hours') return a.estimatedHours - b.estimatedHours;
      return 0;
    });
  }, [activeSubject, activeTier, sortBy]);

  const getTierTheme = (tier: number) => {
    switch (tier) {
      case 1:
        return { label: 'Tier 1: High ROI Yield', badge: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300', dot: 'bg-emerald-400' };
      case 2:
        return { label: 'Tier 2: Regular Core', badge: 'bg-sky-950/80 border-sky-500/40 text-sky-300', dot: 'bg-sky-400' };
      case 3:
        return { label: 'Tier 3: Heavy Effort', badge: 'bg-amber-950/80 border-amber-500/40 text-amber-300', dot: 'bg-amber-400' };
      default:
        return { label: 'Standard', badge: 'bg-zinc-900 border-zinc-800 text-zinc-300', dot: 'bg-zinc-400' };
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              HISTORICAL SYLLABUS INTELLIGENCE (2019-2025)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Chapter ROI & JEE Weightage Matrix
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Prioritizes syllabus chapters by <strong>Marks per Study Hour</strong> based on empirical NTA and JEE Advanced question frequency.
          </p>
        </div>

        {/* Top Tier 1 Metric Pill */}
        <div className="px-4 py-2.5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-center gap-3 shrink-0">
          <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Top ROI Strategy</div>
            <div className="text-xs font-mono font-bold text-white">Tier 1 yields ~60% of total marks</div>
          </div>
        </div>
      </div>

      {/* 1. FILTER & SORTING CONTROLS */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs font-mono">
        
        {/* Subject Switcher */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubject('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              activeSubject === 'all' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveSubject('physics')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              activeSubject === 'physics' ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            Physics
          </button>
          <button
            type="button"
            onClick={() => setActiveSubject('chemistry')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              activeSubject === 'chemistry' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Chemistry
          </button>
          <button
            type="button"
            onClick={() => setActiveSubject('maths')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              activeSubject === 'maths' ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            Maths
          </button>
        </div>

        {/* Tier Filter + Sort By Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTier('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                activeTier === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Tiers
            </button>
            <button
              type="button"
              onClick={() => setActiveTier(1)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                activeTier === 1 ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-white'
              }`}
            >
              Tier 1 (High)
            </button>
            <button
              type="button"
              onClick={() => setActiveTier(2)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                activeTier === 2 ? 'bg-sky-600 text-white' : 'text-sky-400 hover:text-white'
              }`}
            >
              Tier 2 (Core)
            </button>
            <button
              type="button"
              onClick={() => setActiveTier(3)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                activeTier === 3 ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-white'
              }`}
            >
              Tier 3 (Heavy)
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="roi" className="bg-zinc-950">Sort by Highest ROI Efficiency</option>
              <option value="jeeMain" className="bg-zinc-950">Sort by JEE Main Frequency</option>
              <option value="jeeAdv" className="bg-zinc-950">Sort by JEE Adv Marks</option>
              <option value="hours" className="bg-zinc-950">Sort by Least Study Hours</option>
            </select>
          </div>
        </div>

      </div>

      {/* 2. CHAPTER WEIGHTAGE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredData.map(item => {
          const tierTheme = getTierTheme(item.tier);

          return (
            <motion.div
              key={item.chapterId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl border border-white/10 glass-panel hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
            >
              {/* Card Header: Subject + Title + Tier Badge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                      {item.subject}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${tierTheme.badge} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tierTheme.dot}`} />
                      {tierTheme.label}
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs text-zinc-400">ROI Score: </span>
                    <strong className="text-emerald-400 font-bold text-sm">{item.roiScore}/100</strong>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white font-display tracking-tight">
                  {item.chapterName}
                </h3>
              </div>

              {/* Empirical Weightage Stats Grid */}
              <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-0.5">
                  <span className="text-[9px] text-zinc-400 uppercase block">JEE Main Freq</span>
                  <div className="font-bold text-white">~{item.jeeMainAvgQs} Qs/yr</div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-0.5">
                  <span className="text-[9px] text-zinc-400 uppercase block">JEE Adv Marks</span>
                  <div className="font-bold text-indigo-300">~{item.jeeAdvAvgMarks} Marks</div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-0.5">
                  <span className="text-[9px] text-zinc-400 uppercase block">Est. Effort</span>
                  <div className="font-bold text-zinc-300">~{item.estimatedHours} Hours</div>
                </div>
              </div>

              {/* Key Concept Chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  High-Yield Core Concepts:
                </span>
                <div className="flex flex-wrap gap-1">
                  {item.keyConcepts.map((c, idx) => (
                    <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900/90 text-zinc-300 border border-zinc-800">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playMechanicalKey('click').catch(() => {});
                    actions.openChapterEditModal(item.chapterId);
                  }}
                  className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Open Chapter Hub & Syllabus</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
