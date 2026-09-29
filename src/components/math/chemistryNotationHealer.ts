// Pure string heuristics for LaTeX sanitization, Adobe fonts, and chemistry notations
export function unpackProseFromMath(text: unknown): string {
  if (text === null || text === undefined) return '';
  const str = typeof text === 'string' ? text : String(text);
  if (!str.trim()) return '';
  return str.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (fullMatch, block) => {
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
  61472: ' ',
  61483: '+',
  61485: '-',
  61501: '=',
  61600: ' ',

  // Greek lowercase
  61537: '\\alpha ', 61538: '\\beta ', 61539: '\\chi ', 61540: '\\delta ',
  61541: '\\epsilon ', 61542: '\\phi ', 61543: '\\gamma ', 61544: '\\eta ',
  61545: '\\iota ', 61546: '\\phi ', 61547: '\\kappa ', 61548: '\\lambda ',
  61549: '\\mu ', 61550: '\\nu ', 61551: 'o', 61552: '\\pi ',
  61553: '\\theta ', 61554: '\\rho ', 61555: '\\sigma ', 61556: '\\tau ',
  61557: '\\upsilon ', 61558: '\\varpi ', 61559: '\\omega ', 61560: '\\xi ',
  61561: '\\psi ', 61562: '\\zeta ',

  // Greek uppercase
  61508: '\\Delta ', 61510: '\\Phi ', 61511: '\\Gamma ', 61516: '\\Lambda ',
  61520: '\\Pi ', 61521: '\\Theta ', 61523: '\\Sigma ', 61525: '\\Upsilon ',
  61527: '\\Omega ', 61528: '\\Xi ', 61529: '\\Psi ',

  // Math operators & relations
  61605: '\\infty ', 61616: '^\\circ ', 61617: '\\pm ',
  61619: '\\ge ', 61603: '\\le ', 61655: ' \\times ', 61620: ' \\times ',
  61624: ' \\div ', 61625: ' \\ne ', 61627: ' \\approx ', 61626: ' \\equiv ',
  61621: ' \\propto ', 61622: ' \\partial ', 61612: ' \\leftarrow ',
  61614: ' \\rightarrow ', 61611: ' \\leftrightarrow ',

  // Tall brackets, parentheses, curly braces, and vertical bars (common in MathType / Equation Editor)
  61670: '(', 61671: '(', 61672: '(',
  61686: ')', 61687: ')', 61688: ')',
  61673: '[', 61674: '[', 61675: '[',
  61689: ']', 61690: ']', 61691: ']',
  61676: '{', 61677: '{', 61678: '{',
  61692: '}', 61693: '}', 61694: '}',
  61679: '|'
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
  const out = replaceAdobeSymbolFont(str);
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
    .replace(/(?<![A-Za-z0-9\\])[ˆ^]\s*([ijk])\b/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
    .replace(/(?<![A-Za-z0-9\\])([ijk])\s*[ˆ^]/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
    .replace(/(?<![A-Za-z0-9\\])\b([0-9.]+|[a-zA-Z]{1,2})?\s*([ijk])\^/gi, (_m, prefix, comp) => {
      return (prefix ? prefix : '') + `\\hat{${comp.toLowerCase()}}`;
    })
    .replace(/\b([0-9.]+|[a-zA-Z]{1,2}|\d+[a-zA-Z])\s+\\hat\{([ijk])\}/g, '$1\\hat{$2}');

  // Re-join Greek symbols or short math tokens isolated on their own line due to PDF baseline shifts
  // e.g. "The number of and \sigma and\n\pi\nbonds in dicyanogen..." -> "The number of \sigma and \pi bonds in dicyanogen..."
  out = out.replace(/(?<=[^\n])\s*\n\s*(\$?\\(?:pi|sigma|alpha|beta|delta|theta|lambda|mu|nu|phi|psi)\$?)\s*\n\s*(?=[^\n])/gi, ' $1 ');
  out = out.replace(/\b(?:and\s+)+(\$?\\(?:pi|sigma|alpha|beta)\$?)\s+and\b/gi, '$1 and');

  // Strip leaked institutional address/footer metadata
  out = out.replace(/(?:^|\n|\r|\s{2,})(?:OFFICE\s+ADDRESS|Plot\s+Number|Near\s+Riddhi|Triveni\s+Nagar|Gopalpura|Jaipur|Rajasthan|\bMob\.\s*\d|www\.[a-z0-9-]+|PAGE\s*#?\s*\d*|BATCH\s*[-–])[\s\S]*$/i, '');

  // Strip leaked section headers at beginning of questions/sections
  out = out.replace(/^(?:PART\s*[-–]\s*[IVX\d]+(?:\s*[:.-]?\s*[^\n]+)?\n*)/i, '');

  // Unpack invalid \text{...} wrappers around brackets and math commands like \text{[:\ddot{O}-\text{Cl}:]}
  out = out.replace(/\\text\{\s*(\[[^\]]*?\\[a-zA-Z]+[^\]]*?\])\s*\}/g, '$1');
  out = out.replace(/\\text\{\s*(\[[^\]]*\])\s*\}/g, '$1');

  // Unpack prose/sentence \text{...} wrappers (e.g. \text{Bond angles are not affected in } or \text{All } or \text{ are identical.})
  // Leaves single chemical symbols like \text{H}_2\text{CO}_3 and scientific units like \text{ J} untouched.
  out = out.replace(/\\text\{\s*([a-zA-Z\s,.:;!?'"()-]{2,})\s*\}/g, (_m, inner) => {
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
      /(?:H\s*[-–]\s*(?:\r?\n\s*[•\-*]\s*)?)?N\s*=\s*N(?:\^?\+|\+)?\s*=\s*N(?:\^?[-–]|-)?[\s\S]*?N(?:\^?\+|\+)?\s*[-–]\s*(?:N(?:\^?\+|\+)?\s*[-–]\s*)?N(?:\^?\+|\+)?\s*(=|\u2261|\\equiv)\s*(?:\\text\{N\}|N)(?:\^?2[-–]|\^?[-–]2|2[-–]|[-–]2|\^\{2[-–]\}|\^\{-2\})?[\s\S]*?N(?:\^?[-–]|-)?\s*[-–]\s*N(?:\^?\+|\+)?\s*(?:=|\u2261|\\equiv)\s*N[\s\S]*?(?:\(?\s*III\s*\)?|$)/i,
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
  out = out.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (match) => {
    // Normalize colliding ion charges inside math tokens to prevent KaTeX vertical stacking collision:
    // e.g. \text{PO}_4^{3-} -> {\text{PO}_4}^{3-}, O_2^+ -> {O_2}^+, O_2^{2-} -> {O_2}^{2-}
    const cleanedTok = match
      .replace(/(?<!\{)(\\text\{[^{}]+\}(?:_\d+|_\{[^}]+\})?|[A-Z][a-z]?(?:_\d+|_\{[^}]+\})?)(?:_(\d+)|_\{([^}]+)\})\^([+0-9-]+|\{[^}]+\})/g, (_m, base, sub1, sub2, sup) => {
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
  out = out.replace(/(?<!\$)\\text\{\s*([a-zA-Z0-9\s,.:;!?'"()-]{2,})\s*\}(?!\$)/g, (_m, inner) => {
    const trimmed = inner.trim();
    if (trimmed.split(/\s+/).length >= 2 || /^\(?\d+\)/.test(trimmed) || /\b(in|of|for|the|are|is|not|due|to|all|above|statements|incorrect|identical|affected|none|these|bond|angles|strength|which|case|maximum|lone|pair|electrons|trigonal|tetrahedral|octahedral|bipyramidal)\b/i.test(trimmed)) {
      return inner;
    }
    return _m;
  });

  // Auto-subscript common chemical species: XeF2 -> XeF_2, XeF4 -> XeF_4, XeO3 -> XeO_3, XeO3F2 -> XeO_3F_2, TeBr6 -> TeBr_6, BrF2 -> BrF_2, SNF3 -> SNF_3, XeF3 -> XeF_3
  out = out.replace(/(?<![a-zA-Z$])(XeF[246]|XeO[34]|XeO3F2|TeBr6|BrF[235]|SNF3|XeF3|BeCl2|SF[46]|IF[57])(?![a-zA-Z$])/g, (_m, form) => {
    const sub = form.replace(/([0-9]+)/g, '_$1');
    return `$\\text{${sub}}$`;
  });

  // Angle comparison and degree expressions (e.g. < 109°28', < 120°, > 120°, 112°, 120^\circ)
  out = out.replace(/([<>]=?)\s*(\d+)(?:\^\\circ|\s*[º°])(?:\s*(\d+)')?/g, (_m, op, deg, min) => {
    return min ? `$${op} ${deg}^\\circ ${min}'$` : `$${op} ${deg}^\\circ$`;
  });
  out = out.replace(/(?<![$0-9a-zA-Z])(\d+)(?:\^\\circ|[º°])(?!\$)/g, (_m, n) => `$${n}^\\circ$`);

  // Bare angle hat notation outside math: \widehat{HCH} or \widehat{\text{HCH}} or \widehat{CNC}
  out = out.replace(/\\widehat\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, (match) => '$' + match + '$');

  // Bare bond length / distance variables outside math: d_{\text{C-O}}, d_{\text{Sb-Cl}}, d_{C-O}
  out = out.replace(/\b([drR])_\{[^{}]+\}/g, (match) => '$' + match + '$');

  // Bare theta and angle comparisons outside math: \theta_1 > \theta_3, \theta_1, \theta_2, \theta_3, \theta
  out = out.replace(/\\theta(?:_[0-9a-zA-Z]+|_\{[^{}]*\})?\s*(?:[<>]=?|=)\s*\\theta(?:_[0-9a-zA-Z]+|_\{[^{}]*\})?/g, (match) => '$' + match + '$');
  out = out.replace(/\\theta(?:_[0-9a-zA-Z]+|_\{[^{}]*\})/g, (match) => '$' + match + '$');

  // Bare variable angle comparisons outside math: x > y, y > x, x = y
  out = out.replace(/\b([xy])\s*([<>=])\s*([xy])\b/g, '$$$1 $2 $3$');

  // Bare chemical formulas with subscripts outside math: \text{H}_2\text{CO}_3, \text{BF}_3, \text{PF}_3, \text{B(OMe)}_3, \text{SbCl}_5, \text{SO}_2\text{Cl}_2, \text{CH}_3\text{NCS}, \text{H}_2\text{CO}, \text{F}_2\text{CO}
  out = out.replace(/(?<!\$)\\text\{[A-Za-z0-9()]+\}(?:_[0-9a-zA-Z{}+-]+|\^[0-9a-zA-Z{}+-]+|\\text\{[A-Za-z0-9()]+\}|(?:\([^)]*\)))*(?!\$)/g, (match) => '$' + match + '$');

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
  out = out.replace(/\b([pd])_?(?:\\pi|pi)\s*[-–+]\s*([pd])_?(?:\\pi|pi)\b/gi, (_m, o1, o2) => {
    return `$${o1.toLowerCase()}_\\pi - ${o2.toLowerCase()}_\\pi$`;
  });
  out = out.replace(/\b([pd])_?(?:\\pi|pi)\s*[-–+]\s*([pd])_?(?:d_?\\pi|d\\pi)\b/gi, (_m, o1, o2) => {
    return `$${o1.toLowerCase()}_\\pi - ${o2.toLowerCase()}_\\pi$`;
  });
  out = out.replace(/\b([1-4]?[spdf])(?:_\{[^{}]+\}|_[a-zA-Z0-9]+)?\s*[+]\s*([1-4]?[spdf])(?:_\{[^{}]+\}|_[a-zA-Z0-9]+)?\b/gi, (match) => '$' + match + '$');
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
  out = out.replace(/(?<![$\\])\\(pi|sigma|alpha|beta|theta|lambda|nu|mu|omega|gamma|delta|Delta|Sigma|Omega|phi|psi)(?:\^([a-zA-Z0-9]+|\{[^{}]+\})|_([a-zA-Z0-9]+|\{[^{}]+\}))?\b(?!\$)/g, (match) => '$' + match + '$');

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
  out = out.replace(/(?:\\(?:dfrac|cfrac|frac)\s*\{[^{}]*\}\s*\{[^{}]*\}|\\sqrt(?:\s*\[[^\]]*\])?\s*\{[^{}]*\}|\\(?:vec|hat|bar|dot|ddot|tilde)\s*\{[^{}]*\}|\\(?:int|iint|iiint|oint|sum|prod|lim)(?:_[a-zA-Z0-9]+|_\{[^{}]*\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]*\})?|\\(?:pm|mp|times|div|approx|neq|leq|geq|infty|partial|nabla|equiv|longleftrightarrow|leftrightarrow|longrightarrow|rightleftharpoons)\b)/g, (match) => '$' + match + '$');

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
  out = out.replace(/\(\s*([xyzabcXYZABC]\s*[+-]\s*[xyzabcXYZABC]\s*[+-]\s*[xyzabcXYZABC])\s*\)/g, '$$($1)$$');
  out = out.replace(/\b([A-Z])\s*[+]\s*([A-Z])\s*[-–]\s*([A-Z])\b/g, '$$$1 + $2 - $3$$');
  out = out.replace(/\b([a-z])\s*([234])\s*[-–]\s*([a-z])\s*([234])\s*[-–]\s*([a-z])\b/g, '$$$1^{$2} - $3^{$4} - $5$$');
  out = out.replace(/\b([a-z])\s*([234])\s*[+]\s*([a-z])\s*([234])\s*[+]\s*(\d+[a-z]+)\b/g, '$$$1^{$2} + $3^{$4} + $5$$');

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
