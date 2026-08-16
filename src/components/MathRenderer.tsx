import React from 'react';
import { BlockMath as KatexBlock, InlineMath as KatexInline } from 'react-katex';

const renderError = (error: Error) => (
  <span className="text-red-500 font-mono text-sm" title={error.message}>
    [Math Error]
  </span>
);

export const BlockMath = (props: any) => {
  return <KatexBlock {...props} renderError={renderError} />;
};

export const InlineMath = (props: any) => {
  return <KatexInline {...props} renderError={renderError} />;
};

const renderMarkdownInline = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx} className="italic text-zinc-200">{part.slice(1, -1)}</em>;
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

const renderSingleLine = (rawLine: string) => {
  const line = rawLine.replace(/\\\$/g, '$');
  if (line.includes('$')) {
    const parts = line.split(/(\$\$.*?\$\$|\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return <BlockMath key={i} math={part.slice(2, -2)} />;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return <InlineMath key={i} math={part.slice(1, -1)} />;
      }
      return <span key={i}>{renderMarkdownInline(part)}</span>;
    });
  }

  const hasRawLatex = /\\[a-zA-Z]+|\{.*?\}/.test(line);

  if (hasRawLatex) {
    const matchHeader = line.match(/^(\d+\.\s*)?(\*\*.*?\*\*\:?|\*.*?\*\:?|[A-Za-z0-9\s\(\)]+\:)\s*(.*)/);

    if (matchHeader) {
      const numberPrefix = matchHeader[1] || '';
      const headerPart = matchHeader[2] || '';
      const mathBody = matchHeader[3] || '';

      return (
        <span className="flex flex-wrap items-baseline gap-1.5">
          {numberPrefix && <span className="font-bold text-indigo-400">{numberPrefix}</span>}
          {headerPart && renderMarkdownInline(headerPart)}
          {mathBody && renderSafeMath(mathBody)}
        </span>
      );
    } else {
      return renderSafeMath(line);
    }
  }

  return renderMarkdownInline(line);
};

export const RichTextRenderer = ({ content }: { content: string | undefined | null }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-3">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        return (
          <div key={lineIdx} className="leading-relaxed">
            {renderSingleLine(trimmed)}
          </div>
        );
      })}
    </div>
  );
};
