import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { Search, Sparkles, Scale, Info, Copy, Check, ChevronRight, X } from 'lucide-react';
import { MathRenderer } from '@/components/MathRenderer';
import { audioEngine } from '@/utils/audioEngine';

interface PhysicalDimensionEntry {
  id: string;
  name: string;
  symbol: string;
  dimension: string;
  siUnit: string;
  formulaRelation: string;
  highYieldNotes: string;
  category: 'Mechanics' | 'Electromagnetism' | 'Thermodynamics' | 'Optics & Modern';
}

export const DIMENSIONS_DATABASE: PhysicalDimensionEntry[] = [
  {
    id: 'planck',
    name: "Planck's Constant",
    symbol: 'h',
    dimension: '[M L^2 T^{-1}]',
    siUnit: '\\text{J}\\cdot\\text{s} \\text{ or } \\text{kg}\\cdot\\text{m}^2\\cdot\\text{s}^{-1}',
    formulaRelation: 'E = h\\nu \\implies h = \\frac{E}{\\nu}',
    highYieldNotes: 'Same dimension as Angular Momentum (L = mvr). Very frequent JEE trap.',
    category: 'Optics & Modern'
  },
  {
    id: 'gravitational',
    name: 'Universal Gravitational Constant',
    symbol: 'G',
    dimension: '[M^{-1} L^3 T^{-2}]',
    siUnit: '\\text{N}\\cdot\\text{m}^2\\cdot\\text{kg}^{-2}',
    formulaRelation: 'F = \\frac{G m_1 m_2}{r^2} \\implies G = \\frac{F r^2}{m_1 m_2}',
    highYieldNotes: 'Notice the negative mass exponent [M^-1]. Often tested in dimensional ratio matching.',
    category: 'Mechanics'
  },
  {
    id: 'permittivity',
    name: 'Permittivity of Free Space',
    symbol: '\\varepsilon_0',
    dimension: '[M^{-1} L^{-3} T^4 I^2]',
    siUnit: '\\text{C}^2\\cdot\\text{N}^{-1}\\cdot\\text{m}^{-2} \\text{ or } \\text{F}\\cdot\\text{m}^{-1}',
    formulaRelation: 'F = \\frac{q_1 q_2}{4\\pi \\varepsilon_0 r^2}',
    highYieldNotes: 'Remember \\frac{1}{4\\pi \\varepsilon_0} = 9 \\times 10^9. [M^-1 L^-3 T^4 I^2].',
    category: 'Electromagnetism'
  },
  {
    id: 'permeability',
    name: 'Permeability of Free Space',
    symbol: '\\mu_0',
    dimension: '[M L T^{-2} I^{-2}]',
    siUnit: '\\text{T}\\cdot\\text{m}\\cdot\\text{A}^{-1} \\text{ or } \\text{H}\\cdot\\text{m}^{-1}',
    formulaRelation: 'B = \\frac{\\mu_0 I}{2\\pi r}',
    highYieldNotes: 'Key speed of light relation: \\frac{1}{\\sqrt{\\mu_0 \\varepsilon_0}} = c \\implies [L T^{-1}].',
    category: 'Electromagnetism'
  },
  {
    id: 'stefan',
    name: 'Stefan-Boltzmann Constant',
    symbol: '\\sigma',
    dimension: '[M L^0 T^{-3} K^{-4}]',
    siUnit: '\\text{W}\\cdot\\text{m}^{-2}\\cdot\\text{K}^{-4}',
    formulaRelation: 'E = \\sigma A T^4 \\implies \\sigma = \\frac{E}{A T^4 t}',
    highYieldNotes: 'No length dimension! [M T^-3 K^-4]. Top trick question in JEE Main shift papers.',
    category: 'Thermodynamics'
  },
  {
    id: 'viscosity',
    name: 'Coefficient of Viscosity',
    symbol: '\\eta',
    dimension: '[M L^{-1} T^{-1}]',
    siUnit: '\\text{Pa}\\cdot\\text{s} \\text{ or } \\text{kg}\\cdot\\text{m}^{-1}\\cdot\\text{s}^{-1}',
    formulaRelation: 'F = 6\\pi \\eta r v \\implies \\eta = \\frac{F}{6\\pi r v}',
    highYieldNotes: 'Derived from Stokes Law. Dimensions: [M L^-1 T^-1]. 1 Poise = 0.1 Pa·s.',
    category: 'Mechanics'
  },
  {
    id: 'boltzmann',
    name: 'Boltzmann Constant',
    symbol: 'k_B',
    dimension: '[M L^2 T^{-2} K^{-1}]',
    siUnit: '\\text{J}\\cdot\\text{K}^{-1}',
    formulaRelation: 'E = \\frac{3}{2} k_B T \\implies k_B = \\frac{2E}{3T}',
    highYieldNotes: 'Same dimension as Entropy (\\Delta S = \\Delta Q / T). Dimensions [M L^2 T^-2 K^-1].',
    category: 'Thermodynamics'
  },
  {
    id: 'capacitance',
    name: 'Capacitance',
    symbol: 'C',
    dimension: '[M^{-1} L^{-2} T^4 I^2]',
    siUnit: '\\text{Farad (F)}',
    formulaRelation: 'q = CV \\implies C = \\frac{q}{V} = \\frac{q^2}{W}',
    highYieldNotes: 'Equivalences: RC has dimension [T]. Energy density \\frac{1}{2}\\varepsilon_0 E^2 is [M L^-1 T^-2].',
    category: 'Electromagnetism'
  },
  {
    id: 'inductance',
    name: 'Self / Mutual Inductance',
    symbol: 'L, M',
    dimension: '[M L^2 T^{-2} I^{-2}]',
    siUnit: '\\text{Henry (H)}',
    formulaRelation: '\\mathcal{E} = -L \\frac{dI}{dt} \\implies L = \\frac{\\mathcal{E} dt}{dI}',
    highYieldNotes: 'Time constant L/R has dimension [T]. Resonance \\sqrt{LC} has dimension [T].',
    category: 'Electromagnetism'
  },
  {
    id: 'magnetic_flux',
    name: 'Magnetic Flux',
    symbol: '\\Phi_B',
    dimension: '[M L^2 T^{-2} I^{-1}]',
    siUnit: '\\text{Weber (Wb)} = \\text{T}\\cdot\\text{m}^2',
    formulaRelation: '\\Phi_B = B \\cdot A',
    highYieldNotes: 'Notice that \\Phi_B / I = L (Inductance). Dimension is [M L^2 T^-2 I^-1].',
    category: 'Electromagnetism'
  }
];

interface DimensionalAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DimensionalAnalysisModal: React.FC<DimensionalAnalysisModalProps> = ({
  isOpen,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Mechanics', 'Electromagnetism', 'Thermodynamics', 'Optics & Modern'];

  const filtered = useMemo(() => {
    return DIMENSIONS_DATABASE.filter(item => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.symbol.toLowerCase().includes(q) ||
        item.dimension.toLowerCase().includes(q) ||
        item.highYieldNotes.toLowerCase().includes(q)
      );
    });
  }, [search, selectedCategory]);

  const handleCopyDimension = (dim: string, id: string) => {
    audioEngine.playMechanicalKey('click').catch(() => {});
    navigator.clipboard.writeText(dim);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={100010}
      backdropClassName="bg-black/35 backdrop-blur-sm"
      className="w-full max-w-4xl bg-[#0e0f14] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 text-left font-sans text-zinc-100 max-h-[85vh] flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/80 pb-4 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-sm">
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dimensional Analysis & Physical Constants</span>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
            High-Yield JEE Constants & Dimensions
          </h2>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Essential physical dimensions $[M^a L^b T^c I^d \theta^e]$ and dimensional equivalences that recurrently appear in JEE Main.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Dimensions Modal"
          className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 self-start sm:self-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search constant, dimension, symbol (e.g. Planck, sigma, [M^-1 L^3 T^-2])..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder-zinc-500 outline-none focus:border-indigo-500/60 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] w-full sm:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                    : 'bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-800/80 font-mono text-xs text-zinc-500">
            No matching physical quantities or constants found.
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-indigo-500/30 transition-all space-y-2.5 shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-display font-bold text-sm">
                    {item.name}
                  </span>
                  <span className="font-mono text-xs text-indigo-300">
                    (<MathRenderer text={`$${item.symbol}$`} />)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-400 font-mono text-[10px]">
                  {item.category}
                </span>
              </div>

              {/* Grid: Dimension & SI Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase text-zinc-500 font-bold block">Dimension</span>
                    <span className="text-emerald-400 font-bold">
                      <MathRenderer text={`$${item.dimension}$`} />
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyDimension(item.dimension, item.id)}
                    className="p-1 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    title="Copy dimension"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[9px] uppercase text-zinc-500 font-bold block">SI Unit / Formula</span>
                  <div className="text-indigo-200 text-[11px] truncate">
                    <MathRenderer text={`$${item.siUnit}$`} />
                  </div>
                </div>
              </div>

              {/* High-yield gotcha note */}
              <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2 font-sans">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{item.highYieldNotes}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs text-zinc-400 shrink-0">
        <span>{filtered.length} high-yield quantities indexed</span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold cursor-pointer transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};
