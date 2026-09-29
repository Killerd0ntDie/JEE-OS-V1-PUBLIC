import katex from 'katex';
import { normalizeMathDelimiters, KATEX_MACROS, unpackProseFromMath } from '@/components/MathRenderer';
import { MathNotationHealer } from '../../services/pdf/MathNotationHealer';
import { escapeHtml } from './paperDeduplication';

/**
 * Renders LaTeX math into pure HTML using KaTeX without MathML,
 * permanently preventing text duplication (e.g. 'NO3-NO3-').
 */
export function renderMathToHtml(mathStr: string, displayMode = false): string {
  try {
    return katex.renderToString(mathStr, {
      displayMode,
      output: 'html', // PURE HTML ONLY — zero MathML elements emitted
      throwOnError: false,
      macros: KATEX_MACROS
    });
  } catch (_err) {
    return `<code class="math-fallback">${escapeHtml(mathStr)}</code>`;
  }
}

/**
 * Heals question content and options (e.g., Q.6 missing options, Q.10 options, Q.13 identical options).
 */
export function healQuestionContentAndOptions(q: any): any {
  if (!q) return q;
  let content = q.content || q.question || '';
  let options = Array.isArray(q.options) ? [...q.options] : [];

  // 1. Q.1: Fix stray î after displacement and 2\hat{t} vector typo
  content = content.replace(/\bdisplacement\s*[îˆ^]\s*(?=(?:\\hat\{i\}|i\^|î|\$))/gi, 'displacement ');
  content = content.replace(/\bF\s*=\s*(?:2\s*)?\\hat\{[ti]\}\s*\+\s*b\s*\\hat\{j\}\s*\+\s*\\hat\{k\}/gi, '$\\vec{F} = 2\\hat{i} + b\\hat{j} + \\hat{k}$');
  content = content.replace(/\b2\s*\\hat\{t\}/g, '2\\hat{i}');

  // 2. Q.4: Fix missing parameter \beta
  content = content.replace(/(?<!\$)\bIf\s+(?:the\s+)?constant\s+(?:a|α|\\alpha)\s*=\s*1\s*N\s+then\s+will\s+be\b/gi, 'If the constant $\\alpha = 1\\text{ N}$, then $\\beta$ will be');
  content = content.replace(/(?<!\$)\bthen\s+will\s+be\b/gi, 'then $\\beta$ will be');

  // 3. Q.6 Healing: Statements (A)-(E) without options
  if (
    /Identify\s+the\s+correct\s+statements|Work\s+done\s+by\s+a\s+man\s+in\s+lifting\s+a\s+bucket/i.test(content) ||
    (/\(A\)\s+.*?\b(?:bucket|well|rope)\b.*?\([B-E]\)/is.test(content))
  ) {
    const hasSubstantiveOptions = options.length === 4 && options.every((o: any) => {
      const t = typeof o === 'string' ? o : o?.text || '';
      return t.length > 3 && !/^\([A-D]\)$/.test(t.trim());
    });
    if (!hasSubstantiveOptions) {
      options = [
        'B and E only',
        'A and C only',
        'B, D and E only',
        'B and D only'
      ];
    }
    if (!content.includes('(C)') || !content.includes('(D)') || !content.includes('(E)')) {
      content = `Identify the correct statements from the following: [JEE MAIN 290123_S2]\n(A) Work done by a man in lifting a bucket out of a well by means of a rope tied to the bucket is negative.\n(B) Work done by gravitational force in lifting a bucket out of a well by a rope tied to the bucket is negative.\n(C) Work done by friction on a body sliding down an inclined plane is positive.\n(D) Work done by an applied force on a body moving on a rough horizontal plane with uniform velocity is zero.\n(E) Work done by the air resistance on an oscillating pendulum is negative.\nChoose the correct answer from the options given below:`;
    }
  }

  // 3b. Q.7: Fix Capital J and hat{xi} in force vector: F = -\hat{xi} + y\hat{J} -> -x\hat{i} + y\hat{j}
  content = content.replace(/-\s*\\hat\{xi\}\s*\+\s*y\s*\\hat\{[Jj]\}|-\s*\\hat\{xi\}|\bF\s*=\s*-\s*\\hat\{xi\}\s*\+\s*y\s*\\hat\{[Jj]\}/g, '$\\vec{F} = -x\\hat{i} + y\\hat{j}$');
  content = content.replace(/y\s*\\hat\{J\}/g, 'y\\hat{j}');

  // 4. Q.10: Rubber ball falling and rebounding options
  if (/rubber\s+ball\s+falls\s+from\s+(?:a\s+)?height/i.test(content)) {
    if (options.length === 0 || options.length === 4) {
      options = [
        '$50\\%, \\sqrt{\\frac{gh}{2}}$',
        '$50\\%, \\sqrt{gh}$',
        '$40\\%, \\sqrt{2gh}$',
        '$50\\%, \\sqrt{2gh}$'
      ];
    }
  }

  // 5. Q.13 Healing: Three bodies A, B and C have equal kinetic energies... 400g, 1.2 kg and 1.6 kg
  if (/Three\s+bodies\s+A,\s*B\s+and\s+C\s+have\s+equal\s+kinetic\s+energies|400\s*g\s*,\s*1\.2\s*kg\s+and\s+1\.6\s*kg/i.test(content)) {
    if (options.length >= 2) {
      const getOptText = (o: any) => typeof o === 'string' ? o : o?.text || '';
      const t1 = getOptText(options[0]).replace(/[\s$:\\]/g, '');
      const t2 = getOptText(options[1]).replace(/[\s$:\\]/g, '');
      if (t1 === t2 || t2.includes('132') || t2.includes('1:3:2') || t2.includes('1\\sqrt{3}2')) {
        if (typeof options[1] === 'string') {
          options[1] = '$1 : \\sqrt{3} : \\sqrt{2}$';
        } else {
          options[1] = { ...options[1], text: '$1 : \\sqrt{3} : \\sqrt{2}$' };
        }
      }
    }
  }

  // 6. Q.16/Q.17: Velocity equation Option B fraction
  if (/equation\s+v\s+(?:=\s*)?x\s*,\s*where\s*\\?alpha|velocity\s+increasing\s+with\s+distance\s+according\s+to/i.test(content)) {
    if (options.length >= 2) {
      const getOptText = (o: any) => typeof o === 'string' ? o : o?.text || '';
      const t1 = getOptText(options[1]);
      if (/md\^?2.*alpha|md\^?2.*22|md_?\{?2\}?\/2a_?\{?2\}?/i.test(t1)) {
        if (typeof options[1] === 'string') {
          options[1] = '$\\frac{md^2}{2\\alpha^2}$';
        } else {
          options[1] = { ...options[1], text: '$\\frac{md^2}{2\\alpha^2}$' };
        }
      }
    }
  }

  // 6b. Q.21/Q.22: Unescaped LaTeX units (Take b = 0.25\text{m}^{\{-3/2\}}_{s-1})
  content = content.replace(/\\text\{m\}\^\{\{-?3\/2\}\}_\{s-?1\}|\\text\{m\}\^\{-3\/2\}_\{s-1\}/g, '\\text{m}^{-3/2}\\text{s}^{-1}');

  // 6c. Q.22/Q.23: Corrupted force equation F (4 x 3y 27) -> \vec{F} = (4x\hat{i} + 3y^2\hat{j})
  content = content.replace(/F\s*\(?\s*4\s*x\s*(?:3\s*y\s*2\s*7|3\s*y\s*27|3\s*y\^2)\s*\)?/gi, '$\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})$');

  // 7. Q.23/Q.24: Spring potential energy Option B
  if (/compresses\s+a\s+spring|mgy_?0/i.test(content)) {
    if (options.length >= 2) {
      const getOptText = (o: any) => typeof o === 'string' ? o : o?.text || '';
      const t1 = getOptText(options[1]);
      if (/1\/2mg.*y|21mgy|\$?1\/2mg_\{y_?2\}\s*0\$?/i.test(t1)) {
        if (typeof options[1] === 'string') {
          options[1] = '$\\frac{1}{2}mgy_0^2$';
        } else {
          options[1] = { ...options[1], text: '$\\frac{1}{2}mgy_0^2$' };
        }
      }
    }
  }

  // 7b. Q.31/Q.33: Broken vector field f = x y\hat{i}^{2\wedge}(n) + y\hat{j}^2\wedge{\Lambda}
  content = content.replace(/\$?f\s*=\s*x\s*y\s*\\hat\{i\}\^?\{?2[∧^]?\}?\(n\)\s*\+\s*y\s*\\hat\{j\}\^?2\s*(?:\\wedge|\^)?\{?[∧^Λ\\Lambda]*\}?\$?/gi, '$\\vec{F} = x^2y\\hat{i} + y^2\\hat{j}$');

  // 7c. Q.34/Q.36: Force with \hat{t} -> (2 + 3x)\hat{i} N
  content = content.replace(/\(2\s*\+\s*3x\)\s*\\hat\{t\}\s*N/gi, '(2 + 3x)\\hat{i}\\text{ N}');

  // 7d. Q.36/Q.38: Force with \hat{y} -> (5y + 20)\hat{j} N
  content = content.replace(/\(5y\s*\+\s*20\)\s*\\hat\{y\}\s*N/gi, '(5y + 20)\\hat{j}\\text{ N}');

  // 8. Q.37: Remove duplicate sentence repetition
  content = content.replace(/acts\s+on\s+a\s+particle\s+in\s+the\s+x[\s-]*direction\s*(?:\(\s*\))?\s*acts\s+on\s+a\s+particle\s+in\s+the\s+x[\s-]*direction/gi, 'acts on a particle in the $x$-direction');

  // 8b. Q.41/Q.43: MathType tall bracket corruption: (10) -n () J. The value of n will (x) be
  content = content.replace(/\(?\s*10\s*\)?\s*[-–]\s*n\s*\(\s*\)\s*J\s*\.\s*The\s*value\s*of\s*n\s*will\s*(?:\(x\)|x)?\s*be/gi, '$\\left(\\frac{10}{x}\\right)^{-n}\\text{ J}$. The value of $n$ will be');

  // 9. Q.45: Strip swallowed diagram labels
  content = content.replace(/\b1\s*kg\s+22\s*m\s*\/?\s*s\s*[-–^]?\s*1\s+30\s*cm\b/gi, '');
  content = content.replace(/\b1kg\s+22ms\s*[-–^]?\s*1\s+30cm\b/gi, '');

  // 10. Q.47/Q.49: Ratio A/1
  if (/Two\s+solids\s+A\s+and\s+B\s+of\s+mass\s+1\s*kg\s+and\s+2\s*kg/i.test(content)) {
    content = content.replace(/(?:\\frac\{4\}\{1\}|4\/1)/g, '\\frac{A}{1}');
  }
  content = content.replace(/\b(?:will\s+be\s+)?(?:\\frac\{4\}\{1\}|4\/1)\s*,\s*so\s+the\s+value\s+of\s+A\b/gi, 'will be $\\frac{A}{1}$, so the value of $A$');

  // Heal math in content and options
  content = MathNotationHealer.healMathText(content);
  options = options.map((opt: any) => {
    if (typeof opt === 'string') return MathNotationHealer.healMathText(opt);
    if (opt && typeof opt.text === 'string') {
      return { ...opt, text: MathNotationHealer.healMathText(opt.text) };
    }
    return opt;
  });

  const effectiveType = options && options.length > 0 ? (q.type === 'NUMERICAL' ? 'MCQ' : (q.type || 'MCQ')) : 'NUMERICAL';

  return {
    ...q,
    content,
    options,
    type: effectiveType
  };
}

/**
 * Converts markdown inline styling (**bold**, *italic*, `code`, and images) to HTML.
 */
export function formatMarkdownInline(text: string): string {
  if (!text) return '';
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\)|\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map(part => {
    if (part.startsWith('![') && part.includes('](')) {
      const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        const alt = escapeHtml(imgMatch[1] || 'Diagram');
        const src = imgMatch[2];
        return `<span class="inline-img-card" style="display: inline-block; padding: 2px 4px; vertical-align: middle; break-inside: avoid;"><img src="${src}" alt="${alt}" style="max-height: 140px; max-width: 100%; object-fit: contain; vertical-align: middle;" /></span>`;
      }
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return `<em>${escapeHtml(part.slice(1, -1))}</em>`;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    }
    return escapeHtml(part);
  }).join('');
}

/**
 * Auto-wraps bare LaTeX expressions, symbols, and mathematical notation
 * outside existing math delimiters ($...$ or $$...$$) into $...$ for KaTeX rendering.
 */
export function autoWrapBareMath(text: string): string {
  if (!text) return '';

  // 1. Normalize and wrap degree notation directly: 45 ∘ -> $45^\circ$, 60 ∘ -> $60^\circ$
  let out = text.replace(/(?<!\$)\b(\d+)\s*(?:∘|\\circ\b|\^\\circ\b)(?!\$)/g, (_m, d) => `$${d}^\\circ$`);

  // 1b. Normalize unit vector notation: i cap, j cap, k cap, î, ĵ, k̂, i^, j^, k^, {∧}, ^{∧}
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
    .replace(/(?<![a-zA-Z0-9\\])([ijk])\s*[{^]?\s*[∧^]\s*\}?/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
    .replace(/(?<![a-zA-Z0-9\\])[{^]?\s*[∧^]\s*\}?\s*([ijk])\b/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
    .replace(/\b([0-9.]+|[a-zA-Z]{1,2})?([ijk])\s*[-–]?\s*caps?\b/gi, (_m, prefix, c) => `${prefix || ''}\\hat{${c.toLowerCase()}}`)
    .replace(/\b([0-9.]+|[a-zA-Z]{1,2}|\d+[a-zA-Z])\s+\\hat\{([ijk])\}/g, '$1\\hat{$2}')
    // Clean exam tags with underscores so they are never treated as LaTeX subscripts
    .replace(/\[\s*(?:JEE\s*MAIN|JEEMAIN)[^\]]*\]/gi, (tag) => tag.replace(/_/g, ' '));

  // 2. Split by existing math blocks ($$...$$ or $...$)
  const parts = out.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) return part; // already inside math

    let p = part;

    // Vector equations and expressions: e.g. F = 2\hat{i} + b\hat{j} + \hat{k}, \hat{i} - 2\hat{j} - \hat{k}, 2\hat{i} + 3\hat{j}, -x\hat{i} + y\hat{j}, 2\hat{i}, \hat{i}
    p = p.replace(
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

    // General equations like a = b + c or v = \alpha\sqrt{x}
    p = p.replace(/(?<!\$)\b([a-zA-Z]\s*=\s*[-+]?(?:[0-9a-zA-Z\s+\-*/^_]|\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\])?)+)(?=\s*[.,;:]|\s+[a-z]{3,}|\s*$)(?!\$)/g, (m) => {
      if (/[\\[\]{}^_=]/.test(m) && !/\b(?:is|at|the|and|or|of|to|in|by|for)\b/i.test(m)) {
        return `$${m.trim()}$`;
      }
      return m;
    });

    // Contiguous sequence containing LaTeX commands: \alpha, \beta, \theta, \sqrt{...}, \frac{...}{...}, \hat{...}
    p = p.replace(/(?<!\$)(?<![a-zA-Z\\])(\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\])*(?:[\s^_]*\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\])*|[0-9a-zA-Z+\-*/^_=()])*)(?!\$)/g, (_m, g) => {
      const trimmed = g.trim();
      if (!trimmed || trimmed === '\\') return g;
      return `$${trimmed}$`;
    });

    // Variables with exponents or subscripts: x^2, y^2, y_0, m_A, m_B, v_A, v_B, etc.
    p = p.replace(/(?<!\$)\b([0-9]*[a-zA-Z][\^_][0-9a-zA-Z]+)(?!\$)/g, (_m, g) => `$${g}$`);

    return p;
  }).join('');
}

/**
 * Parses LaTeX tabular/array environments representing Match the Column tables into clean HTML.
 */
export function renderMatchTableToHtml(rawText: string): string | null {
  const unwrap = rawText.replace(/^\$\$|\$\$$/g, '').trim();
  const envMatch = unwrap.match(/\\begin\{(?:array|matrix|tabular)\*?\}(?:\{[lcr|]+\})?([\s\S]*?)\\end\{(?:array|matrix|tabular)\*?\}/i);
  if (!envMatch) return null;

  const inner = envMatch[1].trim();
  const rawRows = inner.split(/\\\\/).map(r => r.trim()).filter(Boolean);
  if (rawRows.length < 2 || !rawRows.some(r => r.includes('&'))) return null;

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
    return cleanCell;
  }));

  const hasHeader = rows[0].some(cell => /column|list|group|reaction|property|orbital|state/i.test(cell) || /^\*\*[^*]+\*\*$/.test(cell));
  const headerRow = hasHeader ? rows[0] : null;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return `
    <div class="print-table-wrapper" style="margin: 8px 0 10px 0; overflow-x: auto;">
      ${beforeText ? `<div style="margin-bottom: 4px; font-weight: 600;">${renderSingleLineToHtml(beforeText)}</div>` : ''}
      <table class="print-match-table" style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 10.5px;">
        ${headerRow ? `
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 1px solid #000000;">
              ${headerRow.map(h => `<th style="padding: 4px 8px; text-align: left; font-weight: 700; border: 1px solid #000000;">${renderInlineContentToHtml(h.replace(/^\\textbf\{([^{}]+)\}$/, '$1').replace(/^\*\*([^*]+)\*\*$/, '$1'))}</th>`).join('')}
            </tr>
          </thead>
        ` : ''}
        <tbody>
          ${dataRows.map(row => `
            <tr>
              ${row.map(cell => `<td style="padding: 4px 8px; border: 1px solid #d1d5db; vertical-align: top;">${renderInlineContentToHtml(cell)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${afterText ? `<div style="margin-top: 4px;">${renderSingleLineToHtml(afterText)}</div>` : ''}
    </div>
  `;
}

/**
 * Renders inline text, handling display math, inline math, and markdown formatting.
 */
export function renderInlineContentToHtml(rawLine: string): string {
  const line = (rawLine || '').replace(/(?:^|\s)#{1,6}\s+/g, ' ').trim();

  if (line.includes('$')) {
    const parts = line.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
    return parts.map(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return `<div class="math-display">${renderMathToHtml(part.slice(2, -2).trim(), true)}</div>`;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return `<span class="math-inline">${renderMathToHtml(part.slice(1, -1).trim(), false)}</span>`;
      }
      return formatMarkdownInline(part);
    }).join('');
  }

  // Fallback for standalone math formulas
  const hasRawLatex = /\\[a-zA-Z]+|\{.*?\}|\^[0-9a-zA-Z]+|_[0-9a-zA-Z]+/.test(line);
  if (hasRawLatex) {
    const words = line.split(/\s+/);
    const isPureMath = words.length <= 4 ||
      (/^[\\a-zA-Z0-9_^+\-*/=(){}\s]+$/.test(line) && !/[a-z]{4,}/i.test(line.replace(/\\[a-zA-Z]+/g, '')));
    if (isPureMath) {
      return `<span class="math-inline">${renderMathToHtml(line, false)}</span>`;
    }
  }

  return formatMarkdownInline(line);
}

/**
 * Renders a single line of text, handling inline SVGs, tables, headings, list items, math, and markdown.
 */
export function renderSingleLineToHtml(rawLine: string): string {
  // 1. Native inline SVG diagrams
  if (rawLine.includes('<svg') && rawLine.includes('</svg>')) {
    const svgMatch = rawLine.match(/(<svg[\s\S]*?<\/svg>)/i);
    if (svgMatch) {
      const before = rawLine.substring(0, svgMatch.index).trim();
      const svgCode = svgMatch[1];
      const after = rawLine.substring(svgMatch.index! + svgCode.length).trim();
      return `
        <div class="diagram-wrapper">
          ${before ? `<div class="diagram-caption">${renderSingleLineToHtml(before)}</div>` : ''}
          <div class="diagram-svg">${svgCode}</div>
          ${after ? `<div class="diagram-caption">${renderSingleLineToHtml(after)}</div>` : ''}
        </div>
      `;
    }
  }

  // 1b. Standalone Markdown images ![alt](url)
  const mdImgMatch = rawLine.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (mdImgMatch) {
    const before = rawLine.substring(0, mdImgMatch.index).trim();
    const altText = mdImgMatch[1];
    const imgSrc = mdImgMatch[2];
    const after = rawLine.substring(mdImgMatch.index! + mdImgMatch[0].length).trim();
    return `
      <div class="print-diagram-block" style="text-align: center; margin: 10px auto 14px auto; break-inside: avoid !important; page-break-inside: avoid !important;">
        ${before ? `<div class="diagram-caption" style="font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 4px;">${renderSingleLineToHtml(before)}</div>` : ''}
        <div style="display: inline-block; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; background: #ffffff;">
          <img src="${imgSrc}" alt="${escapeHtml(altText || 'Diagram')}" style="max-height: 220px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" />
        </div>
        ${after ? `<div class="diagram-caption" style="font-size: 10px; font-weight: 600; color: #374151; margin-top: 4px;">${renderSingleLineToHtml(after)}</div>` : ''}
      </div>
    `;
  }

  // 2. Match Tables
  if (rawLine.includes('\\begin{array}') || rawLine.includes('\\begin{tabular}') || rawLine.includes('\\begin{matrix}')) {
    const tableHtml = renderMatchTableToHtml(rawLine);
    if (tableHtml) return tableHtml;
  }

  // 3. KaTeX matrix blocks
  if ((rawLine.includes('\\begin{matrix}') || rawLine.includes('\\begin{array}')) && !rawLine.includes('$$')) {
    return `<div class="math-display">${renderMathToHtml(rawLine, true)}</div>`;
  }

  const line = autoWrapBareMath(normalizeMathDelimiters(rawLine).replace(/\\\$/g, '$'));

  // 4. Markdown Headings (#, ##, ###)
  const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const content = headingMatch[2].trim();
    if (level === 1) return `<h3 class="print-h1">${renderInlineContentToHtml(content)}</h3>`;
    if (level === 2) return `<h4 class="print-h2">${renderInlineContentToHtml(content)}</h4>`;
    return `<h5 class="print-h3">${renderInlineContentToHtml(content)}</h5>`;
  }

  // 5. Bullet list items
  const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
  if (bulletMatch) {
    return `<div class="print-bullet-item"><span class="bullet-dot">•</span><span class="bullet-text">${renderInlineContentToHtml(bulletMatch[1].trim())}</span></div>`;
  }

  // 6. Numbered list items
  const numMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
  if (numMatch && !line.includes('$=')) {
    return `<div class="print-num-item"><span class="num-marker">${numMatch[1]}.</span><span class="num-text">${renderInlineContentToHtml(numMatch[2].trim())}</span></div>`;
  }

  return renderInlineContentToHtml(line);
}

/**
 * Renders rich text (questions, options, explanations) into clean semantic HTML.
 */
export function renderRichTextToPrintHtml(
  content: string | undefined | null,
  optIndex?: number,
  _questionContent?: string
): string {
  if (!content) return '';

  let cleanContent = unpackProseFromMath(content)
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\longr\\rightarrow/g, '\\longrightarrow')
    .replace(/(?<![a-zA-Z\\])ightarrow\b/g, '\\rightarrow')
    .replace(/\\n(?![a-zA-Z])/g, '\n')
    .replace(/\\r(?![a-zA-Z])/g, '')
    .replace(/\\q?quad\s*(?=\([ivxlcdm\d]+\))/gi, '\n')
    .replace(/\\q?quad\s*/gi, '   ')
    .replace(/^(?:PART\s*[-–]\s*[IVX\d]+(?:\s*[:.-]?\s*[^\n]+)?\n*)/i, '')
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\])]*\s*/i, '')
    .replace(/^\]\s*/, '')
    .trim();

  // Heal broken exponents, vectors, radicals, and MathType glyphs
  cleanContent = MathNotationHealer.healMathText(cleanContent);

  // Defensively heal options that lost their leading "(A)" due to historical stripping e.g. ", (C), (D)" -> "(A), (C), (D)"
  if (optIndex !== undefined && /^,\s*(?:\([A-Da-d1-4]\)|[A-Da-d1-4]\b)/i.test(cleanContent)) {
    cleanContent = `(A)${cleanContent}`;
  }

  // Rejoin broken chemical species & radicals/ions split across lines (e.g. "O2\n• ion" -> "O2^- ion")
  cleanContent = cleanContent.replace(/([A-Za-z0-9$}]+)\s*\n\s*[•\-*–]\s*(ions?|orbitals?|atoms?|molecules?|electrons?)\b/gi, (_m, p1, p2) => `${p1}^- ${p2}`);

  // Rejoin mid-sentence PDF line breaks in question statements
  if (optIndex === undefined) {
    cleanContent = cleanContent.replace(/([a-zA-Z0-9,()]+)\s*\n\s*([a-z][a-zA-Z0-9]*\b(?!\s*[:.\-\])]))/g, (match, p1, p2) => {
      if (/^(?:and|or|in|of|to|for|with|by|from|the|a|an|is|are|which|orbitals?|atoms?|electrons?|molecules?|ions?|statements?|value|hybridization|structure|geometry|order)\b/i.test(p2) ||
          /\b(the|of|in|to|for|with|by|from|a|an|is|are|which|one|two|three|following)\b$/i.test(p1)) {
        return `${p1} ${p2}`;
      }
      return match;
    });
  }

  if (cleanContent.includes('<svg')) {
    cleanContent = cleanContent.replace(/<svg[\s\S]*?<\/svg>/gi, (svgBlock) => {
      return svgBlock.replace(/\r?\n\s*/g, ' ');
    });
  }

  // Separate and flatten table environments so they are kept intact on a single line
  cleanContent = cleanContent.replace(/([^\n]+?)(\s*(?:\$\$)?\\begin\{(?:array|tabular|matrix)\*?\})/g, '$1\n\n$2');
  cleanContent = cleanContent.replace(/((?:\$\$)?\\begin\{(?:array|tabular|matrix)\*?\}(?:\{[lcr|]+\})?[\s\S]*?\\end\{(?:array|tabular|matrix)\*?\}(?:\$\$)?)/gi, (tableBlock) => {
    return tableBlock.replace(/\r?\n\s*/g, ' ');
  });

  // For options (optIndex !== undefined): flatten accidental line breaks so option text stays cohesive on a single line (fixes Q13)
  if (optIndex !== undefined) {
    cleanContent = cleanContent.replace(/\r?\n\s*/g, ' ');
  }

  const lines = cleanContent.split('\n');
  return lines
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<div class="rich-line">${renderSingleLineToHtml(line)}</div>`)
    .join('');
}

/**
 * Strips duplicate option listings from question content when options are rendered separately.
 * NEVER strips statements (A)-(E) from multi-statement questions (such as Q6).
 */
export function stripTrailingOptionsFromContent(content: string, options?: string[]): string {
  if (!content || !options || options.length === 0) return content;

  // Multi-statement questions with statements (A)-(E) must NEVER have statements stripped
  if (/\b(?:\(?E\)|\[E\]|E\.)\b/i.test(content)) {
    return content;
  }

  // Check if content has trailing option block like (A) ... (B) ... (C) ... (D)
  const optionBlockMatch = content.match(/(?:\n|\r|\s{2,})(?:\(?A\)|\(?1\)|\bA\.)\s+[\s\S]*$/i);
  if (optionBlockMatch?.index && optionBlockMatch.index > 10) {
    // Only strip if trailing block actually matches the text of the first option
    const matchedTrailing = optionBlockMatch[0].toLowerCase();
    const firstOptText = (typeof options[0] === 'string' ? options[0] : (options[0] as any)?.text || '').toLowerCase().trim();
    if (firstOptText.length >= 3 && matchedTrailing.includes(firstOptText.slice(0, 15))) {
      const candidateBody = content.substring(0, optionBlockMatch.index).trim();
      if (candidateBody.length >= 10) {
        return candidateBody;
      }
    }
  }

  return content;
}

export function getOptionLetter(idx: number): string {
  return String.fromCharCode(65 + idx);
}

export function formatKeyForDisplay(ans: string | undefined, type: string, useNumbers = false): string {
  if (!ans) return '-';
  const trimmed = ans.trim();
  if (type === 'NUMERICAL') return trimmed;
  if (/^[a-dA-D]$/.test(trimmed)) {
    if (useNumbers) {
      const code = trimmed.toUpperCase().charCodeAt(0) - 64;
      return `(${code})`;
    }
    return trimmed.toUpperCase();
  }
  const parsed = parseInt(trimmed, 10);
  if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 3) {
    if (useNumbers) {
      return `(${parsed + 1})`;
    }
    return String.fromCharCode(65 + parsed);
  }
  if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 4 && useNumbers) {
    return `(${parsed})`;
  }
  return trimmed;
}
