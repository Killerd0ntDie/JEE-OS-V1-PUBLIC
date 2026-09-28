/**
 * Dedicated LaTeX and Chemistry Text Normalizer for JEE Mock Test and PYQ Parsers.
 */

export const unpackProseFromMath = (text: unknown): string => {
  if (text === null || text === undefined) return '';
  const str = typeof text === 'string' ? text : String(text);
  if (!str.trim()) return '';
  return str.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (fullMatch, block) => {
    const isDouble = block.startsWith('$$');
    const inner = isDouble ? block.slice(2, -2) : block.slice(1, -1);

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

export const normalizeMathDelimiters = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '$$$1$$')
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$$$$$1$$$$');
};

export const stripMarkdownDelimiters = (str: string): string => {
  if (!str) return '';
  return str.replace(/```(?:json)?\s*([\s\S]*?)(?:```|$)/g, '$1').trim();
};

export const deduplicateQuestionText = (content: string): string => {
  if (!content) return '';
  const lines = content.split('\n');
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 30 && seen.has(trimmed)) {
      continue;
    }
    if (trimmed.length > 30) {
      seen.add(trimmed);
    }
    deduped.push(line);
  }

  return deduped.join('\n');
};
