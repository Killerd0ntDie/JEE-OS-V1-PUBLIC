import React from 'react';
import { 
  BlockMath, 
  InlineMath, 
  renderMarkdownInline, 
  renderSafeMath, 
  normalizeMathDelimiters, 
} from './katexDelimiterUtils';


function renderInlineContent(rawLine: string): React.ReactNode {
  // Strip stray heading hashes like "### The Core Formula" when passed into inline renderers
  const line = (rawLine || '').replace(/(?:^|\s)#{1,6}\s+/g, ' ').trim();
  if (line.includes('$')) {
    const parts = line.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
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
    const matchHeader = line.match(/^(\d+\.\s*)?(\*\*.*?\*\*:?|\*.*?\*:?|[A-Za-z0-9\s()]+:)\s*(.*)/);

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

      const isLatexFormulaLine = /\\left\[|\\right\]|\^\{[0-9+-]+|_\{[0-9+-]+/.test(line);
      const isPureMath = (isChemicalOrResonanceLine && !hasProsePrefix) || isLatexFormulaLine || words.length <= 4 || (/^[\\a-zA-Z0-9_^+\-*/=(){}[\],\s]+$/.test(line) && !/[a-z]{4,}/i.test(line.replace(/\\[a-zA-Z]+/g, '')));
      if (isPureMath) {
        return renderSafeMath(line);
      }
    }
  }

  const unwrapText = line.replace(/\\text\{\s*([^{}]+)\s*\}/g, '$1');
  return renderMarkdownInline(unwrapText);
}

export function renderMatchTable(rawText: string): React.ReactNode | null {
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
    cleanCell = cleanCell.replace(/(?<![a-zA-Z$])(XeF[246]|XeO[34]|XeO3F2|TeBr6|BrF[235]|SNF3|XeF3|BeCl2|SF[46]|IF[57])(?![a-zA-Z$])/g, (_m, form) => {
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

export const renderSingleLine = (rawLine: string, isOption = false, questionContent?: string, optIndex?: number) => {
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
  const isMathInequality = /^>\s*(?:\$|\\|[0-9]|<|=|\([A-Za-z0-9])/.test(line);
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
  const numMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
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

