import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

/**
 * Helper to render text with inline ($...$) and display ($$...$$) KaTeX math
 */
export const renderMathText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
      const math = part.slice(2, -2).trim();
      return <BlockMath key={i} math={math} />;
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      const math = part.slice(1, -1);
      return <InlineMath key={i} math={math} />;
    }
    return <span key={i}>{part}</span>;
  });
};
