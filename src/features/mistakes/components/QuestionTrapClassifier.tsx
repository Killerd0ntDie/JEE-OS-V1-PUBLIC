import React from 'react';
import { 
  Zap, GitBranch, AlertTriangle, Calculator, 
  CheckCircle2, Clock, Target 
} from 'lucide-react';

export type QuestionArchetype = 
  | 'Single Concept Direct' 
  | 'Multi-Step Derivation' 
  | 'Algebraic Boundary Trap' 
  | 'Calculation Intensive';

export interface QuestionArchetypeMeta {
  type: QuestionArchetype;
  label: string;
  shortTag: string;
  targetSeconds: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  antiTrapRule: string;
}

export const QUESTION_ARCHETYPES: Record<QuestionArchetype, QuestionArchetypeMeta> = {
  'Single Concept Direct': {
    type: 'Single Concept Direct',
    label: 'Single Concept Direct',
    shortTag: '1-Step Direct',
    targetSeconds: '< 60s',
    badgeClass: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
    icon: Zap,
    description: 'Direct 1-step formula application or factual theoretical recall.',
    antiTrapRule: 'Bank quickly in Round 1. Do not over-complicate.'
  },
  'Multi-Step Derivation': {
    type: 'Multi-Step Derivation',
    label: 'Multi-Step Derivation',
    shortTag: '2-Step Standard',
    targetSeconds: '90 - 150s',
    badgeClass: 'bg-sky-950/80 border-sky-500/40 text-sky-300',
    icon: GitBranch,
    description: 'Standard textbook / DPP problem requiring 2 sequential equation substitutions.',
    antiTrapRule: 'Write down intermediate variables clearly before solving for target.'
  },
  'Algebraic Boundary Trap': {
    type: 'Algebraic Boundary Trap',
    label: 'Algebraic Boundary Trap',
    shortTag: 'Boundary / Sign Trap',
    targetSeconds: '120 - 180s',
    badgeClass: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
    icon: AlertTriangle,
    description: 'Deliberately contains sign traps, unit conversions (e.g. cm to m), or limit domain constraints.',
    antiTrapRule: 'Verify signs ($\pm$), dimension consistency, and boundary edge values before selecting option.'
  },
  'Calculation Intensive': {
    type: 'Calculation Intensive',
    label: 'Calculation Intensive',
    shortTag: 'Heavy Algebra',
    targetSeconds: '> 180s',
    badgeClass: 'bg-purple-950/80 border-purple-500/40 text-purple-300',
    icon: Calculator,
    description: 'Requires tedious multi-term algebra, determinants, or quadratic square roots.',
    antiTrapRule: 'Defer to Round 2 or 3 to prevent dead-time sinks during early exam momentum.'
  }
};

interface QuestionTrapBadgeProps {
  archetype?: QuestionArchetype;
  showDetails?: boolean;
}

export function QuestionTrapBadge({ archetype = 'Multi-Step Derivation', showDetails = false }: QuestionTrapBadgeProps) {
  const meta = QUESTION_ARCHETYPES[archetype] || QUESTION_ARCHETYPES['Multi-Step Derivation'];
  const IconComponent = meta.icon;

  return (
    <div className="space-y-1 font-mono text-xs text-left">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-bold text-[10px] uppercase tracking-wider ${meta.badgeClass}`}>
        <IconComponent className="w-3 h-3" />
        <span>{meta.label} ({meta.targetSeconds})</span>
      </span>

      {showDetails && (
        <div className="p-2 rounded-lg bg-zinc-950/60 border border-white/5 space-y-0.5 text-[11px] text-zinc-400">
          <div><strong className="text-zinc-300">Strategy:</strong> {meta.description}</div>
          <div><strong className="text-amber-400">Anti-Trap:</strong> {meta.antiTrapRule}</div>
        </div>
      )}
    </div>
  );
}
