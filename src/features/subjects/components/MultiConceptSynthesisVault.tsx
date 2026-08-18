import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitMerge, Atom, FlaskConical, Binary, 
  ChevronRight, BookOpen, CheckCircle2, Sparkles, 
  Layers, ArrowRight, Lightbulb 
} from 'lucide-react';
import { SubjectId } from '@/types/index';
import { MathRenderer } from '@/components/MathRenderer';
import { audioEngine } from '@/utils/audioEngine';

export interface SynthesisProblem {
  id: string;
  title: string;
  subject: SubjectId;
  linkedChapters: string[];
  difficulty: 'JEE Advanced' | 'JEE Advanced (Olympiad Level)';
  questionText: string;
  conceptBridges: {
    step: string;
    concept: string;
    description: string;
  }[];
  finalAnswer: string;
  analyticalSolution: string;
}

export const SYNTHESIS_PROBLEMS: SynthesisProblem[] = [
  // ==================== PHYSICS ====================
  {
    id: 'syn-p1',
    title: 'Oscillating Electric Dipole in Rotating Cylinder',
    subject: 'physics',
    linkedChapters: ['Rotational Dynamics', 'Electrostatics & Gauss Law', 'Simple Harmonic Motion'],
    difficulty: 'JEE Advanced',
    questionText: 'A non-conducting solid cylinder of mass $M$ and radius $R$ is free to rotate about its fixed horizontal axis. An electric dipole of dipole moment $p$ is fixed at its center making an angle $\\theta$ with a uniform horizontal electric field $E$. If the cylinder is released from a small angular displacement $\\theta_0$, find the angular frequency $\\omega$ of small oscillations.',
    conceptBridges: [
      {
        step: 'Bridge 1: Electrostatic Restoring Torque',
        concept: 'Dipole in Uniform E-Field',
        description: 'The electric field exerts a restoring torque $\\tau = -pE \\sin\\theta \\approx -pE\\theta$ for small oscillations.'
      },
      {
        step: 'Bridge 2: Rotational Dynamics Moment of Inertia',
        concept: 'Moment of Inertia of Solid Cylinder',
        description: 'Moment of inertia about central axis $I = \\frac{1}{2}MR^2$.'
      },
      {
        step: 'Bridge 3: SHM Angular Differential Equation',
        concept: 'Equation of Motion',
        description: 'Equating $I \\alpha = \\tau \\implies \\frac{1}{2}MR^2 \\frac{d^2\\theta}{dt^2} + pE\\theta = 0$.'
      }
    ],
    finalAnswer: '\\omega = \\sqrt{\\frac{2pE}{MR^2}}',
    analyticalSolution: 'The restoring torque on the dipole is $\\tau = -p E \\sin \\theta$. For small angular displacements, $\\sin\\theta \\approx \\theta$, so $\\tau = -p E \\theta$.\n\nUsing Newton\'s second law for rotation:\n$$I \\frac{d^2\\theta}{dt^2} = \\tau = -p E \\theta$$\nFor a solid cylinder, $I = \\frac{1}{2} M R^2$. Substituting $I$:\n$$\\frac{1}{2} M R^2 \\frac{d^2\\theta}{dt^2} + p E \\theta = 0 \\implies \\frac{d^2\\theta}{dt^2} + \\left(\\frac{2pE}{MR^2}\\right)\\theta = 0$$\nComparing with standard SHM equation $\\frac{d^2\\theta}{dt^2} + \\omega^2 \\theta = 0$:\n$$\\omega = \\sqrt{\\frac{2pE}{MR^2}}$$'
  },
  {
    id: 'syn-p2',
    title: 'Thermodynamic Expansion of Gas Floating a Piston in Fluid',
    subject: 'physics',
    linkedChapters: ['Thermodynamics & KTG', 'Fluid Statics & Buoyancy'],
    difficulty: 'JEE Advanced',
    questionText: 'An ideal monoatomic gas is enclosed in a vertical cylinder beneath a piston of mass $m$ and area $A$. The cylinder is submerged in a liquid of density $\\rho$. Heat is slowly added to the gas such that the piston rises by height $h$ while the cylinder remains stationary. Find the total work done by the gas during this process.',
    conceptBridges: [
      {
        step: 'Bridge 1: Fluid Pressure on Submerged Piston',
        concept: 'Hydrostatic Pressure Balance',
        description: 'Gas pressure must balance atmospheric pressure, piston weight, and variable hydrostatic liquid column $P(y) = P_0 + \\frac{mg}{A} + \\rho g (H - y)$.'
      },
      {
        step: 'Bridge 2: Variable Pressure Thermodynamic Work',
        concept: 'Work Integral $\\int P dV$',
        description: 'Integrate the linear variable pressure over the volume change $dV = A dy$.'
      }
    ],
    finalAnswer: 'W = \\left(P_0 A + mg + \\rho g A H - \\frac{1}{2}\\rho g A h\\right) h',
    analyticalSolution: 'At any height $y$ of the piston from initial position, the pressure of the gas is:\n$$P(y) = P_0 + \\frac{mg}{A} + \\rho g (H - y)$$\nThe elementary work done by the gas when piston moves by $dy$ is:\n$$dW = P(y) dV = P(y) (A dy) = \\left[\\left(P_0 + \\frac{mg}{A} + \\rho g H\\right) - \\rho g y\\right] A dy$$\nIntegrating from $y = 0$ to $y = h$:\n$$W = \\int_0^h \\left[(P_0 A + mg + \\rho g A H) - \\rho g A y\\right] dy = (P_0 A + mg + \\rho g A H)h - \\frac{1}{2}\\rho g A h^2$$\n$$W = \\left(P_0 A + mg + \\rho g A H - \\frac{1}{2}\\rho g A h\\right)h$$'
  },

  // ==================== CHEMISTRY ====================
  {
    id: 'syn-c1',
    title: 'Electrochemical Cell Coupled with Acid Buffer Equilibrium',
    subject: 'chemistry',
    linkedChapters: ['Electrochemistry & Solutions', 'Ionic Equilibrium'],
    difficulty: 'JEE Advanced',
    questionText: 'A galvanic cell is constructed with a standard hydrogen electrode (SHE) and a hydrogen electrode dipping in an acetate buffer solution ($0.1\\text{ M } \\text{CH}_3\\text{COOH} + 0.1\\text{ M } \\text{CH}_3\\text{COONa}$, $K_a = 1.8 \\times 10^{-5}$). If the partial pressure of $\\text{H}_2$ gas is $1\\text{ atm}$ at both electrodes at $298\\text{ K}$, calculate the cell EMF $E_{\\text{cell}}$.',
    conceptBridges: [
      {
        step: 'Bridge 1: Buffer pH via Henderson-Hasselbalch',
        concept: 'Ionic Buffer System',
        description: '$\\text{pH} = \\text{p}K_a + \\log\\frac{[\\text{Salt}]}{[\\text{Acid}]} = -\\log(1.8\\times 10^{-5}) + \\log(1) = 4.74$.'
      },
      {
        step: 'Bridge 2: Nernst Equation for Hydrogen Electrode',
        concept: 'Electrochemical Potential',
        description: 'Reduction potential of hydrogen electrode $E = -0.0591 \\times \\text{pH} = -0.280\\text{ V}$.'
      }
    ],
    finalAnswer: 'E_{\\text{cell}} = +0.280\\text{ V}',
    analyticalSolution: 'Step 1: Calculate the $[\\text{H}^+]$ concentration in the acetate buffer using the Henderson-Hasselbalch equation:\n$$\\text{pH} = \\text{p}K_a + \\log\\left(\\frac{[\\text{CH}_3\\text{COO}^-]}{[\\text{CH}_3\\text{COOH}]}\\right) = -\\log(1.8 \\times 10^{-5}) + \\log(1) = 4.74$$\nThus, $[\\text{H}^+] = 10^{-4.74}\\text{ M}$.\n\nStep 2: Apply the Nernst equation for the cell reaction:\n$$\\text{Anode: } \\frac{1}{2}\\text{H}_2(1\\text{ atm}) \\rightarrow \\text{H}^+(\\text{buffer}) + e^-\\quad (E_{\\text{ox}} = +0.0591\\times \\text{pH})$$\n$$\\text{Cathode (SHE): } \\text{H}^+(1\\text{ M}) + e^- \\rightarrow \\frac{1}{2}\\text{H}_2(1\\text{ atm})\\quad (E_{\\text{red}} = 0.00\\text{ V})$$\n$$E_{\\text{cell}} = E^\\circ_{\\text{cell}} - \\frac{0.0591}{1}\\log\\left(\\frac{[\\text{H}^+]_{\\text{buffer}}}{[\\text{H}^+]_{\\text{SHE}}}\\right) = 0 - 0.0591\\log(10^{-4.74}) = +0.0591 \\times 4.74 = +0.280\\text{ V}$$'
  },

  // ==================== MATHEMATICS ====================
  {
    id: 'syn-m1',
    title: 'Locus of Complex Roots Lying on Conic Section Directrix',
    subject: 'maths',
    linkedChapters: ['Complex Numbers', 'Coordinate Geometry (Conics: Parabola, Ellipse, Hyperbola)'],
    difficulty: 'JEE Advanced',
    questionText: 'Let $z$ be a complex number satisfying $\\left|z - 3\\right| + \\left|z + 3\\right| = 10$. If the locus of $z$ represents an ellipse in the Argand plane, find the equation of its directrices and the maximum value of $|z - 4i|$.',
    conceptBridges: [
      {
        step: 'Bridge 1: Focal Property of Ellipse in Complex Plane',
        concept: 'Sum of Distances to Foci',
        description: '$|z - z_1| + |z - z_2| = 2a \\implies$ Foci at $(\\pm 3, 0)$ with major axis $2a = 10 \\implies a = 5, c = 3$.'
      },
      {
        step: 'Bridge 2: Conic Geometry Directrix & Minor Axis',
        concept: 'Eccentricity & Directrix',
        description: '$e = \\frac{c}{a} = \\frac{3}{5} \\implies b = \\sqrt{a^2 - c^2} = 4$. Directrices $x = \\pm \\frac{a}{e} = \\pm \\frac{25}{3}$.'
      },
      {
        step: 'Bridge 3: Geometric Extremum on Ellipse',
        concept: 'Parametric Distance Optimization',
        description: 'Parametric point $(5\\cos\\theta, 4\\sin\\theta)$ distance to $(0, 4)$ maximized at $(0, -4) \\implies \\text{Max} = 8$.'
      }
    ],
    finalAnswer: '\\text{Directrices: } x = \\pm \\frac{25}{3}, \\quad \\max|z - 4i| = 8',
    analyticalSolution: 'Step 1: The equation $|z - 3| + |z + 3| = 10$ represents the locus of a point whose sum of distances from $S_1(3, 0)$ and $S_2(-3, 0)$ is constant ($2a = 10 \\implies a = 5$).\nDistance between foci $2ae = 6 \\implies ae = 3 \\implies e = \\frac{3}{5}$.\nSemi-minor axis $b = \\sqrt{a^2(1 - e^2)} = \\sqrt{25(1 - 9/25)} = 4$.\nEquation of ellipse: $\\frac{x^2}{25} + \\frac{y^2}{16} = 1$.\n\nStep 2: Directrices are given by $x = \\pm \\frac{a}{e} = \\pm \\frac{5}{3/5} = \\pm \\frac{25}{3}$.\n\nStep 3: To find maximum value of $|z - 4i|$, let $z = 5\\cos\\theta + 4i\\sin\\theta$.\n$$|z - 4i|^2 = (5\\cos\\theta)^2 + (4\\sin\\theta - 4)^2 = 25\\cos^2\\theta + 16\\sin^2\\theta - 32\\sin\\theta + 16$$\n$$= 25(1 - \\sin^2\\theta) + 16\\sin^2\\theta - 32\\sin\\theta + 16 = -9\\sin^2\\theta - 32\\sin\\theta + 41$$\nFor $\\sin\\theta \\in [-1, 1]$, the maximum occurs at $\\sin\\theta = -1$:\n$$\\text{Max } |z - 4i|^2 = -9(-1)^2 - 32(-1) + 41 = -9 + 32 + 41 = 64 \\implies \\max|z - 4i| = 8$$'
  }
];

export function MultiConceptSynthesisVault() {
  const [activeSubject, setActiveSubject] = useState<'all' | 'physics' | 'chemistry' | 'maths'>('all');
  const [activeProblemId, setActiveProblemId] = useState<string>(SYNTHESIS_PROBLEMS[0].id);
  const [showSolution, setShowSolution] = useState(false);

  const filteredProblems = useMemo(() => {
    return SYNTHESIS_PROBLEMS.filter(p => {
      if (activeSubject !== 'all' && p.subject !== activeSubject) return false;
      return true;
    });
  }, [activeSubject]);

  const activeProblem = useMemo(() => {
    return filteredProblems.find(p => p.id === activeProblemId) || filteredProblems[0] || SYNTHESIS_PROBLEMS[0];
  }, [filteredProblems, activeProblemId]);

  return (
    <div className="p-6 rounded-3xl border border-white/10 glass-panel shadow-2xl space-y-6 text-left relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 flex items-center gap-1">
              <GitMerge className="w-3 h-3 text-purple-400" />
              JEE ADVANCED INTER-CHAPTER DRILLS
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Multi-Concept Synthesis PYQ Vault
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans leading-relaxed">
            Curated problems that bridge 2 to 3 syllabus chapters to develop high-order JEE Advanced cross-topic intuition.
          </p>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 shrink-0 font-mono text-xs">
          {(['all', 'physics', 'chemistry', 'maths'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setActiveSubject(s);
                setShowSolution(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                activeSubject === s ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Problem Selector + Detailed Solver Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Problem Directory (5 Cols) */}
        <div className="lg:col-span-5 space-y-2.5 font-mono text-xs">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">
            Synthesis Problems ({filteredProblems.length})
          </span>

          {filteredProblems.map((prob) => {
            const isSelected = activeProblem.id === prob.id;

            return (
              <button
                key={prob.id}
                type="button"
                onClick={() => {
                  audioEngine.playMechanicalKey('click').catch(() => {});
                  setActiveProblemId(prob.id);
                  setShowSolution(false);
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 ${
                  isSelected 
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-600/20' 
                    : 'bg-zinc-950/60 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-400">
                    {prob.subject} • {prob.difficulty}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
                </div>

                <h4 className="text-sm font-bold text-white font-sans line-clamp-1">
                  {prob.title}
                </h4>

                <div className="flex flex-wrap gap-1 pt-1">
                  {prob.linkedChapters.map((chap, i) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {chap}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Problem Bridge Studio (7 Cols) */}
        <div className="lg:col-span-7 bg-[#121318] border border-white/10 rounded-3xl p-6 space-y-5 shadow-xl">
          
          {/* Header Bar */}
          <div className="border-b border-white/5 pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                Synthesis Breakdown // {activeProblem.subject.toUpperCase()}
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
                {activeProblem.difficulty}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white font-display">
              {activeProblem.title}
            </h3>

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-mono text-zinc-400">Bridged Chapters:</span>
              {activeProblem.linkedChapters.map((c, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 font-bold">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Problem Statement with KaTeX */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 text-sm font-serif text-zinc-200 leading-relaxed">
            <MathRenderer text={activeProblem.questionText} />
          </div>

          {/* Conceptual Bridges / Multi-Stage Flow */}
          <div className="space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Multi-Stage Conceptual Bridges:
            </span>

            <div className="space-y-2 font-mono text-xs">
              {activeProblem.conceptBridges.map((b, bIdx) => (
                <div key={bIdx} className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <strong className="text-indigo-300">{b.step}</strong>
                    <span className="text-[10px] text-zinc-500">{b.concept}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    {b.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Solution & Final Derivation Toggle */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playMechanicalKey('click').catch(() => {});
                  setShowSolution(prev => !prev);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/30"
              >
                {showSolution ? 'Hide Analytical Derivation' : 'Reveal Complete LaTeX Solution'}
              </button>

              <div className="text-xs font-mono text-zinc-400">
                Target Solve Time: <strong className="text-white">~4.5 mins</strong>
              </div>
            </div>

            <AnimatePresence>
              {showSolution && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-5 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-3 font-serif text-xs text-zinc-300 leading-relaxed shadow-inner"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 font-mono text-xs">
                    <span className="text-emerald-400 font-bold uppercase">Final Answer:</span>
                    <span className="p-1 px-2.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                      <MathRenderer text={activeProblem.finalAnswer} />
                    </span>
                  </div>

                  <div className="pt-2">
                    <MathRenderer text={activeProblem.analyticalSolution} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
}
