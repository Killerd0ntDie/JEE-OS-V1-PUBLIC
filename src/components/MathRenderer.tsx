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

export const BlockMath = (props: any) => {
  const settings = { macros: KATEX_MACROS, throwOnError: false, ...props.settings };
  return (
    <KatexBlock
      {...props}
      settings={settings}
      renderError={(_error: Error) => (
        <span className="font-sans text-inherit">{props.math || ''}</span>
      )}
    />
  );
};

export const InlineMath = (props: any) => {
  const settings = { macros: KATEX_MACROS, throwOnError: false, ...props.settings };
  return (
    <KatexInline
      {...props}
      settings={settings}
      renderError={(_error: Error) => (
        <span className="font-sans text-inherit">{props.math || ''}</span>
      )}
    />
  );
};

const renderMarkdownInline = (text: string) => {
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

const renderSafeMath = (mathStr: string) => {
  try {
    return <InlineMath math={mathStr} />;
  } catch (err) {
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
export function unpackProseFromMath(text: unknown): string {
  if (text === null || text === undefined) return '';
  const str = typeof text === 'string' ? text : String(text);
  if (!str.trim()) return '';
  return str.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (fullMatch, block) => {
    const isDouble = block.startsWith('$$');
    const inner = isDouble ? block.slice(2, -2) : block.slice(1, -1);

    // If it contains \text{...}, check what's inside
    const withoutLatex = inner.replace(/\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\])?/g, ' ');
    const words = withoutLatex.match(/[a-zA-Z]{3,}/g) || [];
    const proseKeywords = /\b(total|number|having|equivalent|bonds?|orbital|orbitals|singly|occupied|molecules?|where|per|central|atom|atoms|which|following|statement|statements|species|transformations?|magnetic|nature|plane|planar|axial|equatorial|equal|greater|lesser|than|order|increases|decreases)\b/i;

    if (words.length >= 3 || proseKeywords.test(withoutLatex) || proseKeywords.test(inner)) {
      // Unpack: this is prose that was mistakenly wrapped in math delimiters!
      let unpacked = inner;

      // Unpack \text{...} wrappers to normal prose text
      unpacked = unpacked.replace(/\\text\{\s*([^{}]+)\s*\}/g, '$1');

      // Wrap variables in their own math delimiters: e.g. "x =" -> "$x$ =", "P =" -> "$P$ ="
      unpacked = unpacked.replace(/(?:^|(?<=\s|,))([a-zA-Z])\s*=\s*/g, '$$$1$$ = ');

      // Wrap chemical formulas: e.g. "in O2" -> "in $\text{O}_2$"
      unpacked = unpacked.replace(/\b(O2|B2|NO|N2|H2|CO|SO3|BF3|PCl5|CCl4)\b/g, (_m, f) => {
        const withSub = f.replace(/(\d+)/g, '_$1');
        return `$\\text{${withSub}}$`;
      });

      // Wrap single chemical bonds: e.g. "X - O" -> "$\text{X}-\text{O}$"
      unpacked = unpacked.replace(/\b([A-Z])\s*[-–]\s*([A-Z])\b/g, '$\\text{$1}-\\text{$2}$');

      return unpacked;
    }

    return fullMatch;
  });
}

export const ADOBE_SYMBOL_MAP: Record<number, string> = {
  // Whitespace & basic ASCII equivalents
  0xf020: ' ',
  0xf02b: '+',
  0xf02d: '-',
  0xf03d: '=',
  0xf0a0: ' ',

  // Greek lowercase
  0xf061: '\\alpha ', 0xf062: '\\beta ', 0xf063: '\\chi ', 0xf064: '\\delta ',
  0xf065: '\\epsilon ', 0xf066: '\\phi ', 0xf067: '\\gamma ', 0xf068: '\\eta ',
  0xf069: '\\iota ', 0xf06a: '\\phi ', 0xf06b: '\\kappa ', 0xf06c: '\\lambda ',
  0xf06d: '\\mu ', 0xf06e: '\\nu ', 0xf06f: 'o', 0xf070: '\\pi ',
  0xf071: '\\theta ', 0xf072: '\\rho ', 0xf073: '\\sigma ', 0xf074: '\\tau ',
  0xf075: '\\upsilon ', 0xf076: '\\varpi ', 0xf077: '\\omega ', 0xf078: '\\xi ',
  0xf079: '\\psi ', 0xf07a: '\\zeta ',

  // Greek uppercase
  0xf044: '\\Delta ', 0xf046: '\\Phi ', 0xf047: '\\Gamma ', 0xf04c: '\\Lambda ',
  0xf050: '\\Pi ', 0xf051: '\\Theta ', 0xf053: '\\Sigma ', 0xf055: '\\Upsilon ',
  0xf057: '\\Omega ', 0xf058: '\\Xi ', 0xf059: '\\Psi ',

  // Math operators & relations
  0xf0a5: '\\infty ', 0xf0b0: '^\\circ ', 0xf0b1: '\\pm ',
  0xf0b3: '\\ge ', 0xf0a3: '\\le ', 0xf0d7: ' \\times ', 0xf0b4: ' \\times ',
  0xf0b8: ' \\div ', 0xf0b9: ' \\ne ', 0xf0bb: ' \\approx ', 0xf0ba: ' \\equiv ',
  0xf0b5: ' \\propto ', 0xf0b6: ' \\partial ', 0xf0ac: ' \\leftarrow ',
  0xf0ae: ' \\rightarrow ', 0xf0ab: ' \\leftrightarrow ',

  // Tall brackets, parentheses, curly braces, and vertical bars (common in MathType / Equation Editor)
  0xf0e6: '(', 0xf0e7: '(', 0xf0e8: '(',
  0xf0f6: ')', 0xf0f7: ')', 0xf0f8: ')',
  0xf0e9: '[', 0xf0ea: '[', 0xf0eb: '[',
  0xf0f9: ']', 0xf0fa: ']', 0xf0fb: ']',
  0xf0ec: '{', 0xf0ed: '{', 0xf0ee: '{',
  0xf0fc: '}', 0xf0fd: '}', 0xf0fe: '}',
  0xf0ef: '|'
};

export const replaceAdobeSymbolFont = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\uF020-\uF0FF]/gu, (ch) => {
    const code = ch.charCodeAt(0);
    return ADOBE_SYMBOL_MAP[code] ?? ch;
  });
};

export const sanitizeCorruptedLatex = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  let out = replaceAdobeSymbolFont(str);
  return out
    // Repair ASCII control character corruption from single-backslash in JSON
    .replace(/\text\{/g, '\\text{')
    .replace(/\theta/g, '\\theta')
    .replace(/\times/g, '\\times')
    .replace(/\tau/g, '\\tau')
    .replace(/\frac\{/g, '\\frac{')
    .replace(/\dfrac\{/g, '\\dfrac{')
    .replace(/\beta/g, '\\beta')
    .replace(/\bar\{/g, '\\bar{')
    .replace(/\rho/g, '\\rho')
    .replace(/\right/g, '\\right')
    // Repair stripped "ext{...}" or "ext ChemicalSpecies"
    .replace(/(?<![a-zA-Z\\])ext\{([^{}]+)\}/g, '\\text{$1}')
    .replace(/(?<![a-zA-Z\\])ext\s+([A-Z][a-z0-9_]*)/g, '\\text{$1}')
    // Normalize unsupported physics & chemistry macros for KaTeX
    .replace(/\\degree\b/g, '^\\circ')
    .replace(/\\textdegree\b/g, '^\\circ')
    .replace(/\\angstrom\b/g, '\\text{\\AA}')
    .replace(/\\celsius\b/g, '^\\circ\\text{C}')
    .replace(/\\ce\{([^{}]+)\}/g, (_m, inner) => {
      const formatted = inner.replace(/([A-Z][a-z]?)(_?\d+)?/g, (_x: string, elem: string, num: string) => {
        const cleanNum = num ? num.replace(/^_/, '') : '';
        return cleanNum ? `\\text{${elem}}_${cleanNum}` : `\\text{${elem}}`;
      });
      return formatted;
    });
};

export const normalizeChemistryAndOrbitals = (str: string): string => {
  if (!str) return '';
  let out = sanitizeCorruptedLatex(unpackProseFromMath(str));

  // 0. Repair broken arrows from \r corruption and strip stray carriage returns
  out = out
    .replace(/\r/g, '')
    .replace(/\\longr\\rightarrow/g, '\\longrightarrow')
    .replace(/(?<![a-zA-Z\\])ightarrow\b/g, '\\rightarrow')
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    .replace(/\\r(?![a-zA-Z])/g, '');

  // Unit vector glyphs & cap notation normalization
  out = out
    .replace(/î/g, '\\hat{i}')
    .replace(/ĵ/g, '\\hat{j}')
    .replace(/k̂|k\u0302/gu, '\\hat{k}')
    .replace(/\b([ijk])\s*[-–]?\s*caps?\b/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
    .replace(/(?<![A-Za-z0-9\\])[ˆ\^]\s*([ijk])\b/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
    .replace(/(?<![A-Za-z0-9\\])([ijk])\s*[ˆ\^]/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
    .replace(/(?<![A-Za-z0-9\\])\b([0-9.]+|[a-zA-Z]{1,2})?\s*([ijk])\^/gi, (_m, prefix, comp) => {
      return (prefix ? prefix : '') + `\\hat{${comp.toLowerCase()}}`;
    })
    .replace(/\b([0-9.]+|[a-zA-Z]{1,2}|\d+[a-zA-Z])\s+\\hat\{([ijk])\}/g, '$1\\hat{$2}');

  // Re-join Greek symbols or short math tokens isolated on their own line due to PDF baseline shifts
  // e.g. "The number of and \sigma and\n\pi\nbonds in dicyanogen..." -> "The number of \sigma and \pi bonds in dicyanogen..."
  out = out.replace(/(?<=[^\n])\s*\n\s*(\$?\\(?:pi|sigma|alpha|beta|delta|theta|lambda|mu|nu|phi|psi)\$?)\s*\n\s*(?=[^\n])/gi, ' $1 ');
  out = out.replace(/\b(?:and\s+)+(\$?\\(?:pi|sigma|alpha|beta)\$?)\s+and\b/gi, '$1 and');

  // Strip leaked institutional address/footer metadata
  out = out.replace(/(?:^|\n|\r|\s{2,})(?:OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9\-]+|PAGE\s*#?\s*\d*|BATCH\s*[-–])[\s\S]*$/i, '');

  // Strip leaked section headers at beginning of questions/sections
  out = out.replace(/^(?:PART\s*[-–]\s*[IVX\d]+(?:\s*[:.\-]?\s*[^\n]+)?\n*)/i, '');

  // Unpack invalid \text{...} wrappers around brackets and math commands like \text{[:\ddot{O}-\text{Cl}:]}
  out = out.replace(/\\text\{\s*(\[[^\]]*?\\[a-zA-Z]+[^\]]*?\])\s*\}/g, '$1');
  out = out.replace(/\\text\{\s*(\[[^\]]*\])\s*\}/g, '$1');

  // Unpack prose/sentence \text{...} wrappers (e.g. \text{Bond angles are not affected in } or \text{All } or \text{ are identical.})
  // Leaves single chemical symbols like \text{H}_2\text{CO}_3 and scientific units like \text{ J} untouched.
  out = out.replace(/\\text\{\s*([a-zA-Z\s,.:;!?'"()\-]{2,})\s*\}/g, (_m, inner) => {
    const trimmed = inner.trim();
    if (trimmed.split(/\s+/).length >= 2 || /\b(in|of|for|the|are|is|not|due|to|all|above|statements|incorrect|identical|affected|none|these|bond|angles|strength|which|case|maximum)\b/i.test(trimmed)) {
      return inner;
    }
    return _m;
  });

  // Repair broken OCR/AI resonance arrows
  out = out.replace(/\\longleftr\\rightarrow/g, '\\longleftrightarrow');

  // Auto-wrap raw chemical reaction/resonance chains in display math $$...$$
  // If the line contains a sentence before the reaction chain, split them so the equation gets wrapped in $$...$$
  out = out.replace(/([^\n]+?)(\s*\\text\{[^{}]+\}[^\n]*(?:\\longrightarrow|\\rightarrow|\\leftrightarrow|\\longleftrightarrow|\\rightleftharpoons)[^\n]*)(?=\n|$)/g, (match, prefix, eq) => {
    if (/\b(which|following|resonating|structure|acid|calculate|find|determine|is|are|for)\b/i.test(prefix)) {
      return `${prefix}\n\n$$${eq.trim()}$$\n\n`;
    }
    return match;
  });
  out = out.replace(/(?:^|\n)\s*(\\text\{[^{}]+\}[^\n]*(?:\\longrightarrow|\\rightarrow|\\leftrightarrow|\\longleftrightarrow|\\rightleftharpoons)[^\n]*)(?=\n|$)/g, (match, eq) => {
    if (/\b(which|following|resonating|structure|acid|calculate|find|determine|is|are)\b/i.test(eq)) {
      return match;
    }
    return `\n\n$$${eq.trim()}$$\n\n`;
  });

  // Hydrazoic acid resonance structures: H - N = N+ = N- <---> H - N+ - N \equiv N2- (or N+ = N2-) <---> H - N- - N+ \equiv N with (I), (II), (III) underneath
  if (/hydrazoic|resonating structure/i.test(out) && /N\s*=\s*N/i.test(out)) {
    out = out.replace(
      /(?:H\s*[-–]\s*(?:\r?\n\s*[•\-\*]\s*)?)?N\s*=\s*N(?:\^?\+|\+)?\s*=\s*N(?:\^?[-–]|-)?[\s\S]*?N(?:\^?\+|\+)?\s*[-–]\s*(?:N(?:\^?\+|\+)?\s*[-–]\s*)?N(?:\^?\+|\+)?\s*(=|\u2261|\\equiv)\s*(?:\\text\{N\}|N)(?:\^?2[-–]|\^?[-–]2|2[-–]|[-–]2|\^\{2[-–]\}|\^\{-2\})?[\s\S]*?N(?:\^?[-–]|-)?\s*[-–]\s*N(?:\^?\+|\+)?\s*(?:=|\u2261|\\equiv)\s*N[\s\S]*?(?:\(?\s*III\s*\)?|$)/i,
      (match) => {
        const isTripleBondInII = /\\equiv|\u2261/.test(match.split(/\(?\s*II\s*\)?/)[0] || '');
        const structII = isTripleBondInII
          ? '\\text{H}-\\text{N}^+-\\text{N}\\equiv\\text{N}^{2-}'
          : '\\text{H}-\\text{N}^+-\\text{N}^+=\\text{N}^{2-}';
        return `$$\\underset{\\text{(I)}}{\\text{H}-\\text{N}=\\text{N}^+=\\text{N}^-} \\;\\longleftrightarrow\\; \\underset{\\text{(II)}}{${structII}} \\;\\longleftrightarrow\\; \\underset{\\text{(III)}}{\\text{H}-\\text{N}^--\\text{N}^+\\equiv\\text{N}}$$`;
      }
    );
  }

  // Protect existing <svg>...</svg> blocks
  const svgTokens: string[] = [];
  out = out.replace(/(<svg[\s\S]*?<\/svg>)/gi, (match) => {
    const ph = '___SVG_TOK_' + svgTokens.length + '___';
    svgTokens.push(match);
    return ph;
  });

  // Protect inline code `...` blocks
  const codeTokens: string[] = [];
  out = out.replace(/(`[^`\n]+?`)/g, (match) => {
    const ph = '___CODE_TOK_' + codeTokens.length + '___';
    codeTokens.push(match);
    return ph;
  });

  // Auto-wrap bare LaTeX block environments like \begin{array} ... \end{array} in display math $$...$$
  // and map tabular to array for KaTeX compatibility
  out = out.replace(/(?<!\$)\s*(\\begin\{(?:array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|gathered|tabular)\*?\}[\s\S]*?\\end\{(?:array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|gathered|tabular)\*?\})\s*(?!\$)/g, (_m, env) => {
    const katexEnv = env
      .replace(/\\begin\{tabular\}/g, '\\begin{array}')
      .replace(/\\end\{tabular\}/g, '\\end{array}')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
    return `\n\n$$${katexEnv}$$\n\n`;
  });

  // Auto-wrap bare complex LaTeX ions/species expressions (e.g. {\left[ TeBr6 \right]}^{2-},\ {\left[ BrF2 \right]}^{+},\ SNF3,\ \text{and } {\left[ XeF3 \right]}^{-})
  out = out.replace(/(?<!\$)(?:^|\n)\s*(\{?\\left\[[\s\S]*?\\right\]\}?[^\n]*)(?=\n|$)/g, (_m, expr) => {
    const trimmed = expr.trim();
    if (trimmed.startsWith('$')) return expr;
    return `\n\n$$${trimmed}$$\n\n`;
  });

  // Protect existing $$...$$ and $...$
  const mathTokens: string[] = [];
  out = out.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    // Normalize colliding ion charges inside math tokens to prevent KaTeX vertical stacking collision:
    // e.g. \text{PO}_4^{3-} -> {\text{PO}_4}^{3-}, O_2^+ -> {O_2}^+, O_2^{2-} -> {O_2}^{2-}
    const cleanedTok = match
      .replace(/(?<!\{)(\\text\{[^{}]+\}(?:_\d+|_\{[^}]+\})?|[A-Z][a-z]?(?:_\d+|_\{[^}]+\})?)(?:_(\d+)|_\{([^}]+)\})\^([+0-9\-]+|\{[^}]+\})/g, (_m, base, sub1, sub2, sup) => {
        const sub = sub1 || sub2;
        const cleanSup = sup.replace(/^\{|\}$/g, '');
        return `{${base}_{${sub}}}^{${cleanSup}}`;
      });
    const ph = '___CHEM_TOK_' + mathTokens.length + '___';
    mathTokens.push(cleanedTok);
    return ph;
  });

  const protectMath = (expr: string): string => {
    const ph = '___CHEM_TOK_' + mathTokens.length + '___';
    mathTokens.push(expr.startsWith('$') ? expr : '$' + expr + '$');
    return ph;
  };

  // Clean escaped % outside math: \% -> %
  out = out.replace(/\\%/g, '%');

  // Fix OCR typo "one pairs" -> "lone pairs"
  out = out.replace(/\b(?:two|2)\s+one\s+pairs\b/gi, 'two lone pairs');
  out = out.replace(/\bone\s+pairs\b/gi, 'lone pairs');

  // Normalize bare chemical arrows
  out = out.replace(/\s*(?:->|→)\s*/g, ' $\\rightarrow$ ');

  // 1. In text, convert \quad / \qquad spacing into clean separator or newlines
  out = out.replace(/\\q?quad\s*(?=\([ivxlcdm\d]+\))/gi, '\n');
  out = out.replace(/\\q?quad\s*/gi, '   ');


  // Unpack bare \text{...} wrappers outside math delimiters (e.g. \text{(1) Trigonal bipyramidal and two lone pair of electrons})
  out = out.replace(/(?<!\$)\\text\{\s*([a-zA-Z0-9\s,.:;!?'"()\-]{2,})\s*\}(?!\$)/g, (_m, inner) => {
    const trimmed = inner.trim();
    if (trimmed.split(/\s+/).length >= 2 || /^\(?\d+\)/.test(trimmed) || /\b(in|of|for|the|are|is|not|due|to|all|above|statements|incorrect|identical|affected|none|these|bond|angles|strength|which|case|maximum|lone|pair|electrons|trigonal|tetrahedral|octahedral|bipyramidal)\b/i.test(trimmed)) {
      return inner;
    }
    return _m;
  });

  // Auto-subscript common chemical species: XeF2 -> XeF_2, XeF4 -> XeF_4, XeO3 -> XeO_3, XeO3F2 -> XeO_3F_2, TeBr6 -> TeBr_6, BrF2 -> BrF_2, SNF3 -> SNF_3, XeF3 -> XeF_3
  out = out.replace(/(?<![a-zA-Z\$])(XeF[246]|XeO[34]|XeO3F2|TeBr6|BrF[235]|SNF3|XeF3|BeCl2|SF[46]|IF[57])(?![a-zA-Z\$])/g, (_m, form) => {
    const sub = form.replace(/([0-9]+)/g, '_$1');
    return `$\\text{${sub}}$`;
  });

  // Angle comparison and degree expressions (e.g. < 109°28', < 120°, > 120°, 112°, 120^\circ)
  out = out.replace(/([<>]=?)\s*(\d+)(?:\^\\circ|\s*[º°])(?:\s*(\d+)')?/g, (_m, op, deg, min) => {
    return min ? `$${op} ${deg}^\\circ ${min}'$` : `$${op} ${deg}^\\circ$`;
  });
  out = out.replace(/(?<![\$0-9a-zA-Z])(\d+)(?:\^\\circ|[º°])(?!\$)/g, (_m, n) => `$${n}^\\circ$`);

  // Bare angle hat notation outside math: \widehat{HCH} or \widehat{\text{HCH}} or \widehat{CNC}
  out = out.replace(/\\widehat\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, (match) => '$' + match + '$');

  // Bare bond length / distance variables outside math: d_{\text{C-O}}, d_{\text{Sb-Cl}}, d_{C-O}
  out = out.replace(/\b([drR])_\{[^{}]+\}/g, (match) => '$' + match + '$');

  // Bare theta and angle comparisons outside math: \theta_1 > \theta_3, \theta_1, \theta_2, \theta_3, \theta
  out = out.replace(/\\theta(?:_[0-9a-zA-Z]+|\_\{[^{}]*\})?\s*(?:[<>]=?|=)\s*\\theta(?:_[0-9a-zA-Z]+|\_\{[^{}]*\})?/g, (match) => '$' + match + '$');
  out = out.replace(/\\theta(?:_[0-9a-zA-Z]+|\_\{[^{}]*\})/g, (match) => '$' + match + '$');

  // Bare variable angle comparisons outside math: x > y, y > x, x = y
  out = out.replace(/\b([xy])\s*([<>=])\s*([xy])\b/g, '$$$1 $2 $3$');

  // Bare chemical formulas with subscripts outside math: \text{H}_2\text{CO}_3, \text{BF}_3, \text{PF}_3, \text{B(OMe)}_3, \text{SbCl}_5, \text{SO}_2\text{Cl}_2, \text{CH}_3\text{NCS}, \text{H}_2\text{CO}, \text{F}_2\text{CO}
  out = out.replace(/(?<!\$)\\text\{[A-Za-z0-9\(\)]+\}(?:_[0-9a-zA-Z{}\+\-]+|\^[0-9a-zA-Z{}\+\-]+|\\text\{[A-Za-z0-9\(\)]+\}|(?:\([^)]*\)))*(?!\$)/g, (match) => '$' + match + '$');

  // Molecular orbital notation with optional asterisk (e.g. \sigma * 2p_z, \sigma 2p_z, \pi * 2p_x)
  out = out.replace(/\\(sigma|pi)\s*\*?\s*([1-4]?[spdf](?:_[xyz])?)(?=\s+orbital\b|\b)/gi, (_m, greek, orb) => {
    const star = _m.includes('*') ? '^*' : '';
    return protectMath(`\\${greek.toLowerCase()}${star} ${orb}`);
  });
  out = out.replace(/\\(sigma|pi)\s*\*/gi, (_m, greek) => protectMath(`\\${greek.toLowerCase()}^*`));

  // Hybridization: sp 3 -> $sp^3$, sp 2 -> $sp^2$, sp 1 -> $sp$
  out = out.replace(/\bsp\s*([123])\b/gi, (_m, n) => protectMath(`sp^${n}`));
  out = out.replace(/\bsp\s*3\s*d\s*([12])?\b/gi, (_m, d) => protectMath(d ? `sp^3d^${d}` : 'sp^3d'));

  // Hybridization comparisons: sp^3 > sp^2 > sp or sp3 > sp2 > sp
  out = out.replace(/\b(sp\^?[123]?)\s*([><=]|\\ge|\\le)\s*(sp\^?[123]?)(?:\s*([><=]|\\ge|\\le)\s*(sp\^?[123]?))?\b/gi, (_m, o1, op1, o2, op2, o3) => {
    const norm = (s: string) => s.includes('^') ? s : s.replace(/(\d)$/, '^$1');
    return op2 && o3
      ? protectMath(`${norm(o1)} ${op1} ${norm(o2)} ${op2} ${norm(o3)}`)
      : protectMath(`${norm(o1)} ${op1} ${norm(o2)}`);
  });

  // 2. Orbital combinations (e.g. py - py, p_y - p_y, p_\pi - p_\pi, p_\pi - d_\pi, px - px, dxy - dxy, dxy + pz, dyz + dyz)
  out = out.replace(/\b([pd])_?(?:\\pi|pi)\s*[-–\+]\s*([pd])_?(?:\\pi|pi)\b/gi, (_m, o1, o2) => {
    return `$${o1.toLowerCase()}_\\pi - ${o2.toLowerCase()}_\\pi$`;
  });
  out = out.replace(/\b([pd])_?(?:\\pi|pi)\s*[-–\+]\s*([pd])_?(?:d_?\\pi|d\\pi)\b/gi, (_m, o1, o2) => {
    return `$${o1.toLowerCase()}_\\pi - ${o2.toLowerCase()}_\\pi$`;
  });
  out = out.replace(/\b([1-4]?[spdf])(?:_\{[^{}]+\}|_[a-zA-Z0-9]+)?\s*[\+]\s*([1-4]?[spdf])(?:_\{[^{}]+\}|_[a-zA-Z0-9]+)?\b/gi, (match) => '$' + match + '$');
  out = out.replace(/\\(pi|sigma|delta)\s+(?=bond)/gi, '$\\$1$ ');

  // 2. Orbital combinations (e.g. py - py, p_y - p_y, px - px, p_x - p_x, dxy - dxy, d_xy - d_xy, px - dxy, dxy - pz, dx2-y2, dz2)
  const formatSub = (sub: string) => {
    const s = sub.toLowerCase();
    if (s.includes('x') && s.includes('y') && s.includes('2')) return 'x^2-y^2';
    if (s.includes('z') && s.includes('2')) return 'z^2';
    return s;
  };

  out = out.replace(/\b([pd])_?(x\^?2[-–]y\^?2|z\^?2|[xyz]{1,2})\s*[-–]\s*([pd])_?(x\^?2[-–]y\^?2|z\^?2|[xyz]{1,2})\b/gi, (_m, o1, a1, o2, a2) => {
    return `$${o1.toLowerCase()}_{${formatSub(a1)}} - ${o2.toLowerCase()}_{${formatSub(a2)}}$`;
  });
  out = out.replace(/\b([pd])_?(x\^?2[-–]y\^?2|z\^?2|[xyz]{1,2})\b(?!\w)/gi, (_m, o, a) => {
    return `$${o.toLowerCase()}_{${formatSub(a)}}$`;
  });

  // 3. Bare Greek symbols outside math: \pi, \sigma, \lambda, \nu, \theta, \alpha, \beta, \mu, \Delta (including powers e.g. \sigma^2)
  out = out.replace(/(?<![\$\\])\\(pi|sigma|alpha|beta|theta|lambda|nu|mu|omega|gamma|delta|Delta|Sigma|Omega|phi|psi)(?:\^([a-zA-Z0-9]+|\{[^{}]+\})|_([a-zA-Z0-9]+|\{[^{}]+\}))?\b(?!\$)/g, (match) => '$' + match + '$');

  // 3b. Physics vector components: 2 i ^ + b ^ j + k ^ -> 2\hat{i} + b\hat{j} + \hat{k}
  out = out.replace(/\\upsilon\b/g, 'v');
  out = out.replace(/(?<![a-zA-Z\\])([+-]?\s*\d*\s*)i\s*[\^ˆ]/g, '$1\\hat{i}');
  out = out.replace(/(?<![a-zA-Z\\])([+-]?\s*\d*\s*)j\s*[\^ˆ]/g, '$1\\hat{j}');
  out = out.replace(/(?<![a-zA-Z\\])([+-]?\s*\d*\s*)k\s*[\^ˆ]/g, '$1\\hat{k}');
  out = out.replace(/(\d+)\s*[º°]/g, (_m, n) => `$${n}^\\circ$`);

  // 3c. Physics units with powers: N/m 2, m/s 2, ms –1
  out = out.replace(/\bN\/m\s*2\b/g, '$\\text{N/m}^2$');
  out = out.replace(/\bm\/s\s*2\b/g, '$\\text{m/s}^2$');
  out = out.replace(/\bms\s*[–-]\s*1\b/g, '$\\text{ms}^{-1}$');
  out = out.replace(/\bms\s*[–-]\s*2\b/g, '$\\text{ms}^{-2}$');

  // 3d. Vector equations and expressions outside math: F = 2\hat{i} + b\hat{j} + \hat{k}, \hat{i} - 2\hat{j} - \hat{k}, 2\hat{i}, \hat{i}
  out = out.replace(
    /(?<![a-zA-Z0-9\\$])(?:([a-zA-Z]|\\[a-zA-Z]+)\s*=\s*)?([-+]?\s*(?:[0-9.]+|[a-zA-Z]{1,2}|\d+[a-zA-Z])?\\hat\{[ijk]\}(?:\s*[-+]\s*(?:[0-9.]+|[a-zA-Z]{1,2}|\d+[a-zA-Z])?\\hat\{[ijk]\})*)(?![a-zA-Z0-9\\$])/g,
    (_match, eqVar, vecBody) => {
      let cleanBody = vecBody.replace(/\s*([+-])\s*/g, ' $1 ').trim();
      if (cleanBody.startsWith('+ ')) cleanBody = cleanBody.slice(2);
      if (cleanBody.startsWith('- ')) cleanBody = '-' + cleanBody.slice(2);
      if (eqVar) {
        const varSymbol = eqVar.startsWith('\\') ? eqVar : `\\vec{${eqVar}}`;
        return `$${varSymbol} = ${cleanBody}$`;
      }
      return `$${cleanBody}$`;
    }
  );

  // 4. Bare LaTeX math constructs outside math: fractions, square roots, vectors, integrals, sums, limits, operators
  out = out.replace(/(?:\\(?:dfrac|cfrac|frac)\s*\{[^{}]*\}\s*\{[^{}]*\}|\\sqrt(?:\s*\[[^\]]*\])?\s*\{[^{}]*\}|\\(?:vec|hat|bar|dot|ddot|tilde)\s*\{[^{}]*\}|\\(?:int|iint|iiint|oint|sum|prod|lim)(?:_[a-zA-Z0-9]+|\_\{[^{}]*\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]*\})?|\\(?:pm|mp|times|div|approx|neq|leq|geq|infty|partial|nabla|equiv|longleftrightarrow|leftrightarrow|longrightarrow|rightleftharpoons)\b)/g, (match) => '$' + match + '$');

  // 5. Mathematical alphanumeric Unicode OCR symbols (e.g. 𝑑, 𝑧, 𝑥, 𝑦, 𝑝)
  out = out
    .replace(/(?<![a-zA-Z])[\u{1D451}d]\s*[\u{1D467}z]\s*2\b/gu, 'd_{z^2}')
    .replace(/(?<![a-zA-Z])[\u{1D451}d]\s*([\u{1D465}\u{1D466}\u{1D467}xyz]{1,2})\b/gu, 'd_{$1}')
    .replace(/(?<![a-zA-Z])[\u{1D45D}p]\s*([\u{1D465}\u{1D466}\u{1D467}xyz])\b/gu, 'p_$1')
    .replace(/\u{1D451}/gu, 'd')
    .replace(/\u{1D467}/gu, 'z')
    .replace(/\u{1D465}/gu, 'x')
    .replace(/\u{1D466}/gu, 'y')
    .replace(/\u{1D45D}/gu, 'p');

  // 6. Algebraic expressions in question statements: (x + y + z), R + Q - P, a^2 + b^2 + 2cd, c^3 - b^2 - a
  out = out.replace(/\(\s*([xyzabcXYZABC]\s*[\+\-]\s*[xyzabcXYZABC]\s*[\+\-]\s*[xyzabcXYZABC])\s*\)/g, '$$($1)$$');
  out = out.replace(/\b([A-Z])\s*[\+]\s*([A-Z])\s*[-–]\s*([A-Z])\b/g, '$$$1 + $2 - $3$$');
  out = out.replace(/\b([a-z])\s*([234])\s*[-–]\s*([a-z])\s*([234])\s*[-–]\s*([a-z])\b/g, '$$$1^{$2} - $3^{$4} - $5$$');
  out = out.replace(/\b([a-z])\s*([234])\s*[\+]\s*([a-z])\s*([234])\s*[\+]\s*(\d+[a-z]+)\b/g, '$$$1^{$2} + $3^{$4} + $5$$');

  // 7. Common chemical ions with charges & formulas (using thin-space charge separation to prevent KaTeX vertical charge stacking collision)
  const ionMap: [RegExp, string][] = [
    [/\bPO4\s*\^?\s*[-–]?3\b|\bPO4\s*\^?\s*3[-–]\b/gi, '${\\text{PO}_4}^{3-}$'],
    [/\bP2O6\s*\^?\s*[-–]?4\b|\bP2O6\s*\^?\s*4[-–]\b/gi, '${\\text{P}_2\\text{O}_6}^{4-}$'],
    [/\bMnO4\s*\^?\s*[-–]?1?\b/gi, '${\\text{MnO}_4}^-$'],
    [/\bCrO4\s*\^?\s*[-–]?2\b|\bCrO4\s*\^?\s*2[-–]\b/gi, '${\\text{CrO}_4}^{2-}$'],
    [/\bS2O5\s*\^?\s*[-–]?2\b|\bS2O5\s*\^?\s*2[-–]\b/gi, '${\\text{S}_2\\text{O}_5}^{2-}$'],
    [/\bS2O7\s*\^?\s*[-–]?2\b|\bS2O7\s*\^?\s*2[-–]\b/gi, '${\\text{S}_2\\text{O}_7}^{2-}$'],
    [/\bS3O9\b/g, '$\\text{S}_3\\text{O}_9$'],
    [/\bP4O10\b/g, '$\\text{P}_4\\text{O}_{10}$'],
    [/\bXeO3F2\b/g, '$\\text{XeO}_3\\text{F}_2$'],
    [/\bNa2CO3\b/g, '$\\text{Na}_2\\text{CO}_3$'],
    [/\bNa2SO3\b/g, '$\\text{Na}_2\\text{SO}_3$'],
    [/\bH2SO3\b/g, '$\\text{H}_2\\text{SO}_3$'],
    [/\bB\(OH\)3\b/g, '$\\text{B(OH)}_3$'],
    [/\bHBO2\b/g, '$\\text{HBO}_2$'],
    [/\bH3BO3\b/g, '$\\text{H}_3\\text{BO}_3$'],
    [/\bHPO2\b/g, '$\\text{HPO}_2$'],
    [/\bH3PO4\b/g, '$\\text{H}_3\\text{PO}_4$'],
    [/\bD2O\b/g, '$\\text{D}_2\\text{O}$'],
    [/\bSO\s*4\s*(?:\^?\s*[-–]?2|2[-–])\b/gi, '$\\text{SO}_4^{\\,2-}$'],
    [/\bCO\s*3\s*(?:\^?\s*[-–]?2|2[-–])\b/gi, '$\\text{CO}_3^{\\,2-}$'],
    [/\bNO3\s*\^?\s*[-–]\b|\bNO3\s*\^?\s*-\b/gi, '${\\text{NO}_3}^-$'],
    [/\bNO2\s*\^?\s*[-–]\b|\bNO2\s*\^?\s*-\b/gi, '${\\text{NO}_2}^-$'],
    [/\bClO4\s*\^?\s*[-–]\b|\bClO4\s*\^?\s*-\b/gi, '${\\text{ClO}_4}^-$'],
    [/\bClO3\s*\^?\s*[-–]\b|\bClO3\s*\^?\s*-\b/gi, '${\\text{ClO}_3}^-$'],
    [/\bClO2\s*\^?\s*[-–]\b|\bClO2\s*\^?\s*-\b/gi, '${\\text{ClO}_2}^-$'],
    [/\bClO\s*\^?\s*[-–]\b|\bClO\s*\^?\s*-\b/gi, '${\\text{ClO}}^-$'],
    [/\bIF7\b/g, '$\\text{IF}_7$'],
    [/\bOF2\b/g, '$\\text{OF}_2$'],
    [/\bSO3\b/g, '$\\text{SO}_3$'],
    [/\bCaC2\b/g, '$\\text{CaC}_2$'],
    [/\(CN\)2\b/g, '$(\\text{CN})_2$'],
    [/\bSnCl4\b/g, '$\\text{SnCl}_4$'],
    [/\bXeF6\b/g, '$\\text{XeF}_6$'],
    [/\bXeF4\b/g, '$\\text{XeF}_4$'],
    [/\bXeF2\b/g, '$\\text{XeF}_2$'],
    [/\bXeO3\b/g, '$\\text{XeO}_3$'],
    [/\bXeF5\s*\^?\s*[-–]?1?\b/g, '${\\text{XeF}_5}^-$'],
    [/\bClF3\b/g, '$\\text{ClF}_3$'],
    [/\bI3\s*\^?\s*[-–]?1?\b/g, '${\\text{I}_3}^-$'],
    [/\bI3\s*\^?\s*\+\b/g, '${\\text{I}_3}^+$'],
    [/\bICl4\s*\^?\s*[-–]?1?\b/g, '${\\text{ICl}_4}^-$'],
    [/\bICl2\s*\^?\s*\+\b/g, '${\\text{ICl}_2}^+$'],
    [/\bNH2\s*\^?\s*[-–]?1?\b/g, '${\\text{NH}_2}^-$'],
    [/\bN3\s*\^?\s*[-–]?1?\b/g, '${\\text{N}_3}^-$'],
    [/\bBeCl2\s*\(g\)\b/gi, '$\\text{BeCl}_2\\text{(g)}$'],
    [/\bBeCl2\b/g, '$\\text{BeCl}_2$'],
    [/\bBeH2\b/g, '$\\text{BeH}_2$'],
    [/\bKrF2\b/g, '$\\text{KrF}_2$'],
    [/\bC2H6\b/g, '$\\text{C}_2\\text{H}_6$'],
    [/\bSiH4\b/g, '$\\text{SiH}_4$'],
    [/\bPH3\b/g, '$\\text{PH}_3$'],
    [/\bBF3\b/g, '$\\text{BF}_3$'],
    [/\bN2O\b/g, '$\\text{N}_2\\text{O}$'],
    [/\bH2SO4\b/g, '$\\text{H}_2\\text{SO}_4$'],
    [/\bH2S\b/g, '$\\text{H}_2\\text{S}$'],
    [/\bNF3\b/g, '$\\text{NF}_3$'],
    [/\bPCl5\b/g, '$\\text{PCl}_5$'],
    [/\bCCl4\b/g, '$\\text{CCl}_4$'],
    [/\bN2H4\b/g, '$\\text{N}_2\\text{H}_4$'],
    [/\bCl\s*2\s*O\s*7\b/gi, '$\\text{Cl}_2\\text{O}_7$'],
    [/\b(?:O\s*2|O_2|\\text\{O\}_2|\bO2)\s*(?:(?:\^?\s*[-–•]|\^)\s*ion|[-–•]?\s*ion|•\s*(?:ion)?)\b/gi, '$\\text{O}_2^-\\text{ ion}$'],
    [/\bO\s*2\b/g, '$\\text{O}_2$'],
    [/\bCH\s*2\s*F\s*2\b|\bCH2F2\b/gi, '$\\text{CH}_2\\text{F}_2$'],
    [/\bCF\s*4\b|\bCF4\b/gi, '$\\text{CF}_4$'],
    [/\bCH\s*3\s*F\b|\bCH3F\b/gi, '$\\text{CH}_3\\text{F}$'],
    [/\bCF\s*3\s*H\b|\bCF3H\b/gi, '$\\text{CF}_3\\text{H}$'],
    [/\bClOCl\b/gi, '$\\text{Cl}-\\text{O}-\\text{Cl}$'],
    [/\bHOH\b(?!\w)/g, '$\\text{H}-\\text{O}-\\text{H}$'],
    [/\bO\s*[-–]\s*N\s*[-–]\s*O\b/gi, '$\\text{O}-\\text{N}-\\text{O}$'],
    [/\bC\s*[-–]\s*F\b/gi, '$\\text{C}-\\text{F}$'],
    [/\bS\s*[-–]\s*O\b/gi, '$\\text{S}-\\text{O}$'],
    [/\bNO\s*2\s*\+\b/gi, '${\\text{NO}_2}^+$'],
    [/\bNO\s*2\b/g, '$\\text{NO}_2$'],
    [/\bNH4\s*\+?\b/g, '${\\text{NH}_4}^+$'],
    [/\bNH_?4\s*\^?\s*\+/gi, '${\\text{NH}_4}^+$'],
    [/\bH3O\s*\+?\b/g, '${\\text{H}_3\\text{O}}^+$']
  ];

  for (const [regex, rep] of ionMap) {
    out = out.replace(regex, rep);
  }


  // Restore protected math
  mathTokens.forEach((tok, idx) => {
    out = out.replace('___CHEM_TOK_' + idx + '___', () => tok);
  });

  // Restore protected SVG blocks
  svgTokens.forEach((tok, idx) => {
    out = out.replace('___SVG_TOK_' + idx + '___', () => tok);
  });

  // Restore protected inline code blocks
  codeTokens.forEach((tok, idx) => {
    out = out.replace('___CODE_TOK_' + idx + '___', () => tok);
  });

  return out;
};

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
      if (/^\s*(?:\([a-dA-D1-4]\)|\[[a-dA-D1-4]\]|[a-dA-D1-4][\.\)]|\b[1-4]\.\s+)?\s*\$/.test(trimmed)) {
        return line + '$';
      }
      // Case B: Line has trailing $ on a math command like `\text{CCl}_4$` but missing opening $
      if (/\\[a-zA-Z]+[^{}$]*\{[^{}$]*\}\s*(?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?\$/.test(trimmed)) {
        return line.replace(/(\\[a-zA-Z]+[^\$]*\$)/, '$$$1');
      }
      // Case C: Formula ending with math-like symbols before text, e.g. `(A) $\text{...} text`
      return line + '$';
    }
    return line;
  }).join('\n');
};

export const normalizeMathDelimiters = (str: string): string => {
  if (!str) return '';
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
  clean = clean.replace(/(?<!\$)\b(\\text\{[A-Za-z0-9]+\}\^[\+\-0-9a-zA-Z]+(?:\s*\[[^\]]+\]\^[\+\-0-9a-zA-Z]+)?)(?!\$)/g, (match) => {
    return `$${match}$`;
  });

  return normalizeChemistryAndOrbitals(clean);
};

export function unflattenLinearExplanation(content: string): string {
  if (!content || typeof content !== 'string') return '';

  const trimmed = content.trim();
  // If it already contains multiple line breaks, it's already structured
  if ((trimmed.match(/\n/g) || []).length >= 2) {
    return trimmed;
  }

  // Guard: Only unflatten strings that resemble squashed mathematical/physical derivations
  const hasMultipleSentences = /[.!?]\s+[A-Z]/.test(trimmed);
  const hasDerivation = /(?:=>|->|=|eV|\bJ\b|\\frac|\b[A-Za-z]+_?\d*\s*=)/.test(trimmed);
  if (!hasMultipleSentences || !hasDerivation) {
    return trimmed;
  }

  // 1. Normalize ASCII math operators, arrows, fractions, and units
  let text = trimmed
    .replace(/\s*=>\s*/g, ' \\implies ')
    .replace(/\s*->\s*/g, ' \\rightarrow ')
    .replace(/\((\d+)\/(\d+)\s*-\s*(\d+)\/(\d+)\)/g, (_m, a, b, c, d) => `\\left(\\frac{${a}}{${b}} - \\frac{${c}}{${d}}\\right)`)
    .replace(/\((\d+)\/(\d+)\)/g, (_m, a, b) => `\\left(\\frac{${a}}{${b}}\\right)`)
    .replace(/\b(\d+)\/(\d+)\b(?!\s*\])/g, (_m, a, b) => `\\frac{${a}}{${b}}`)
    .replace(/\b([0-9.]+)\s*eV\b/g, (_m, val) => `${val}\\text{ eV}`)
    .replace(/\b([0-9.]+)\s*J\b/g, (_m, val) => `${val}\\text{ J}`);

  // 2. Split on sentence boundaries followed by capitalized words, $, or \
  const rawSentences = text.split(/(?<=[.!?])\s+(?=[A-Z]|\$|\\)/).map(s => s.trim()).filter(Boolean);
  if (rawSentences.length <= 1) {
    return trimmed;
  }

  let stepIndex = 1;
  const blocks: string[] = [];

  for (let i = 0; i < rawSentences.length; i++) {
    const raw = rawSentences[i].replace(/[.]$/, '').trim();
    if (!raw) continue;

    // A. Conclusion / Final Answer phrases
    if (/^(?:Hence|Therefore|Thus|So|Finally|Conclusion)\b/i.test(raw)) {
      blocks.push(`**Conclusion & Correct Option**\n${raw}.`);
      continue;
    }

    // B. Key Concept / Formula phrases
    if (/^(?:Key Concept|Concept|Formula|We know that|According to|Using the formula|From)\b/i.test(raw)) {
      blocks.push(`**Key Concept & Formula**\n${raw}.`);
      continue;
    }

    // C. Descriptive label ending with colon before math (e.g. "For isothermal expansion of 1 mole of ideal gas: $\Delta S_1 = ...$")
    const colonMatch = raw.match(/^([^:=]{3,}?)\s*:\s*(.+)$/);
    if (colonMatch) {
      const lead = colonMatch[1].trim();
      const mathPart = colonMatch[2].trim();
      const cleanMath = mathPart.replace(/^\$+|\$+$/g, '').trim();
      const hasProse = /\b(?:is|of|for|the|in|from|to|with|and|at|a|an|gas|mole|state|function)\b/i.test(cleanMath);
      if (!hasProse && cleanMath.includes('=')) {
        blocks.push(`**Step ${stepIndex++}: ${lead}**\n\n$$${cleanMath}$$`);
        continue;
      } else {
        const balanced = repairUnbalancedMathDelimiters(mathPart);
        blocks.push(`**Step ${stepIndex++}: ${lead}**\n${balanced}.`);
        continue;
      }
    }

    // D. Descriptive text ending with state/orbit/level = formula
    const stateMatch = raw.match(/^(.*?\b(?:state|orbit|level))\s*=\s*(.+)$/i);
    if (stateMatch) {
      const lead = stateMatch[1].trim();
      const math = stateMatch[2].trim();
      blocks.push(`**Step ${stepIndex++}: ${lead}**\n\n$$${math}$$`);
      continue;
    }

    // E. Descriptive label before math equation (e.g. "Total entropy change $\Delta S_{\text{total}} = ...", "Energy gap E_3 - E_2 = ...")
    const varMatch = raw.match(/^([A-Za-z\s]{3,}?)\s+(?=\$?\\Delta|\$?[A-Za-z0-9]_[0-9]|\$?[A-Z]\s*=|\\|[0-9]+\s*=)(.+)$/);
    if (varMatch) {
      const lead = varMatch[1].trim();
      const math = varMatch[2].trim();
      const cleanMath = math.replace(/^\$+|\$+$/g, '').trim();
      const hasProse = /\b(?:is|of|for|the|in|from|to|with|and|at|a|an|gas|mole|state|function)\b/i.test(cleanMath);

      if (!hasProse && cleanMath.includes('=')) {
        // If math ends with \implies Z = 3, separate into final step / conclusion
        const impliesMatch = cleanMath.match(/^(.*?)\s*\\implies\s*([A-Za-z0-9_]+\s*=\s*.*)$/);
        if (impliesMatch) {
          const eqPart = impliesMatch[1].trim();
          const resPart = impliesMatch[2].trim();
          blocks.push(`**Step ${stepIndex++}: ${lead}**\n\n$$${eqPart}$$`);
          blocks.push(`**Conclusion & Correct Option**\n\n$$${resPart}$$\nHence, the correct value is $${resPart}$.`);
          continue;
        }

        blocks.push(`**Step ${stepIndex++}: ${lead}**\n\n$$${cleanMath}$$`);
        continue;
      } else {
        const balanced = repairUnbalancedMathDelimiters(math);
        blocks.push(`**Step ${stepIndex++}: ${lead}**\n${balanced}.`);
        continue;
      }
    }

    // F. Generic equation line
    if (raw.includes('=')) {
      const cleanMath = raw.replace(/^\$+|\$+$/g, '').trim();
      const hasProse = /\b(?:is|of|for|the|in|from|to|with|and|at|a|an|gas|mole|state|function|heating|expansion|process|temperature|pressure|volume|change|total)\b/i.test(cleanMath);

      // Only wrap in $$...$$ if it's pure mathematical formula without prose words or inner unescaped $
      if (!hasProse && !raw.includes('$')) {
        const impliesMatch = cleanMath.match(/^(.*?)\s*\\implies\s*([A-Za-z0-9_]+\s*=\s*.*)$/);
        if (impliesMatch) {
          const eqPart = impliesMatch[1].trim();
          const resPart = impliesMatch[2].trim();
          blocks.push(`**Step ${stepIndex++}**\n\n$$${eqPart}$$`);
          blocks.push(`**Conclusion & Correct Option**\n\n$$${resPart}$$\nHence, the correct value is $${resPart}$.`);
          continue;
        }

        blocks.push(`**Step ${stepIndex++}**\n\n$$${cleanMath}$$`);
        continue;
      }

      // If it contains prose words, format as narrative step with balanced math
      const balanced = repairUnbalancedMathDelimiters(raw);
      blocks.push(`**Step ${stepIndex++}**\n${balanced}.`);
      continue;
    }

    // G. Narrative text step
    const balanced = repairUnbalancedMathDelimiters(raw);
    blocks.push(`**Step ${stepIndex++}**\n${balanced}.`);
  }

  return blocks.join('\n\n');
}

export interface ExplanationSection {
  type: 'concept' | 'step' | 'conclusion' | 'general';
  stepNum?: string;
  title?: string;
  content: string;
}

export function parseExplanationSections(rawText: string): ExplanationSection[] {
  if (!rawText || typeof rawText !== 'string') return [];

  // 1. Unescape literal \n and \r characters safely (without destroying \rightarrow, \rho, etc.)
  let text = rawText
    .replace(/\r/g, '')
    .replace(/\\longr\\rightarrow/g, '\\longrightarrow')
    .replace(/(?<![a-zA-Z\\])ightarrow\b/g, '\\rightarrow')
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    .replace(/\\r(?![a-zA-Z])/g, '');
  text = normalizeMathDelimiters(text.trim());

  // 2. Strip leading question prefixes and stray bullets
  text = text
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\]\)]*\s*/i, '')
    .replace(/^\]\s*/, '')
    .replace(/^[•\-\*]\s*(?=Key Concept)/i, '')
    .trim();

  // 3. Check if the text contains explicit markers: Key Concept, Step \d+, or Conclusion
  const markerRegex = /(?:^|\n|\r|\s{2,}|\.\s+)(?:(?:\*\*|###\s*)?(Key Concept(?: & Formula)?|Concept & Formula|Governing Formula)(?:\*\*)?\s*[:.\-]?|(?:\*\*\s*Step\s*(\d+)\s*[:.\-]\s*([^*]+?)\s*\*\*|###\s*Step\s*(\d+)\s*[:.\-]\s*([^\n]+)|(?:\*\*|###\s*)?Step\s*(\d+)(?:\*\*)?\s*[:.\-]?)|(?:\*\*|###\s*)?(Conclusion & Correct Option|Conclusion|Final Answer|Result)(?:\*\*)?\s*[:.\-]?)/gi;

  const matches = [...text.matchAll(markerRegex)];

  if (matches.length > 0) {
    const sections: ExplanationSection[] = [];

    // Content before the first marker, if any (e.g. concept text before Step 1)
    const firstMatch = matches[0];
    if (firstMatch.index > 0) {
      const lead = text.substring(0, firstMatch.index).trim();
      if (lead) {
        sections.push({ type: 'concept', title: 'Key Concept & Formula', content: lead });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const blockContent = text.substring(cur.index + cur[0].length, nextIndex).trim();

      const conceptName = cur[1];
      const stepNum = cur[2] || cur[4] || cur[6];
      const stepTitle = cur[3] || cur[5];
      const conclusionName = cur[7];

      if (conceptName) {
        sections.push({
          type: 'concept',
          title: 'Key Concept & Formula',
          content: blockContent
        });
      } else if (stepNum) {
        sections.push({
          type: 'step',
          stepNum,
          title: stepTitle ? stepTitle.trim() : `Step ${stepNum}`,
          content: blockContent
        });
      } else if (conclusionName) {
        sections.push({
          type: 'conclusion',
          title: 'Conclusion & Correct Option',
          content: blockContent
        });
      } else {
        sections.push({
          type: 'general',
          content: blockContent
        });
      }
    }

    return sections.filter(s => s.content.length > 0);
  }

  // 4. Fallback for completely unstructured/linear explanations without markers:
  const unflattened = unflattenLinearExplanation(text);
  if (unflattened !== text) {
    const unflattenedMatches = [...unflattened.matchAll(markerRegex)];
    if (unflattenedMatches.length > 0) {
      return parseExplanationSections(unflattened);
    }
  }

  return [{ type: 'general', content: text }];
}

function renderInlineContent(rawLine: string): React.ReactNode {
  // Strip stray heading hashes like "### The Core Formula" when passed into inline renderers
  const line = (rawLine || '').replace(/(?:^|\s)#{1,6}\s+/g, ' ').trim();
  if (line.includes('$')) {
    const parts = line.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        if (math.includes('\\begin{array}') || math.includes('\\begin{tabular}') || math.includes('\\begin{matrix}')) {
          const tableComp = renderMatchTable(math);
          if (tableComp) return <div key={i}>{tableComp}</div>;
        }
        return <BlockMath key={i} math={math} />;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return <InlineMath key={i} math={part.slice(1, -1)} />;
      }
      return <span key={i}>{renderMarkdownInline(part)}</span>;
    });
  }

  // 1. Standalone mathematical expressions or formulas outside explicit $ delimiters
  const hasMathSymbols = /[=+\-*/^_{}\\]|\\frac|\\sqrt|\\times|\\approx|\\pm|\\leq|\\geq/.test(line);
  if (hasMathSymbols) {
    const matchHeader = line.match(/^(\d+\.\s*)?(\*\*.*?\*\*\:?|\*.*?\*\:?|[A-Za-z0-9\s\(\)]+\:)\s*(.*)/);

    if (matchHeader) {
      const numberPrefix = matchHeader[1] || '';
      const headerPart = matchHeader[2] || '';
      const mathBody = matchHeader[3] || '';

      const isProse = mathBody.split(/\s+/).length > 4 && !/^\s*\\[a-zA-Z]+/.test(mathBody);
      if (!isProse) {
        return (
          <span className="flex flex-wrap items-baseline gap-1.5">
            {numberPrefix && <span className="font-bold text-indigo-400">{numberPrefix}</span>}
            {headerPart && renderMarkdownInline(headerPart)}
            {mathBody && renderSafeMath(mathBody)}
          </span>
        );
      }
    } else {
      const words = line.split(/\s+/);
      const isChemicalOrResonanceLine = /\\text\{[^{}]+\}[^\n]*(?:\\longrightarrow|\\rightarrow|\\leftrightarrow|\\longleftrightarrow|\\rightleftharpoons|\\equiv)/.test(line);
      const hasProsePrefix = /\b(which|following|resonating|structure|acid|calculate|find)\b/i.test(line);

      if (isChemicalOrResonanceLine && hasProsePrefix) {
        const eqMatch = line.match(/(\\text\{[^{}]+\}[^\n]*(?:\\longrightarrow|\\rightarrow|\\leftrightarrow|\\longleftrightarrow|\\rightleftharpoons|\\equiv)[^\n]*)/);
        if (eqMatch && eqMatch.index !== undefined) {
          const prosePart = line.substring(0, eqMatch.index).trim();
          const eqPart = eqMatch[1].trim();
          return (
            <div className="space-y-3">
              {prosePart && renderMarkdownInline(prosePart)}
              {renderSafeMath(eqPart)}
            </div>
          );
        }
      }

      const isLatexFormulaLine = /\\left\[|\\right\]|\^\{[0-9\+\-]+|\_\{[0-9\+\-]+/.test(line);
      const isPureMath = (isChemicalOrResonanceLine && !hasProsePrefix) || isLatexFormulaLine || words.length <= 4 || (/^[\\a-zA-Z0-9_\^\+\-\*\/\=\(\)\{\}\[\]\,\s]+$/.test(line) && !/[a-z]{4,}/i.test(line.replace(/\\[a-zA-Z]+/g, '')));
      if (isPureMath) {
        return renderSafeMath(line);
      }
    }
  }

  const unwrapText = line.replace(/\\text\{\s*([^{}]+)\s*\}/g, '$1');
  return renderMarkdownInline(unwrapText);
}

function renderMatchTable(rawText: string): React.ReactNode | null {
  const unwrap = rawText.replace(/^\$\$|\$\$$/g, '').trim();
  const envMatch = unwrap.match(/\\begin\{(?:array|matrix|tabular)\*?\}(?:\{[lcr|]+\})?([\s\S]*?)\\end\{(?:array|matrix|tabular)\*?\}/i);
  if (!envMatch) return null;

  const inner = envMatch[1].trim();
  const rawRows = inner.split(/\\\\/).map(r => r.trim()).filter(Boolean);
  if (rawRows.length < 2 || !rawRows.some(r => r.includes('&'))) return null;

  // Verify this is a match-the-column table or table with columns/text cells (not a pure numeric 2x2 matrix)
  const isMatchTable = (
    unwrap.includes('Column') ||
    unwrap.includes('column') ||
    unwrap.includes('List') ||
    unwrap.includes('list') ||
    /\([A-Da-d1-4P-Sp-s]\)/.test(unwrap) ||
    /\*\*/.test(unwrap) ||
    /\b(bond|formation|orbital|hybridization|geometry|isomer|reaction|species|oxide|state)\b/i.test(unwrap) ||
    /\b[a-zA-Z]{4,}\b/.test(inner.replace(/\\[a-zA-Z]+/g, ''))
  );
  if (!isMatchTable) return null;

  const beforeText = unwrap.substring(0, envMatch.index).trim();
  const afterText = unwrap.substring(envMatch.index! + envMatch[0].length).trim();

  const rows = rawRows.map(row => row.split('&').map(cell => {
    let cleanCell = cell.trim();
    cleanCell = cleanCell.replace(/^\\text\{\s*([\s\S]*?)\s*\}$/, '$1');
    cleanCell = cleanCell.replace(/\\text\{\s*([^{}]+)\s*\}/g, '$1');
    cleanCell = cleanCell.replace(/(?<![a-zA-Z\$])(XeF[246]|XeO[34]|XeO3F2|TeBr6|BrF[235]|SNF3|XeF3|BeCl2|SF[46]|IF[57])(?![a-zA-Z\$])/g, (_m, form) => {
      const sub = form.replace(/([0-9]+)/g, '_$1');
      return `$\\text{${sub}}$`;
    });
    return cleanCell;
  }));
  const hasHeader = rows[0].some(cell => /column|list|group|reaction|property|orbital|state/i.test(cell) || /^\*\*[^*]+\*\*$/.test(cell));
  const headerRow = hasHeader ? rows[0] : null;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return (
    <div className="space-y-3 my-2.5 w-full">
      {beforeText && <div className="text-zinc-200">{renderInlineContent(beforeText)}</div>}
      <div className="my-3 overflow-x-auto">
        <table className="border-collapse border border-zinc-700/60 rounded-xl overflow-hidden bg-zinc-900/60 text-sm w-full max-w-xl mx-auto shadow-lg">
          {headerRow && (
            <thead>
              <tr className="bg-zinc-800/80 border-b border-zinc-700/60">
                {headerRow.map((h, i) => (
                  <th key={i} className="py-3 px-5 text-left font-bold text-indigo-300 text-xs sm:text-sm tracking-wide uppercase font-display">
                    {renderInlineContent(h.replace(/^\\textbf\{([^{}]+)\}$/, '$1').replace(/^\*\*([^*]+)\*\*$/, '$1'))}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-zinc-800/60">
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-transparent hover:bg-zinc-800/30 transition-colors" : "bg-zinc-900/30 hover:bg-zinc-800/30 transition-colors"}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="py-2.5 px-5 text-zinc-200 font-medium text-xs sm:text-sm leading-relaxed">
                    {renderInlineContent(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {afterText && <div className="text-zinc-200">{renderInlineContent(afterText)}</div>}
    </div>
  );
}

const renderSingleLine = (rawLine: string, isOption = false, questionContent?: string, optIndex?: number) => {
  const line = normalizeMathDelimiters(rawLine).replace(/\\\$/g, '$');

  // Check for Match-the-Column table or tabular environment
  if (line.includes('\\begin{array}') || line.includes('\\begin{tabular}') || line.includes('\\begin{matrix}')) {
    const tableComp = renderMatchTable(line);
    if (tableComp) return tableComp;
  }

  // Guard against synthetic diagram leaks in previously saved attempts:
  if (isOption && (line.includes('so3-lewis-diagram') || line.includes('lewis-diagram'))) {
    const qStr = String(questionContent || '').toLowerCase();
    const isGenuinelySO3Structure = /preferred\s+structure/i.test(qStr) && /so_?3|sulfur\s+trioxide/i.test(qStr);
    const isGenuineLewisDiagramQ = /which\s+of\s+the\s+following\s+lewis\s+diagram\s+is/i.test(qStr) && /ccl4/i.test(qStr);
    if (!isGenuinelySO3Structure && !isGenuineLewisDiagramQ) {
      const label = optIndex !== undefined ? String.fromCharCode(65 + optIndex) : '';
      return <span className="text-zinc-300 font-medium">Option ({label || '•'})</span>;
    }
  }

  // 0. Native inline SVG diagrams (e.g. chemical Lewis structures, molecular geometry, circuits)
  if (line.includes('<svg') && line.includes('</svg>')) {
    const svgMatch = line.match(/(<svg[\s\S]*?<\/svg>)/i);
    if (svgMatch) {
      const before = line.substring(0, svgMatch.index).trim();
      const svgCode = svgMatch[1];
      const after = line.substring(svgMatch.index! + svgCode.length).trim();
      return (
        <div className="flex flex-col items-center my-2 w-full text-left">
          {before && (
            <div className="text-sm sm:text-base text-zinc-200 mb-2 w-full text-left">
              {renderInlineContent(before)}
            </div>
          )}
          <div
            className="p-3 bg-zinc-950/90 rounded-xl border border-zinc-800 flex items-center justify-center overflow-x-auto shadow-inner max-w-full my-1.5"
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />
          {after && (
            <div className="text-sm sm:text-base text-zinc-200 mt-2 w-full text-left">
              {renderInlineContent(after)}
            </div>
          )}
        </div>
      );
    }
  }

  // 1. Markdown images ![alt](url)
  const mdImgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (mdImgMatch) {
    const before = line.substring(0, mdImgMatch.index).trim();
    const altText = mdImgMatch[1];
    const imgSrc = mdImgMatch[2];
    const after = line.substring(mdImgMatch.index! + mdImgMatch[0].length).trim();
    return (
      <div className="my-2 flex flex-col items-center justify-center">
        {before && <div className="text-xs sm:text-sm text-zinc-300 mb-1">{renderSingleLine(before, isOption)}</div>}
        <img
          src={imgSrc}
          alt={altText || 'Diagram'}
          className="max-h-60 max-w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white p-2 object-contain shadow-md"
        />
        {after && <div className="text-xs sm:text-sm text-zinc-300 mt-1">{renderSingleLine(after, isOption)}</div>}
      </div>
    );
  }

  // 2. 2D KaTeX matrix chemical structures (e.g. \begin{matrix} ... \end{matrix})
  if ((line.includes('\\begin{matrix}') || line.includes('\\begin{array}')) && !line.includes('$$')) {
    return (
      <div className="my-2 flex justify-center overflow-x-auto p-2">
        <BlockMath math={line} />
      </div>
    );
  }

  // 3. Markdown Headings (#, ##, ###, ####)
  const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const content = headingMatch[2].trim();
    if (level === 1) {
      return (
        <h3 className="text-sm sm:text-base font-bold text-white font-display mt-2.5 mb-1 border-b border-zinc-800 pb-1 flex items-center gap-2">
          {renderInlineContent(content)}
        </h3>
      );
    }
    if (level === 2) {
      return (
        <h4 className="text-xs sm:text-sm font-bold text-indigo-300 font-display mt-2 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span>{renderInlineContent(content)}</span>
        </h4>
      );
    }
    if (level === 3) {
      return (
        <h5 className="text-xs sm:text-sm font-bold text-indigo-400 font-display mt-1.5 mb-0.5 tracking-wide flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
          <span>{renderInlineContent(content)}</span>
        </h5>
      );
    }
    return (
      <h6 className="text-xs font-semibold text-zinc-300 tracking-wide mt-1 mb-0.5">
        {renderInlineContent(content)}
      </h6>
    );
  }

  // 4. Blockquotes (> ...) - Never match for options or lines starting with comparison operators followed by math/numbers/LaTeX
  const isMathInequality = /^>\s*(?:\$|\\|[0-9]|\<|\=|\([A-Za-z0-9])/.test(line);
  const quoteMatch = !isOption && !isMathInequality && line.match(/^>\s+(.*)$/);
  if (quoteMatch) {
    return (
      <blockquote className="border-l-2 border-indigo-500/70 bg-indigo-950/20 px-3 py-1.5 rounded-r-lg my-1 text-zinc-300 italic text-xs sm:text-sm">
        {renderInlineContent(quoteMatch[1])}
      </blockquote>
    );
  }

  // 5. Bullet list items (- ..., * ..., • ...)
  const sanitizedLine = /^[-*•]\s*(?:ions?|orbitals?|atoms?|molecules?|electrons?)\b/i.test(line)
    ? line.replace(/^[-*•]\s*/, '')
    : line;
  const bulletMatch = sanitizedLine.match(/^[-*•]\s+(.*)$/);
  if (bulletMatch && !/^(?:ions?|orbitals?|atoms?|molecules?|electrons?|the|in|of|to|and|is|are)\b/i.test(bulletMatch[1].trim())) {
    const rawBullet = bulletMatch[1].trim();
    // Check if bullet item starts with heading hashes like "### The Core Formula"
    const headingInBullet = rawBullet.match(/^#{1,6}\s*(.*)$/);
    if (headingInBullet) {
      return (
        <div className="flex items-start gap-2 pl-1.5 text-zinc-200 mt-2 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
          <h5 className="text-xs sm:text-sm font-bold text-indigo-400 font-display flex-1 tracking-wide">
            {renderInlineContent(headingInBullet[1])}
          </h5>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2 pl-1.5 text-zinc-200">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
        <span className="flex-1">{renderInlineContent(rawBullet)}</span>
      </div>
    );
  }

  // 6. Numbered list items (1. ..., 1) ...)
  const numMatch = line.match(/^(\d+)[\.\)]\s+(.*)$/);
  if (numMatch) {
    return (
      <div className="flex items-start gap-2 pl-1.5 text-zinc-200">
        <span className="font-mono text-xs font-bold text-indigo-400 shrink-0">{numMatch[1]}.</span>
        <span className="flex-1">{renderInlineContent(numMatch[2])}</span>
      </div>
    );
  }

  // 7. Horizontal rules (---, ___, ***)
  if (/^---+$/.test(line) || /^___+$/.test(line) || /^\*\*\*+$/.test(line)) {
    return <hr className="border-zinc-800 my-2" />;
  }

  return renderInlineContent(line);
};

export interface RichTextRendererProps {
  content: string | undefined | null;
  optIndex?: number;
  questionContent?: string;
  imageUrl?: string | null;
}

/**
 * Standard RichTextRenderer used throughout the test arena, mock test questions, and options.
 * Wrapped in React.memo with custom equality to eliminate redundant KaTeX parsing on parent re-renders.
 */
export const RichTextRenderer = React.memo(({
  content,
  optIndex,
  questionContent,
  imageUrl
}: RichTextRendererProps) => {
  if (!content && !imageUrl) return null;

  // 1. Unescape literal \n when not a LaTeX command (e.g. ":\n(i)" -> real newline)
  let cleanContent = unpackProseFromMath(content || '')
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\longr\\rightarrow/g, '\\longrightarrow')
    .replace(/(?<![a-zA-Z\\])ightarrow\b/g, '\\rightarrow')
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    .replace(/\\r(?![a-zA-Z])/g, '')
    // Also convert \quad before (i), (ii), etc. to newlines
    .replace(/\\q?quad\s*(?=\([ivxlcdm\d]+\))/gi, '\n')
    .replace(/\\q?quad\s*/gi, '   ');

  // 2. Defensively strip leaked section headers like "PART - I : ONLY ONE OPTION...", "PART - II", "PART - III"
  // and question number markers like "Q27]", "[Q1]", "Question 1:", or stray leading "]"
  cleanContent = cleanContent
    .replace(/^(?:PART\s*[-–]\s*[IVX\d]+(?:\s*[:.\-]?\s*[^\n]+)?\n*)/i, '')
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\]\)]*\s*/i, '')
    .replace(/^\]\s*/, '')
    .trim();

  // Defensively heal options that lost their leading "(A)" due to historical stripping e.g. ", (C), (D)" -> "(A), (C), (D)"
  if (optIndex !== undefined && /^,\s*(?:\([A-Da-d1-4]\)|[A-Da-d1-4]\b)/i.test(cleanContent)) {
    cleanContent = `(A)${cleanContent}`;
  }

  // Format hydrazoic acid resonance structures with (I), (II), (III) cleanly centered underneath
  if (/hydrazoic|resonating structure/i.test(cleanContent) && /N\s*=\s*N/i.test(cleanContent)) {
    cleanContent = cleanContent.replace(
      /(?:H\s*[-–]\s*(?:\r?\n\s*[•\-\*]\s*)?)?N\s*=\s*N(?:\^?\+|\+)?\s*=\s*N(?:\^?[-–]|-)?[\s\S]*?N(?:\^?\+|\+)?\s*[-–]\s*(?:N(?:\^?\+|\+)?\s*[-–]\s*)?N(?:\^?\+|\+)?\s*(=|\u2261|\\equiv)\s*(?:\\text\{N\}|N)(?:\^?2[-–]|\^?[-–]2|2[-–]|[-–]2|\^\{2[-–]\}|\^\{-2\})?[\s\S]*?N(?:\^?[-–]|-)?\s*[-–]\s*N(?:\^?\+|\+)?\s*(?:=|\u2261|\\equiv)\s*N[\s\S]*?(?:\(?\s*III\s*\)?|$)/i,
      (match) => {
        const isTripleBondInII = /\\equiv|\u2261/.test(match.split(/\(?\s*II\s*\)?/)[0] || '');
        const structII = isTripleBondInII
          ? '\\text{H}-\\text{N}^+-\\text{N}\\equiv\\text{N}^{2-}'
          : '\\text{H}-\\text{N}^+-\\text{N}^+=\\text{N}^{2-}';
        return `\n\n$$\\underset{\\text{(I)}}{\\text{H}-\\text{N}=\\text{N}^+=\\text{N}^-} \\;\\longleftrightarrow\\; \\underset{\\text{(II)}}{${structII}} \\;\\longleftrightarrow\\; \\underset{\\text{(III)}}{\\text{H}-\\text{N}^--\\text{N}^+\\equiv\\text{N}}$$\n\n`;
      }
    );
  }

  // 3. For question statements (not options): structure multi-item lists & variable definitions onto distinct lines
  if (optIndex === undefined) {
    // A. Rejoin broken chemical species & radicals/ions split across lines (e.g. "O2\n• ion" -> "O2^- ion")
    cleanContent = cleanContent.replace(/([A-Za-z0-9\$\}]+)\s*\n\s*[•\-\*–]\s*(ions?|orbitals?|atoms?|molecules?|electrons?)\b/gi, (_m, p1, p2) => `${p1}^- ${p2}`);

    // B. Rejoin mid-sentence PDF line breaks in question statements (e.g. "following\norbitals?" -> "following orbitals?")
    cleanContent = cleanContent.replace(/([a-zA-Z0-9,\(\)]+)\s*\n\s*([a-z][a-zA-Z0-9]*\b(?!\s*[:.\-\]\)]))/g, (match, p1, p2) => {
      if (/^(?:and|or|in|of|to|for|with|by|from|the|a|an|is|are|which|orbitals?|atoms?|electrons?|molecules?|ions?|statements?|value|hybridization|structure|geometry|order)\b/i.test(p2) ||
          /\b(the|of|in|to|for|with|by|from|a|an|is|are|which|one|two|three|following)\b$/i.test(p1)) {
        return `${p1} ${p2}`;
      }
      return match;
    });

    cleanContent = cleanContent
      // Split before "Where" or "where" followed by variable definitions e.g. "Where x = ..." or "Where $x$ = ..."
      .replace(/(?:\b|\s+)(Where|where)\s+(?=(?:\$[a-zA-Z]\$|[a-zA-Z])\s*=)/g, '\n\n$1:\n• ')
      // Split between subsequent variable definitions e.g. "x = ... y = ... z = ..." or "$P$ = ... $Q$ = ... $R$ = ..."
      // Guard: NEVER match after a chemical bond (- or + or =) or inside chemical formulas (like N = N)
      .replace(/(?<=[a-zA-Z0-9\).,])(?<![-–+=])\s+(?=(?:\$[a-zA-Z]\$|[a-zA-Z])\s*=\s*(?:[0-9$]|total\b|number\b|the\b|no\.?\b|sigma\b|pi\b|delta\b|non\b))/gi, '\n• ')

      // Split after colon before first item e.g. "changes: i] NO ->" -> "changes:\ni] NO ->"
      .replace(/(?<=:)\s+(?=[ivxlcdm\d]+\]|\([ivxlcdm\d]+\)|S\d+\s*:|\b[A-F]\)\s+[A-Z0-9$])/gi, '\n')
      // Split between subsequent items e.g. "NO+ ii] O2-" -> "NO+\nii] O2-"
      .replace(/(?<!\n)\s+(?=(?:[ivxlcdm]+\]|\([ivxlcdm]+\)|S\d+\s*:)\s+)/gi, '\n')
      // Split before concluding question directive e.g. "CO+. Then the value of..." or "N2+ Then calculate..." -> "\n\nThen..."
      .replace(/(?:(?<=[.!?])|(?<=[a-z0-9\)\+\-]))\s+(?=(?:Then|Calculate|Find|Where|Here|Determine|The value of|Arrange|Select|Choose|Identify|Which of)\b)/g, '\n\n');
  }

  // 4. Flatten newlines inside <svg>...</svg> blocks to prevent split fragmentation
  if (cleanContent.includes('<svg')) {
    cleanContent = cleanContent.replace(/<svg[\s\S]*?<\/svg>/gi, (svgBlock) => {
      return svgBlock.replace(/\r?\n\s*/g, ' ');
    });
  }

  // 5. Separate and flatten table environments so they are kept intact on a single line
  cleanContent = cleanContent.replace(/([^\n]+?)(\s*(?:\$\$)?\\begin\{(?:array|tabular|matrix)\*?\})/g, '$1\n\n$2');
  cleanContent = cleanContent.replace(/((?:\$\$)?\\begin\{(?:array|tabular|matrix)\*?\}(?:\{[lcr|]+\})?[\s\S]*?\\end\{(?:array|tabular|matrix)\*?\}(?:\$\$)?)/gi, (tableBlock) => {
    return tableBlock.replace(/\r?\n\s*/g, ' ');
  });

  // 6. Normalize math delimiters (handling multi-line \[...\], \(...\), $$...$$) before line splitting
  cleanContent = normalizeMathDelimiters(cleanContent);

  // For options: flatten internal line breaks so option text stays cohesive on a single line (fixes Q13)
  if (optIndex !== undefined) {
    cleanContent = cleanContent.replace(/\r?\n\s*/g, ' ');
  }

  const lines = cleanContent.split('\n');

  return (
    <MathErrorBoundary fallbackText={content || ''}>
      <div className="space-y-3">
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          return (
            <div key={lineIdx} className={optIndex !== undefined ? "leading-loose py-0.5 overflow-visible" : "leading-relaxed"}>
              {renderSingleLine(trimmed, optIndex !== undefined, questionContent, optIndex)}
            </div>
          );
        })}
        {imageUrl && (
          <div className="my-6 flex flex-col items-center justify-center">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white p-3.5 shadow-md max-w-full overflow-hidden transition-all duration-200 hover:shadow-lg">
              <img
                src={imageUrl}
                alt="Question Diagram"
                className="max-h-[500px] sm:max-h-[600px] w-auto max-w-full object-contain cursor-zoom-in transition-all duration-200"
                onClick={(e) => {
                  const img = e.currentTarget;
                  if (img.classList.contains('cursor-zoom-in')) {
                    img.classList.remove('cursor-zoom-in', 'max-h-[500px]', 'sm:max-h-[600px]');
                    img.classList.add('cursor-zoom-out', 'max-h-none');
                  } else {
                    img.classList.remove('cursor-zoom-out', 'max-h-none');
                    img.classList.add('cursor-zoom-in', 'max-h-[500px]', 'sm:max-h-[600px]');
                  }
                }}
                title="Click diagram to toggle full size zoom"
              />
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 select-none">Click diagram to toggle full zoom</span>
          </div>
        )}
      </div>
    </MathErrorBoundary>
  );
}, (prev, next) => (
  prev.content === next.content &&
  prev.optIndex === next.optIndex &&
  prev.questionContent === next.questionContent &&
  prev.imageUrl === next.imageUrl
));

const renderExplanationLine = (rawLine: string) => {
  const line = normalizeMathDelimiters(rawLine).replace(/\\\$/g, '$');

  // 1. Check for Step / Concept / Conclusion Headers in explanations
  const conceptMatch = line.match(/^\s*\*\*(Key Concept[^*]*|Concept[^*]*|Formula[^*]*)\*\*:?\s*(.*)$/i);
  if (conceptMatch) {
    const header = conceptMatch[1].trim();
    const detail = conceptMatch[2].trim();
    return (
      <div className="flex flex-col gap-1 mt-4 mb-1.5 pb-1 border-b border-indigo-900/40">
        <div className="flex items-center gap-2 font-bold text-indigo-400 text-xs sm:text-sm tracking-wide">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
          <span className="text-zinc-100">{renderSingleLine(header)}</span>
        </div>
        {detail && <div className="text-zinc-300 text-xs sm:text-sm pl-4">{renderSingleLine(detail)}</div>}
      </div>
    );
  }

  const stepMatch = line.match(/^\s*(?:(?:\*\*\s*Step\s*(\d+)(?:\s*[:.\-]\s*([^*]+))?\s*\*\*[:.\-]?)|(?:\*\*\s*Step\s*(\d+)\s*[:.\-]?\s*\*\*\s*[:.\-]?\s*(.*))|(?:###\s*Step\s*(\d+)\s*[:.\-]?\s*(.*)))\s*$/i);
  if (stepMatch) {
    const stepNum = stepMatch[1] || stepMatch[3] || stepMatch[5] || '';
    const title = (stepMatch[2] || stepMatch[4] || stepMatch[6] || '').trim();
    const hasMeaningfulTitle = title && !/^Step\s*\d+$/i.test(title);
    return (
      <div className="flex items-center gap-2 font-bold text-cyan-400 text-xs sm:text-sm tracking-wide mt-4 mb-1.5 pb-1 border-b border-cyan-900/40">
        <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80 text-[10px] font-mono text-cyan-300 uppercase shrink-0">
          STEP {stepNum}
        </span>
        {hasMeaningfulTitle && (
          <span className="text-zinc-100 font-medium">
            {renderSingleLine(title)}
          </span>
        )}
      </div>
    );
  }

  const conclusionMatch = line.match(/^\s*\*\*(Conclusion[^*]*|Final Answer[^*]*)\*\*:?\s*(.*)$/i);
  if (conclusionMatch) {
    const header = conclusionMatch[1].trim();
    const detail = conclusionMatch[2].trim();
    return (
      <div className="flex flex-col gap-1 mt-4 mb-1.5 pb-1 border-b border-emerald-900/40">
        <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs sm:text-sm tracking-wide">
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-mono text-emerald-300 uppercase shrink-0">
            RESULT
          </span>
          <span className="text-zinc-100 font-medium">{renderSingleLine(header)}</span>
        </div>
        {detail && <div className="text-zinc-300 text-xs sm:text-sm pl-4">{renderSingleLine(detail)}</div>}
      </div>
    );
  }

  // 2. Math display card for block math in explanations
  if (line.includes('$')) {
    const parts = line.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        if (math.includes('\\begin{array}') || math.includes('\\begin{tabular}') || math.includes('\\begin{matrix}')) {
          const tableComp = renderMatchTable(math);
          if (tableComp) return <div key={i}>{tableComp}</div>;
        }
        // Failsafe: if display math contains unescaped English words or inner dollars, unwrap and render as prose line
        if (math.includes('$') || /\b(?:is|of|for|the|in|from|to|with|and|at|a|an|gas|mole|state|function)\b/i.test(math)) {
          const cleanProse = repairUnbalancedMathDelimiters(math.replace(/^\$+|\$+$/g, ''));
          return <span key={i}>{renderSingleLine(cleanProse)}</span>;
        }
        return (
          <div key={i} className="my-2.5 px-4 py-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl overflow-x-auto text-center shadow-inner">
            <BlockMath math={math} />
          </div>
        );
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return <InlineMath key={i} math={part.slice(1, -1)} />;
      }
      return <span key={i}>{renderMarkdownInline(part)}</span>;
    });
  }

  return renderSingleLine(line);
};

/**
 * Dedicated ExplanationRenderer used strictly for displaying analytical explanations
 * in MockTestResult after the test is submitted (and in printable solutions).
 * Never touches or affects the active question test arena.
 */
export const ExplanationRenderer = ({ content }: { content: string | undefined | null }) => {
  if (!content) return null;

  const cleanContent = content
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\]\)]*\s*/i, '')
    .replace(/^\]\s*/, '')
    .trim();

  const sections = parseExplanationSections(cleanContent);

  if (sections.length === 0) return null;

  // Fallback: If only a single general block without any steps/concepts was found, render line-by-line
  if (sections.length === 1 && sections[0].type === 'general') {
    const lines = sections[0].content.split('\n');
    return (
      <MathErrorBoundary fallbackText={content || ''}>
        <div className="space-y-2.5">
          {lines.map((line, lineIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return null;

            return (
              <div key={lineIdx} className="leading-relaxed">
                {renderExplanationLine(trimmed)}
              </div>
            );
          })}
        </div>
      </MathErrorBoundary>
    );
  }

  return (
    <MathErrorBoundary fallbackText={content || ''}>
      <div className="space-y-3.5">
        {sections.map((sec, idx) => {
          if (sec.type === 'concept') {
            return (
              <div key={idx} className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 font-bold text-indigo-400 text-xs sm:text-sm tracking-wide pb-1 border-b border-indigo-900/40">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
                  <span className="text-zinc-100 font-medium">{sec.title || 'Key Concept & Formula'}</span>
                </div>
                <div className="text-zinc-300 text-xs sm:text-sm leading-relaxed pl-3.5 border-l-2 border-indigo-500/30 py-1 space-y-1.5">
                  {sec.content.split('\n').map((cl, clIdx) => cl.trim() ? (
                    <div key={clIdx}>{renderExplanationLine(cl.trim())}</div>
                  ) : null)}
                </div>
              </div>
            );
          }

          if (sec.type === 'step') {
            const hasMeaningfulTitle = sec.title && !/^Step\s*\d+$/i.test(sec.title.trim());
            return (
              <div key={idx} className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 font-bold text-cyan-400 text-xs sm:text-sm tracking-wide pb-1 border-b border-cyan-900/40">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80 text-[10px] font-mono text-cyan-300 uppercase shrink-0">
                    STEP {sec.stepNum}
                  </span>
                  {hasMeaningfulTitle && (
                    <span className="text-zinc-100 font-medium">
                      {renderSingleLine(sec.title!)}
                    </span>
                  )}
                </div>
                <div className="text-zinc-300 text-xs sm:text-sm leading-relaxed pl-3.5 border-l-2 border-cyan-500/30 py-1 space-y-1.5">
                  {sec.content.split('\n').map((cl, clIdx) => cl.trim() ? (
                    <div key={clIdx}>{renderExplanationLine(cl.trim())}</div>
                  ) : null)}
                </div>
              </div>
            );
          }

          if (sec.type === 'conclusion') {
            return (
              <div key={idx} className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs sm:text-sm tracking-wide pb-1 border-b border-emerald-900/40">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-mono text-emerald-300 uppercase shrink-0">
                    RESULT
                  </span>
                  <span className="text-zinc-100 font-medium">{sec.title || 'Conclusion & Correct Option'}</span>
                </div>
                <div className="text-zinc-200 font-medium text-xs sm:text-sm leading-relaxed pl-3.5 border-l-2 border-emerald-500/30 py-1 space-y-1.5">
                  {sec.content.split('\n').map((cl, clIdx) => cl.trim() ? (
                    <div key={clIdx}>{renderExplanationLine(cl.trim())}</div>
                  ) : null)}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="text-zinc-300 text-xs sm:text-sm leading-relaxed py-1 space-y-1.5">
              {sec.content.split('\n').map((cl, clIdx) => cl.trim() ? (
                <div key={clIdx}>{renderExplanationLine(cl.trim())}</div>
              ) : null)}
            </div>
          );
        })}
      </div>
    </MathErrorBoundary>
  );
};

export const MathRenderer = ({ text, content }: { text?: string | null; content?: string | null }) => {
  return <RichTextRenderer content={text || content} />;
};

export default MathRenderer;

