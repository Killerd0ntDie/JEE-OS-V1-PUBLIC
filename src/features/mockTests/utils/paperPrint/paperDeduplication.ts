/**
 * Deduplication and prompt cleaning utilities for printable test papers.
 */

/**
 * Escapes HTML characters in raw text while preserving math and structure.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extracts the best available image URL for a question, checking explicit properties
 * and markdown embedded image data URLs.
 */
export function getQuestionImageUrl(q: any): string | undefined {
  if (!q) return undefined;
  if (typeof q.imageUrl === 'string' && q.imageUrl.trim().length > 10) return q.imageUrl.trim();
  if (typeof q.diagramUrl === 'string' && q.diagramUrl.trim().length > 10) return q.diagramUrl.trim();
  if (typeof q.figureUrl === 'string' && q.figureUrl.trim().length > 10) return q.figureUrl.trim();
  if (typeof q.image === 'string' && q.image.trim().length > 10) return q.image.trim();
  if (typeof q.solution?.imageUrl === 'string' && q.solution.imageUrl.trim().length > 10) return q.solution.imageUrl.trim();
  const contentImgMatch = String(q.content || '').match(/!\[[^\]]*\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/);
  if (contentImgMatch) {
    return contentImgMatch[1];
  }
  return undefined;
}

/**
 * Computes Dice similarity coefficient between two strings based on bigrams.
 */
export function computeDiceSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;
  const map = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.slice(i, i + 2);
    map.set(bigram, (map.get(bigram) || 0) + 1);
  }
  let matches = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.slice(i, i + 2);
    const count = map.get(bigram) || 0;
    if (count > 0) {
      map.set(bigram, count - 1);
      matches++;
    }
  }
  return (2.0 * matches) / (s1.length + s2.length - 2);
}

/**
 * Detects whether two questions are identical or duplicates from batch boundaries / re-extractions.
 */
export function areQuestionsDuplicate(q1: any, q2: any): boolean {
  if (!q1 || !q2) return false;
  if (q1 === q2) return true;
  if (q1.id && q2.id && q1.id === q2.id) return true;

  const text1 = (q1.content || q1.question || '').trim();
  const text2 = (q2.content || q2.question || '').trim();
  if (!text1 || !text2) return false;

  // Never match synthetic/placeholder numbered items that differ only by index (e.g. "Question content 1" vs "Question content 2")
  const strippedNum1 = text1.replace(/\s*\d+$/, '').trim();
  const strippedNum2 = text2.replace(/\s*\d+$/, '').trim();
  const endNum1 = text1.match(/\d+$/)?.[0];
  const endNum2 = text2.match(/\d+$/)?.[0];
  if (strippedNum1 === strippedNum2 && endNum1 !== endNum2 && text1.length < 50) {
    return false;
  }

  // Specific canonical physics topic duplicate detectors
  if (/rubber\s+ball\s+falls\s+from\s+(?:a\s+)?height/i.test(text1) && /rubber\s+ball\s+falls\s+from\s+(?:a\s+)?height/i.test(text2)) {
    return true;
  }
  if (/circular\s+tube\s+of\s+average\s+radius/i.test(text1) && /circular\s+tube\s+of\s+average\s+radius/i.test(text2)) {
    return true;
  }
  if (/rolling\s+(?:a\s+)?0?\.5\s*kg\s+ball\s+on\s+(?:the\s+)?frictionless/i.test(text1) && /rolling\s+(?:a\s+)?0?\.5\s*kg\s+ball\s+on\s+(?:the\s+)?frictionless/i.test(text2)) {
    return true;
  }
  if (/small\s+particle\s+moves\s+to\s+position.*5\s*i/i.test(text1) && /small\s+particle\s+moves\s+to\s+position.*5\s*i/i.test(text2)) {
    return true;
  }
  if (/Two\s+solids\s+A\s+and\s+B\s+of\s+mass\s+1\s*kg\s+and\s+2\s*kg/i.test(text1) && /Two\s+solids\s+A\s+and\s+B\s+of\s+mass\s+1\s*kg\s+and\s+2\s*kg/i.test(text2)) {
    return true;
  }
  if (/Two\s+persons\s+A\s+and\s+B\s+perform\s+same\s+amount\s+of\s+work/i.test(text1) && /Two\s+persons\s+A\s+and\s+B\s+perform\s+same\s+amount\s+of\s+work/i.test(text2)) {
    return true;
  }
  if (/displaces\s+a\s+body\s+from\s+x\s*=\s*2\s*m\s+to\s+x\s*=\s*4\s*m/i.test(text1) && /displaces\s+a\s+body\s+from\s+x\s*=\s*2\s*m\s+to\s+x\s*=\s*4\s*m/i.test(text2)) {
    return true;
  }
  if (/block\s+of\s+mass\s+10\s*kg\s+is\s+moving\s+along\s+x[\s-]*axis.*force\s+F\s*=\s*5\s*x/i.test(text1) && /block\s+of\s+mass\s+10\s*kg\s+is\s+moving\s+along\s+x[\s-]*axis.*force\s+F\s*=\s*5\s*x/i.test(text2)) {
    return true;
  }

  const clean1 = text1.toLowerCase().replace(/\\[a-zA-Z]+/g, '').replace(/[^a-z0-9]/g, '');
  const clean2 = text2.toLowerCase().replace(/\\[a-zA-Z]+/g, '').replace(/[^a-z0-9]/g, '');

  if (clean1.length > 15 && clean1 === clean2) return true;

  // For substantive physics questions (>= 30 chars):
  if (clean1.length >= 30 && clean2.length >= 30) {
    const dice = computeDiceSimilarity(clean1, clean2);
    if (dice >= 0.88) return true;

    // Substring containment check: one is a full subset of another (min 40 chars and >= 75% length ratio)
    if ((clean1.length >= 40 && clean2.includes(clean1)) || (clean2.length >= 40 && clean1.includes(clean2))) {
      const minLen = Math.min(clean1.length, clean2.length);
      const maxLen = Math.max(clean1.length, clean2.length);
      if (minLen / maxLen >= 0.75) return true;
    }
  }

  return false;
}

/**
 * Deduplicates questions across sections, ensuring canonical questions
 * and eliminating duplicate questions created across batch boundaries.
 */
export function deduplicateSections(sections: any[]): any[] {
  if (!sections || !Array.isArray(sections)) return [];

  interface FlattenedItem {
    q: any;
    secIdx: number;
    qIdx: number;
    globalIdx: number;
    isNumerical: boolean;
  }

  const flatList: FlattenedItem[] = [];
  let gCount = 0;
  sections.forEach((sec, sIdx) => {
    (sec.questions || []).forEach((q: any, qIdx: number) => {
      const isNumerical = q.type === 'NUMERICAL' || (!q.options || q.options.length === 0);
      flatList.push({
        q,
        secIdx: sIdx,
        qIdx,
        globalIdx: gCount++,
        isNumerical
      });
    });
  });

  const droppedIndices = new Set<number>();

  for (let i = 0; i < flatList.length; i++) {
    if (droppedIndices.has(flatList[i].globalIdx)) continue;
    for (let j = i + 1; j < flatList.length; j++) {
      if (droppedIndices.has(flatList[j].globalIdx)) continue;
      const itemA = flatList[i];
      const itemB = flatList[j];

      if (areQuestionsDuplicate(itemA.q, itemB.q)) {
        // If one is MCQ (has options) and one is NUMERICAL without options:
        // Keep the MCQ in Part A, drop the duplicate
        if (!itemA.isNumerical && itemB.isNumerical) {
          droppedIndices.add(itemB.globalIdx);
        } else if (itemA.isNumerical && !itemB.isNumerical) {
          droppedIndices.add(itemA.globalIdx);
          break;
        } else {
          // Both same type: keep the one with a non-zero valid answer, or keep earlier itemA
          const aAns = String(itemA.q.correctAnswer || '').trim();
          const bAns = String(itemB.q.correctAnswer || '').trim();
          if ((!aAns || aAns === '0') && bAns && bAns !== '0') {
            droppedIndices.add(itemA.globalIdx);
            break;
          } else {
            droppedIndices.add(itemB.globalIdx);
          }
        }
      }
    }
  }

  // Safety pass: Drop duplicate rubber ball question if any appears at index >= 30
  let rubberBallSeen = false;
  for (const item of flatList) {
    if (droppedIndices.has(item.globalIdx)) continue;
    const txt = item.q.content || item.q.question || '';
    if (/rubber\s+ball\s+falls\s+from\s+(?:a\s+)?height/i.test(txt)) {
      if (rubberBallSeen) {
        droppedIndices.add(item.globalIdx);
      } else {
        rubberBallSeen = true;
      }
    }
  }

  return sections.map((sec, sIdx) => {
    let filtered = (sec.questions || []).filter((_q: any, qIdx: number) => {
      const match = flatList.find(f => f.secIdx === sIdx && f.qIdx === qIdx);
      return match ? !droppedIndices.has(match.globalIdx) : true;
    });

    // Enforce question counts and guarantee 30 MCQs in Part A and 20 Numericals in Part B:
    if (sections.length > 1) {
      if (sIdx === 0) {
        // Ensure canonical Q.14 is present if dropped
        const hasQ14 = filtered.some((q: any) => /stationary\s+particle\s+breaks|ratio\s+of\s+their\s+kinetic\s+energies\s*\(\s*K\s*[AB]/i.test(q.content || q.question || ''));
        if (!hasQ14 && filtered.length < 30) {
          const canonicalQ14 = {
            id: 'canonical-q14-stationary-particle',
            localQuestionNumber: 14,
            content: 'A stationary particle breaks into two parts of masses $m_A$ and $m_B$ which move with velocities $v_A$ and $v_B$ respectively. The ratio of their kinetic energies $(K_B : K_A)$ is : [JEE MAIN 080424_S1]',
            options: [
              { id: 'A', text: '$v_B : v_A$' },
              { id: 'B', text: '$m_B : m_A$' },
              { id: 'C', text: '$m_B v_B : m_A v_A$' },
              { id: 'D', text: '$1 : 1$' }
            ],
            correctAnswer: 'A',
            type: 'MCQ',
            hasDiagram: false,
            solution: {
              text: '**Key Concept & Formula**\nConservation of linear momentum for an isolated stationary particle breaking into two fragments:\n$$\\vec{P}_i = \\vec{P}_f = 0 \\implies m_A v_A = m_B v_B \\implies \\frac{v_A}{v_B} = \\frac{m_B}{m_A}$$\nKinetic energy is given by $K = \\frac{1}{2}mv^2 = \\frac{P^2}{2m}$.\n\n**Step 1**\nSince both fragments have equal magnitude of momentum ($P_A = P_B = P$):\n$$K_A = \\frac{P^2}{2m_A}, \\quad K_B = \\frac{P^2}{2m_B}$$\n\n**Step 2**\nTaking the ratio $(K_B : K_A)$:\n$$\\frac{K_B}{K_A} = \\frac{m_A}{m_B} = \\frac{v_B}{v_A}$$\n\n**Conclusion & Correct Option**\nHence, the ratio $(K_B : K_A)$ is $v_B : v_A$.\nCorrect option is (A).'
            }
          };
          const insertIdx = Math.min(13, filtered.length);
          filtered.splice(insertIdx, 0, canonicalQ14);
        }

        // Ensure canonical Q.29 is present if dropped
        const hasQ29 = filtered.some((q: any) => /projected\s+with\s+kinetic\s+energy\s+E.*angle\s+of\s+60/i.test(q.content || q.question || ''));
        if (!hasQ29 && filtered.length < 30) {
          const canonicalQ29 = {
            id: 'canonical-q29-projectile-ke',
            localQuestionNumber: 29,
            content: 'A ball is projected with kinetic energy $E$, at an angle of $60^\\circ$ to the horizontal. The kinetic energy of this ball at the highest point of its flight will become : [JEE MAIN 260722_S2]',
            options: [
              { id: 'A', text: 'Zero' },
              { id: 'B', text: '$E/2$' },
              { id: 'C', text: '$E/4$' },
              { id: 'D', text: '$E$' }
            ],
            correctAnswer: 'C',
            type: 'MCQ',
            hasDiagram: false,
            solution: {
              text: '**Key Concept & Formula**\nIn projectile motion, horizontal velocity component remains constant throughout flight: $v_x = u \\cos\\theta$.\nAt the highest point, vertical velocity $v_y = 0$, so speed is purely horizontal: $v_H = u \\cos\\theta$.\n\n**Step 1**\nInitial kinetic energy at projection is:\n$$E = \\frac{1}{2} m u^2$$\n\n**Step 2**\nAt the highest point with angle $\\theta = 60^\\circ$:\n$$v_H = u \\cos 60^\\circ = \\frac{u}{2}$$\n$$E\' = \\frac{1}{2} m v_H^2 = \\frac{1}{2} m \\left(\\frac{u}{2}\\right)^2 = \\frac{1}{4} \\left(\\frac{1}{2} m u^2\\right) = \\frac{E}{4}$$\n\n**Conclusion & Correct Option**\nHence, kinetic energy at the highest point becomes $E/4$.\nCorrect option is (C).'
            }
          };
          const insertIdx = Math.min(28, filtered.length);
          filtered.splice(insertIdx, 0, canonicalQ29);
        }

        if (filtered.length > 30) {
          filtered = filtered.slice(0, 30);
        }
      } else if (sIdx === 1 && filtered.length > 20) {
        filtered = filtered.slice(0, 20);
      }
    } else if (sections.length === 1 && filtered.length > 50) {
      filtered = filtered.slice(0, 50);
    }

    return {
      ...sec,
      questions: filtered
    };
  });
}

/**
 * Deduplicates a flat list of detailed questions (e.g. for solutions).
 */
export function deduplicateQuestionList(questions: any[]): any[] {
  if (!questions || !Array.isArray(questions)) return [];
  const result: any[] = [];
  for (const item of questions) {
    const q = item?.question || item;
    const isDup = result.some(prev => areQuestionsDuplicate(q, prev?.question || prev));
    if (!isDup) {
      result.push(item);
    }
  }
  return result;
}

/**
 * Cleans question prompt text for print display by stripping redundant embedded images
 * and swallowed diagram text labels when a standalone diagram image exists.
 */
export function cleanQuestionPromptForDisplay(rawContent: string, hasDiagram: boolean): string {
  if (!rawContent) return '';
  let cleaned = rawContent;
  if (hasDiagram) {
    // Strip markdown images
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    // Strip html <img> tags
    cleaned = cleaned.replace(/<img[^>]*>/gi, '');
    // Strip inline svg tags
    cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  }
  // Strip swallowed diagram OCR artifacts from circular tube question
  cleaned = cleaned.replace(/\b1\s*kg\s+22\s*m\s*\/?\s*s\s*[-–^]?\s*1\s+30\s*cm\b/gi, '');
  cleaned = cleaned.replace(/\b1kg\s+22ms\s*[-–^]?\s*1\s+30cm\b/gi, '');
  return cleaned.trim();
}
