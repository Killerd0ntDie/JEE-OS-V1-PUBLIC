import React from 'react';
import { BlockMath as KatexBlock, InlineMath as KatexInline } from 'react-katex';

export class MathErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackText?: string },
  { hasError: boolean; error?: Error }
> {
  public state: { hasError: boolean; error?: Error } = { hasError: false };

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('MathErrorBoundary caught rendering error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <span
          className="font-mono text-zinc-300 bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-xs whitespace-pre-wrap inline-block"
          title={this.state.error?.message || 'Math rendering error'}
        >
          {this.props.fallbackText || 'Formula could not be rendered'}
        </span>
      );
    }
    return this.props.children;
  }
}

export const KATEX_MACROS = {
  '\\degree': '^\\circ',
  '\\textdegree': '^\\circ',
  '\\angstrom': '\\text{\\AA}',
  '\\AA': '\\text{\\AA}',
  '\\celsius': '^\\circ\\text{C}',
  '\\ce': '\\text',
  '\\pu': '\\text',
  '\\unit': '\\text'
};

export const BlockMath = React.memo((props: any) => {
  const settings = { macros: KATEX_MACROS, throwOnError: false, ...props.settings };
  return (
    <div className="katex-block-container min-h-[2.5em] my-1 flex items-center justify-center overflow-x-auto overflow-y-hidden">
      <KatexBlock
        {...props}
        settings={settings}
        renderError={(_error: Error) => (
          <span className="font-sans text-inherit">{props.math || ''}</span>
        )}
      />
    </div>
  );
});
BlockMath.displayName = 'BlockMath';

export const InlineMath = React.memo((props: any) => {
  const settings = { macros: KATEX_MACROS, throwOnError: false, ...props.settings };
  return (
    <span className="katex-inline-container inline-block min-h-[1.2em] align-middle">
      <KatexInline
        {...props}
        settings={settings}
        renderError={(_error: Error) => (
          <span className="font-sans text-inherit">{props.math || ''}</span>
        )}
      />
    </span>
  );
});
InlineMath.displayName = 'InlineMath';

export const renderMarkdownInline = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx} className="italic text-inherit opacity-90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-800/80 text-indigo-300 border border-zinc-700/50">{part.slice(1, -1)}</code>;
    }
    return <span key={idx}>{part}</span>;
  });
};

export const renderSafeMath = (mathStr: string) => {
  try {
    return <InlineMath math={mathStr} />;
  } catch (_err) {
    return <span className="text-amber-400 font-mono text-xs" title="LaTeX render failed — raw formula shown">{mathStr}</span>;
  }
};

/**
 * Unpacks natural English sentences mistakenly enclosed in math delimiters ($...$ or $$...$$).
 * When prose sentences like "$x = total number of singly occupied molecular orbital (SOMO) in O2$"
 * or "$P = Number of oxy anions having three equivalent X – O bonds per central atom$"
 * are in math mode, KaTeX renders them in math italic ($t \times o \times t \times a \times l...$)
 * and removes all whitespace between words.
 * This helper detects prose blocks inside math delimiters and unpacks them into normal text with proper
 * spacing, keeping only variables ($x$ =, $P$ =) and chemical formulas ($\text{O}_2$) formatted in math.
 */

import { normalizeChemistryAndOrbitals } from './chemistryNotationHealer';

// Re-export pure string utilities from chemistryNotationHealer
export * from './chemistryNotationHealer';

/**
 * Repairs unbalanced LaTeX single-dollar delimiters and square-bracket formal charges
 * e.g. "(A) $\text{Na}^+[\ddot{\text{O}}-\dot{\text{Cl}}:]^-" -> "(A) $\text{Na}^+{\left[\ddot{\text{O}}-\dot{\text{Cl}}:\right]}^-$"
 * e.g. "(B) \text{CCl}_4$ structure" -> "(B) $\text{CCl}_4$ structure"
 */
export const repairUnbalancedMathDelimiters = (str: string): string => {
  if (!str) return '';
  return str.split('\n').map(rawLine => {
    let line = rawLine;
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Convert bracketed formal charges `[ ... ]^charge` to safe KaTeX `{\left[ ... \right]}^{charge}`
    line = line.replace(/\[([^[\]]+)\]\^([+\-\d]+|\{[^}]+\})/g, (_m, inner, charge) => `{\\left[ ${inner} \\right]}^{${charge}}`);

    // Count non-escaped dollar signs on this line
    const dollars = (trimmed.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 === 1) {
      // Unbalanced dollar on this line!
      // Case A: Line starts with (or has at beginning) $ followed by math (e.g. `(A) $\text{Na}^+...`) but never closes
      if (/^\s*(?:\([a-dA-D1-4]\)|\[[a-dA-D1-4]\]|[a-dA-D1-4][.)]|\b[1-4]\.\s+)?\s*\$/.test(trimmed)) {
        return line + '$';
      }
      // Case B: Line has trailing $ on a math command like `\text{CCl}_4$` but missing opening $
      if (/\\[a-zA-Z]+[^{}$]*\{[^{}$]*\}\s*(?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?\$/.test(trimmed)) {
        return line.replace(/(\\[a-zA-Z]+[^$]*\$)/, '$$$1');
      }
      // Case C: Formula ending with math-like symbols before text, e.g. `(A) $\text{...} text`
      return line + '$';
    }
    return line;
  }).join('\n');
};

export const isStandaloneFormula = (str: string): boolean => {
  if (!str) return false;
  const trimmed = str.trim();
  if (trimmed.startsWith('$') || trimmed.endsWith('$')) return false;
  if (trimmed.includes('\n')) return false;

  const hasLatexCommand = /\\(?:frac|sqrt|text|vec|hat|bar|dot|int|sum|prod|lim|infty|Delta|nabla|partial|times|cdot|pm|approx|equiv|implies|iff|left|right|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|chi|psi|omega|tan|cos|sin|sec|csc|cot|log|ln)\b/.test(trimmed);
  const hasMathRelation = /[=<>]\s*[-\\+0-9a-zA-Z\\{]/.test(trimmed);
  const hasSubSup = /[_^]\{?[0-9a-zA-Z+-]+/.test(trimmed);

  if (!hasLatexCommand && !hasMathRelation && !hasSubSup) return false;

  const proseWordMatch = trimmed.match(/\b(the|is|are|which|following|calculate|find|where|when|with|from|between|because|statement|select|correct|incorrect|option|assume|given|consider|determine)\b/gi);
  if (proseWordMatch && proseWordMatch.length >= 2) {
    return false;
  }

  return true;
};

/**
 * Renders a mathematical formula directly using KaTeX BlockMath.
 * Cleans any leading/trailing delimiters ($$, $, \[, \]) and renders with zero prose interference.
 */
export const FormulaMath = React.memo(({ math, className }: { math: string; className?: string }) => {
  if (!math) return null;
  const clean = math.trim().replace(/^\$\$([\s\S]*?)\$\$$|^\\\[([\s\S]*?)\\\]$|^\$([\s\S]*?)\$$/, (_m, p1, p2, p3) => (p1 || p2 || p3).trim()).trim();
  return (
    <div className={className || "text-white text-base py-1"}>
      <BlockMath math={clean} />
    </div>
  );
});
FormulaMath.displayName = 'FormulaMath';

const delimiterCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

export const normalizeMathDelimiters = (str: string): string => {
  if (!str) return '';
  if (delimiterCache.has(str)) {
    return delimiterCache.get(str)!;
  }

  let clean = repairUnbalancedMathDelimiters(str)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, eq) => `$$${eq}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, eq) => `$${eq}$`)
    .replace(/\\\\\[([\s\S]*?)\\\\\]/g, (_m, eq) => `$$${eq}$$`)
    .replace(/\\\\\(([\s\S]*?)\\\\\)/g, (_m, eq) => `$${eq}$`);

  // Auto-wrap bare LaTeX block environments like \begin{array} ... \end{array} in display math $$...$$
  // and map tabular/align/equation to array/aligned for KaTeX compatibility
  clean = clean.replace(/(?<!\$)\s*(\\begin\{(?:equation|align|aligned|gathered|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|tabular)\*?\}[\s\S]*?\\end\{(?:equation|align|aligned|gathered|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|tabular)\*?\})\s*(?!\$)/g, (_m, env) => {
    const katexEnv = env
      .replace(/\\begin\{tabular\}/g, '\\begin{array}')
      .replace(/\\end\{tabular\}/g, '\\end{array}')
      .replace(/\\begin\{align\*?\}/g, '\\begin{aligned}')
      .replace(/\\end\{align\*?\}/g, '\\end{aligned}')
      .replace(/\\begin\{equation\*?\}/g, '\\begin{aligned}')
      .replace(/\\end\{equation\*?\}/g, '\\end{aligned}')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
    return `$$${katexEnv}$$`;
  });

  // Flatten newlines inside display math $$...$$ so they stay on a single line for line-based renderers
  clean = clean.replace(/\$\$([\s\S]*?)\$\$/g, (_m, eq) => {
    return `$$${eq.trim().replace(/\r?\n\s*/g, ' ')}$$`;
  });

  // Convert bare \textbf{...} outside math into markdown bold **...**
  clean = clean.replace(/(?<!\$)\\textbf\{([^{}]+)\}(?!\$)/g, '**$1**');

  // Auto-wrap bare chemical ionic/Lewis species outside $...$ like `\text{Na}^+[:\ddot{O}-\text{Cl}:]^- diagram`
  clean = clean.replace(/(?<!\$)\b(\\text\{[A-Za-z0-9]+\}\^[+\-0-9a-zA-Z]+(?:\s*\[[^\]]+\]\^[+\-0-9a-zA-Z]+)?)(?!\$)/g, (match) => {
    return `$${match}$`;
  });

  const result = normalizeChemistryAndOrbitals(clean);

  if (delimiterCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = delimiterCache.keys().next().value;
    if (oldestKey) delimiterCache.delete(oldestKey);
  }
  delimiterCache.set(str, result);

  return result;
};
