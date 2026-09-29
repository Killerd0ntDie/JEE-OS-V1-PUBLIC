import React from 'react';
import { 
  MathErrorBoundary,
  BlockMath,
  InlineMath,
  renderMarkdownInline,
  normalizeMathDelimiters,
  unpackProseFromMath,
  parseExplanationSections,
  renderSingleLine,
  renderMatchTable,
  repairUnbalancedMathDelimiters
} from './math';

export * from './math';

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
    .replace(/^(?:PART\s*[-–]\s*[IVX\d]+(?:\s*[:.-]?\s*[^\n]+)?\n*)/i, '')
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\])]*\s*/i, '')
    .replace(/^\]\s*/, '')
    .trim();

  // Defensively heal options that lost their leading "(A)" due to historical stripping e.g. ", (C), (D)" -> "(A), (C), (D)"
  if (optIndex !== undefined && /^,\s*(?:\([A-Da-d1-4]\)|[A-Da-d1-4]\b)/i.test(cleanContent)) {
    cleanContent = `(A)${cleanContent}`;
  }

  // Format hydrazoic acid resonance structures with (I), (II), (III) cleanly centered underneath
  if (/hydrazoic|resonating structure/i.test(cleanContent) && /N\s*=\s*N/i.test(cleanContent)) {
    cleanContent = cleanContent.replace(
      /(?:H\s*[-–]\s*(?:\r?\n\s*[•\-*]\s*)?)?N\s*=\s*N(?:\^?\+|\+)?\s*=\s*N(?:\^?[-–]|-)?[\s\S]*?N(?:\^?\+|\+)?\s*[-–]\s*(?:N(?:\^?\+|\+)?\s*[-–]\s*)?N(?:\^?\+|\+)?\s*(=|\u2261|\\equiv)\s*(?:\\text\{N\}|N)(?:\^?2[-–]|\^?[-–]2|2[-–]|[-–]2|\^\{2[-–]\}|\^\{-2\})?[\s\S]*?N(?:\^?[-–]|-)?\s*[-–]\s*N(?:\^?\+|\+)?\s*(?:=|\u2261|\\equiv)\s*N[\s\S]*?(?:\(?\s*III\s*\)?|$)/i,
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
    cleanContent = cleanContent.replace(/([A-Za-z0-9$}]+)\s*\n\s*[•\-*–]\s*(ions?|orbitals?|atoms?|molecules?|electrons?)\b/gi, (_m, p1, p2) => `${p1}^- ${p2}`);

    // B. Rejoin mid-sentence PDF line breaks in question statements (e.g. "following\norbitals?" -> "following orbitals?")
    cleanContent = cleanContent.replace(/([a-zA-Z0-9,()]+)\s*\n\s*([a-z][a-zA-Z0-9]*\b(?!\s*[:.\-\])]))/g, (match, p1, p2) => {
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
      .replace(/(?<=[a-zA-Z0-9).,])(?<![-–+=])\s+(?=(?:\$[a-zA-Z]\$|[a-zA-Z])\s*=\s*(?:[0-9$]|total\b|number\b|the\b|no\.?\b|sigma\b|pi\b|delta\b|non\b))/gi, '\n• ')

      // Split after colon before first item e.g. "changes: i] NO ->" -> "changes:\ni] NO ->"
      .replace(/(?<=:)\s+(?=[ivxlcdm\d]+\]|\([ivxlcdm\d]+\)|S\d+\s*:|\b[A-F]\)\s+[A-Z0-9$])/gi, '\n')
      // Split between subsequent items e.g. "NO+ ii] O2-" -> "NO+\nii] O2-"
      .replace(/(?<!\n)\s+(?=(?:[ivxlcdm]+\]|\([ivxlcdm]+\)|S\d+\s*:)\s+)/gi, '\n')
      // Split before concluding question directive e.g. "CO+. Then the value of..." or "N2+ Then calculate..." -> "\n\nThen..."
      .replace(/(?:(?<=[.!?])|(?<=[a-z0-9)+-]))\s+(?=(?:Then|Calculate|Find|Where|Here|Determine|The value of|Arrange|Select|Choose|Identify|Which of)\b)/g, '\n\n');
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

  const stepMatch = line.match(/^\s*(?:(?:\*\*\s*Step\s*(\d+)(?:\s*[:.-]\s*([^*]+))?\s*\*\*[:.-]?)|(?:\*\*\s*Step\s*(\d+)\s*[:.-]?\s*\*\*\s*[:.-]?\s*(.*))|(?:###\s*Step\s*(\d+)\s*[:.-]?\s*(.*)))\s*$/i);
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
    const parts = line.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
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
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\])]*\s*/i, '')
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


