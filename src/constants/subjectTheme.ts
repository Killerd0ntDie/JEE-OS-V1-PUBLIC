export interface SubjectTheme {
  id: 'physics' | 'chemistry' | 'maths';
  name: string;
  text: string;
  bg: string;
  border: string;
  badge: string;
  glow: string;
  gradient: string;
  iconColor: string;
}

export const SUBJECT_THEMES: Record<'physics' | 'chemistry' | 'maths', SubjectTheme> = {
  physics: {
    id: 'physics',
    name: 'Physics',
    text: 'text-sky-400',
    bg: 'bg-sky-950/20',
    border: 'border-sky-900/50',
    badge: 'bg-sky-950/40 text-sky-400 border border-sky-900/50',
    glow: 'from-sky-500/20',
    gradient: 'from-sky-500/20 via-sky-500/5 to-transparent',
    iconColor: 'text-sky-400',
  },
  chemistry: {
    id: 'chemistry',
    name: 'Chemistry',
    text: 'text-emerald-400',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-900/50',
    badge: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50',
    glow: 'from-emerald-500/20',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    iconColor: 'text-emerald-400',
  },
  maths: {
    id: 'maths',
    name: 'Mathematics',
    text: 'text-indigo-400',
    bg: 'bg-indigo-950/20',
    border: 'border-indigo-900/50',
    badge: 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/50',
    glow: 'from-indigo-500/20',
    gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
    iconColor: 'text-indigo-400',
  },
};

/**
 * Normalizes any subject string ('physics', 'PHYSICS', 'Physics', etc.)
 * and returns its single source of truth SubjectTheme.
 */
export function getSubjectTheme(subject?: string | null): SubjectTheme {
  const normalized = (subject || '').toLowerCase().trim();
  if (normalized.includes('phys')) return SUBJECT_THEMES.physics;
  if (normalized.includes('chem')) return SUBJECT_THEMES.chemistry;
  return SUBJECT_THEMES.maths; // Default to maths / indigo
}
