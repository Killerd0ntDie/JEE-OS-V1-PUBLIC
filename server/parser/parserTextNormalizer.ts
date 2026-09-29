/**
 * Text and mathematical formula normalizers for server-side mock test parsing.
 */

export const unpackProseFromMath = (text: unknown): string => {
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
      let unpacked = inner;
      unpacked = unpacked.replace(/\\text\{\s*([^{}]+)\s*\}/g, '$1');
      unpacked = unpacked.replace(/(?:^|(?<=\s|,))([a-zA-Z])\s*=\s*/g, '$$$1$$ = ');
      unpacked = unpacked.replace(/\b(O2|B2|NO|N2|H2|CO|SO3|BF3|PCl5|CCl4)\b/g, (_m, f) => {
        const withSub = f.replace(/(\d+)/g, '_$1');
        return `$\\text{${withSub}}$`;
      });
      unpacked = unpacked.replace(/\b([A-Z])\s*[-–]\s*([A-Z])\b/g, '$\\text{$1}-\\text{$2}$');
      return unpacked;
    }

    return fullMatch;
  });
};

export const sanitizeCorruptedLatex = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str
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
    .replace(/(?<![a-zA-Z\\])ext\s+([A-Z][a-z0-9_]*)/g, '\\text{$1}');
};

export const validateDiagramBbox = (bbox: any): number[] | undefined => {
  if (!Array.isArray(bbox) || bbox.length !== 4) return undefined;
  const numBbox = bbox.map((v: any) => typeof v === 'number' ? v : parseFloat(v));
  if (numBbox.some((v: any) => typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v))) return undefined;

  let [ymin, xmin, ymax, xmax] = numBbox;
  if (ymin > ymax) { const temp = ymin; ymin = ymax; ymax = temp; }
  if (xmin > xmax) { const temp = xmin; xmin = xmax; xmax = temp; }

  const isZeroToOne = ymax <= 1.0 && xmax <= 1.0 && ymin >= 0 && xmin >= 0;
  const minSpan = isZeroToOne ? 0.015 : 15;
  if ((ymax - ymin) < minSpan || (xmax - xmin) < minSpan) return undefined;

  return [
    isZeroToOne ? Math.max(0, Math.min(1, ymin)) : Math.max(0, Math.min(1000, Math.round(ymin))),
    isZeroToOne ? Math.max(0, Math.min(1, xmin)) : Math.max(0, Math.min(1000, Math.round(xmin))),
    isZeroToOne ? Math.max(0, Math.min(1, ymax)) : Math.max(0, Math.min(1000, Math.round(ymax))),
    isZeroToOne ? Math.max(0, Math.min(1, xmax)) : Math.max(0, Math.min(1000, Math.round(xmax)))
  ];
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

  out = out.replace(/^(?:PART\s*[-–]\s*[IVX\d]+(?:\s*[:.-]?\s*[^\n]+)?\n*)/i, '');

  // Unpack invalid \text{...} wrappers around brackets and math commands
  out = out.replace(/\\text\{\s*(\[[^\]]*?\\[a-zA-Z]+[^\]]*?\])\s*\}/g, '$1');
  out = out.replace(/\\text\{\s*(\[[^\]]*\])\s*\}/g, '$1');

  // Unpack prose/sentence \text{...} wrappers (e.g. \text{Bond angles are not affected in } or \text{All } or \text{ are identical.})
  // Leaves single chemical symbols like \text{H}_2\text{CO}_3 and scientific units like \text{ J} untouched.
  out = out.replace(/\\text\{\s*([a-zA-Z0-9\s,.:;!?'"()-]{2,})\s*\}/g, (_m, inner) => {
    const trimmed = inner.trim();
    if (trimmed.split(/\s+/).length >= 2 || /^\(?\d+\)/.test(trimmed) || /\b(in|of|for|the|are|is|not|due|to|all|above|statements|incorrect|identical|affected|none|these|bond|angles|strength|which|case|maximum|lone|pair|electrons|trigonal|tetrahedral|octahedral|bipyramidal)\b/i.test(trimmed)) {
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

  // 1. In text, convert \quad / \qquad spacing into clean separator or newlines
  out = out.replace(/\\q?quad\s*(?=\([ivxlcdm\d]+\))/gi, '\n');
  out = out.replace(/\\q?quad\s*/gi, '   ');

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
  out = out.replace(/(?<!\$)\\text\{[A-Za-z0-9()]+\}(?:_[0-9a-zA-Z{}]+|\^[0-9a-zA-Z{}]+|\\text\{[A-Za-z0-9()]+\}|(?:\([^)]*\)))*(?!\$)/g, (match) => '$' + match + '$');

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

  const formatSub = (sub: string) => {
    const s = sub.toLowerCase();
    if (s.includes('x') && s.includes('y') && s.includes('2')) return 'x^2-y^2';
    if (s.includes('z') && s.includes('2')) return 'z^2';
    return s;
  };

  // Orbital combinations (with or without underscore, e.g. py - py, p_y - p_y, dxy - dxy, d_xy - d_xy)
  out = out.replace(/\b([pd])_?(x\^?2[-–]y\^?2|z\^?2|[xyz]{1,2})\s*[-–]\s*([pd])_?(x\^?2[-–]y\^?2|z\^?2|[xyz]{1,2})\b/gi, (_m, o1, a1, o2, a2) => {
    return `$${o1.toLowerCase()}_{${formatSub(a1)}} - ${o2.toLowerCase()}_{${formatSub(a2)}}$`;
  });
  out = out.replace(/\b([pd])_?(x\^?2[-–]y\^?2|z\^?2|[xyz]{1,2})\b(?!\w)/gi, (_m, o, a) => {
    return `$${o.toLowerCase()}_{${formatSub(a)}}$`;
  });

  // 3. Bare Greek symbols outside math: \pi, \sigma, \lambda, \nu, \theta, \alpha, \beta, \mu, \Delta (including powers e.g. \sigma^2)
  out = out.replace(/\\(pi|sigma|alpha|beta|theta|lambda|nu|mu|omega|gamma|delta|Delta|Sigma|Omega|phi|psi)(?:\^([a-zA-Z0-9]+|\{[^{}]+\})|_([a-zA-Z0-9]+|\{[^{}]+\}))?\b/g, (match) => '$' + match + '$');

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

  // 4. Bare LaTeX math constructs outside math: fractions, square roots, vectors, integrals, sums, limits, operators
  out = out.replace(/(?:\\(?:dfrac|cfrac|frac)\s*\{[^{}]*\}\s*\{[^{}]*\}|\\sqrt(?:\s*\[[^\]]*\])?\s*\{[^{}]*\}|\\(?:vec|hat|bar|dot|ddot|tilde)\s*\{[^{}]*\}|\\(?:int|iint|iiint|oint|sum|prod|lim)(?:_[a-zA-Z0-9]+|_\{[^{}]*\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]*\})?|\\(?:pm|mp|times|div|approx|neq|leq|geq|infty|partial|nabla)\b)/g, (match) => '$' + match + '$');

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

  // 7. Common chemical ions with charges & formulas
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
    [/\bICl2\s*\^?\s*\+\b/g, '${\\text{ICl}_2^+$'],
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
    [/\bH3O\s*\+?\b/g, '${\\text{H}_3\\text{O}}^+$']
  ];

  for (const [regex, rep] of ionMap) {
    out = out.replace(regex, rep);
  }

  // Hydrazoic acid resonance structures: H - N = N+ = N- <---> H - N+ - N+ = N2- <---> H - N- - N+ = N with (I), (II), (III) underneath
  if (/hydrazoic|resonating structure/i.test(out) && /N\s*=\s*N/i.test(out)) {
    out = out.replace(
      /(?:H\s*[-–]\s*(?:\r?\n\s*[•\-*]\s*)?)?N\s*=\s*N(?:\^?\+|\+)?\s*=\s*N(?:\^?[-–]|-)?[\s\S]*?N(?:\^?\+|\+)?\s*[-–]\s*N(?:\^?\+|\+)?\s*=\s*N(?:\^?2[-–]|\^?[-–]2|2[-–]|[-–]2)?[\s\S]*?N(?:\^?[-–]|-)?\s*[-–]\s*N(?:\^?\+|\+)?\s*(?:=|\u2261|\\equiv)\s*N[\s\S]*?(?:\(?\s*III\s*\)?|$)/i,
      () => `$$\\underset{\\text{(I)}}{\\text{H}-\\text{N}=\\text{N}^+=\\text{N}^-} \\;\\longleftrightarrow\\; \\underset{\\text{(II)}}{\\text{H}-\\text{N}^+-\\text{N}^+=\\text{N}^{2-}} \\;\\longleftrightarrow\\; \\underset{\\text{(III)}}{\\text{H}-\\text{N}^--\\text{N}^+\\equiv\\text{N}}$$`
    );
  }

  mathTokens.forEach((tok, idx) => {
    out = out.replace('___CHEM_TOK_' + idx + '___', () => tok);
  });

  svgTokens.forEach((tok, idx) => {
    out = out.replace('___SVG_TOK_' + idx + '___', () => tok);
  });

  codeTokens.forEach((tok, idx) => {
    out = out.replace('___CODE_TOK_' + idx + '___', () => tok);
  });

  return out;
};

export const normalizeMathDelimiters = (str: string): string => {
  if (!str) return '';
  let clean = str
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, eq) => `$$${eq.replace(/\n\s*\n+/g, '\n')}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, eq) => `$${eq.replace(/\n\s*\n+/g, ' ')}$`)
    .replace(/\\\\\[([\s\S]*?)\\\\\]/g, (_m, eq) => `$$${eq.replace(/\n\s*\n+/g, '\n')}$$`)
    .replace(/\\\\\(([\s\S]*?)\\\\\)/g, (_m, eq) => `$${eq.replace(/\n\s*\n+/g, ' ')}$`);

  // Auto-wrap bare LaTeX block environments like \begin{array} ... \end{array} in display math $$...$$
  clean = clean.replace(/(?<!\$)\s*(\\begin\{(?:array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|gathered|tabular)\*?\}[\s\S]*?\\end\{(?:array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|gathered|tabular)\*?\})\s*(?!\$)/g, (_m, env) => {
    const katexEnv = env
      .replace(/\\begin\{tabular\}/g, '\\begin{array}')
      .replace(/\\end\{tabular\}/g, '\\end{array}')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
    return `\n\n$$${katexEnv}$$\n\n`;
  });

  // Convert bare \textbf{...} outside math into markdown bold **...**
  clean = clean.replace(/\\textbf\{([^{}]+)\}/g, '**$1**');

  return normalizeChemistryAndOrbitals(clean);
};

export const formatExplanationText = (text: string): string => {
  if (!text) return '';
  let clean = text
    .replace(/\r/g, '')
    .replace(/\\longr\\rightarrow/g, '\\longrightarrow')
    .replace(/(?<![a-zA-Z\\])ightarrow\b/g, '\\rightarrow')
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    .replace(/\\r(?![a-zA-Z])/g, '');
  clean = normalizeMathDelimiters(clean.trim());
  clean = clean
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\])]*\s*/i, '')
    .replace(/^\]\s*/, '')
    .replace(/^[•\-*]\s*(?=Key Concept)/i, '')
    .replace(/(?:^|\n|\r|\s{2,}|\.\s+)(?:\*\*|###\s*)?(Key Concept(?: & Formula)?|Concept & Formula|Governing Formula)(?:\*\*)?\s*[:.-]?\s*/gi, '\n\n**Key Concept & Formula**\n')
    .replace(/(?:^|\n|\r|\s{2,}|\.\s+)(?:\*\*\s*Step\s*(\d+)\s*[:.-]\s*([^*]+?)\s*\*\*|###\s*Step\s*(\d+)\s*[:.-]\s*([^\n]+)|(?:\*\*|###\s*)?Step\s*(\d+)(?:\*\*)?\s*[:.-]?)\s*/gi, (_m, n1, t1, n2, t2, n3) => {
      const num = n1 || n2 || n3;
      const title = t1 || t2;
      return title?.trim() ? `\n\n**Step ${num}: ${title.trim()}**\n` : `\n\n**Step ${num}**\n`;
    })
    .replace(/(?:^|\n|\r|\s{2,}|\.\s+)(?:\*\*|###\s*)?(Conclusion & Correct Option|Conclusion|Final Answer|Result)(?:\*\*)?\s*[:.-]?\s*/gi, '\n\n**Conclusion & Correct Option**\n');

  clean = clean.trim();
  // If the explanation begins with concept content before Step 1 without an explicit Key Concept heading, prepend it
  if (!/^\s*\*\*(?:Key Concept|Concept)/i.test(clean) && /(?:^|\n|\r)\s*\*\*Step 1\b/i.test(clean)) {
    clean = `**Key Concept & Formula**\n${clean}`;
  }
  return clean;
};

export const extractMultiCorrectFromExplanation = (exp: string): string | null => {
  if (!exp || typeof exp !== 'string') return null;

  // 0. Check if the derivation explicitly concludes a single option
  const singleConclusionMatch = exp.match(/(?:(?:[Cc]orrect\s+[Oo]ption|[Cc]onclusion[^\n*]*|[Ff]inal\s+[Aa]nswer)[:\s*–—-]*|\*\*)(?:\()?([A-D])(?:\))?(?!\s*[,A-D&/])(?:\s*(?:is\s+correct|is\s+the\s+correct\s+answer|is\s+true))?/i);
  const hasExplicitSingleConclusion = Boolean(singleConclusionMatch && !/(?:and|&|,)\s*\(?[A-D]\)?/i.test(singleConclusionMatch[0]));

  // 1. Look for explicit multi-letter combination e.g. **ACD** or **(ACD)** or "Correct Option: ACD"
  const multiLetterMatch = exp.match(/(?:(?:[Cc]orrect\s+[Oo]ptions?|[Cc]onclusion[^\n*]*|[Ff]inal\s+[Aa]nswer)[:\s*–—-]*|\*\*)(?:\()?([A-D]{2,4})(?:\))?\b/);
  if (multiLetterMatch) {
    const letters = multiLetterMatch[1].toUpperCase();
    const unique = Array.from(new Set(letters.split(''))).sort().join('');
    if (unique.length >= 2) return unique;
  }

  if (hasExplicitSingleConclusion) {
    return null;
  }

  // 2. Look for listed options e.g. "Options (A), (C) and (D) are correct" or "Both Option A and Option B are correct"
  const multiListRegex = /(?:both\s+)?(?:options?|statements?)[:\s]*(?:\([A-D]\)|\b[A-D]\b)(?:[,\s]+and|\s*,\s*|\s+and\s+)(?:\([A-D]\)|\b[A-D]\b)(?:(?:[,\s]+and|\s*,\s*|\s+and\s+)(?:\([A-D]\)|\b[A-D]\b))*/gi;
  let match: RegExpExecArray | null;
  while ((match = multiListRegex.exec(exp)) !== null) {
    const matchIndex = match.index;
    const matchEnd = matchIndex + match[0].length;
    const followingWindow = exp.slice(matchEnd, matchEnd + 45);
    const precedingWindow = exp.slice(Math.max(0, matchIndex - 30), matchIndex);

    const isNegative = /(?:are|is|were)\s+(?:all\s+|both\s+)?(?:in\s*correct|false|wrong|invalid|not\s+correct|not\s+true)/i.test(followingWindow) ||
      /(?:in\s*correct|false|wrong|invalid)\s+(?:statements?|options?)/i.test(precedingWindow);

    if (isNegative) {
      continue;
    }

    const isPositive = /(?:are|is|were)\s+(?:all\s+|both\s+)?(?:correct|true|valid|right)/i.test(followingWindow) ||
      /(?:correct|true|valid)\s+(?:statements?|options?)/i.test(precedingWindow);

    if (isPositive) {
      const letters = match[0].replace(/[^A-D]/g, '').toUpperCase();
      const unique = Array.from(new Set(letters.split(''))).sort().join('');
      if (unique.length >= 2) return unique;
    }
  }

  // 3. Look for comma-separated options in conclusion: e.g. "(A, C, D)" or "(A, C)"
  const commaSeparatedMatch = exp.match(/(?:[Cc]orrect\s+[Oo]ptions?|[Cc]onclusion[^\n*]*|[Ff]inal\s+[Aa]nswer)[:\s*–—-]*\([A-D](?:\s*,\s*[A-D])+\)/i);
  if (commaSeparatedMatch) {
    const letters = commaSeparatedMatch[0].replace(/[^A-D]/g, '').toUpperCase();
    const unique = Array.from(new Set(letters.split(''))).sort().join('');
    if (unique.length >= 2) return unique;
  }

  return null;
};
