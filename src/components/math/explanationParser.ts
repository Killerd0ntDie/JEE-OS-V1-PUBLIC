import { 
  repairUnbalancedMathDelimiters, 
  normalizeMathDelimiters 
} from './katexDelimiterUtils';

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
  const text = trimmed
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
    .replace(/^\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\])]*\s*/i, '')
    .replace(/^\]\s*/, '')
    .replace(/^[•\-*]\s*(?=Key Concept)/i, '')
    .trim();

  // 3. Check if the text contains explicit markers: Key Concept, Step \d+, or Conclusion
  const markerRegex = /(?:^|\n|\r|\s{2,}|\.\s+)(?:(?:\*\*|###\s*)?(Key Concept(?: & Formula)?|Concept & Formula|Governing Formula)(?:\*\*)?\s*[:.-]?|(?:\*\*\s*Step\s*(\d+)\s*[:.-]\s*([^*]+?)\s*\*\*|###\s*Step\s*(\d+)\s*[:.-]\s*([^\n]+)|(?:\*\*|###\s*)?Step\s*(\d+)(?:\*\*)?\s*[:.-]?)|(?:\*\*|###\s*)?(Conclusion & Correct Option|Conclusion|Final Answer|Result)(?:\*\*)?\s*[:.-]?)/gi;

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
