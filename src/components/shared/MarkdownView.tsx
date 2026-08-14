import React from 'react';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  if (!content) return null;

  // Split into lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const parseInline = (text: string): React.ReactNode[] => {
    // Split by bold (**text**) and code (`code`)
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const matchText = match[0];
      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-semibold text-white">
            {matchText.slice(2, -2)}
          </strong>
        );
      } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
        parts.push(
          <code key={match.index} className="px-1.5 py-0.5 rounded-md bg-white/10 font-mono text-indigo-300 text-[11px] border border-white/10">
            {matchText.slice(1, -1)}
          </code>
        );
      } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic text-zinc-300">
            {matchText.slice(1, -1)}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code Block detection
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/15 font-mono text-xs text-indigo-200 overflow-x-auto my-2.5 shadow-inner">
            <pre>{codeBlockBuffer.join('\n')}</pre>
          </div>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm sm:text-base font-display font-bold text-white tracking-tight mt-3 mb-1">
          {parseInline(trimmed.replace(/^###\s+/, ''))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base sm:text-lg font-display font-bold text-white tracking-tight mt-4 mb-1.5">
          {parseInline(trimmed.replace(/^##\s+/, ''))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-lg sm:text-xl font-display font-black text-white tracking-tight mt-4 mb-2">
          {parseInline(trimmed.replace(/^#\s+/, ''))}
        </h1>
      );
      continue;
    }

    // Numbered Lists (e.g., 1. Item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 text-zinc-200 font-sans text-xs sm:text-sm leading-relaxed mt-1.5">
          <span className="font-mono font-bold text-indigo-400 shrink-0 text-xs mt-0.5">{numMatch[1]}.</span>
          <div className="flex-1">{parseInline(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Bullet Lists (e.g. • or - or *)
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.replace(/^[•\-*]\s+/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 text-zinc-300 font-sans text-xs sm:text-sm leading-relaxed pl-2 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
          <div className="flex-1">{parseInline(bulletText)}</div>
        </div>
      );
      continue;
    }

    // Default Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-zinc-200 font-sans text-xs sm:text-sm leading-relaxed">
        {parseInline(trimmed)}
      </p>
    );
  }

  return <div className={`space-y-1.5 ${className}`}>{elements}</div>;
}
