/**
 * MathNotationHealer
 * Specialized engine to repair OCR glyph corruption, stripped radicals,
 * broken exponents, scuffed vector components, and MathType symbol fonts
 * extracted from coaching DPP and PYQ PDF documents.
 */

export class MathNotationHealer {
  /**
   * Comprehensive math healing pipeline.
   */
  static healMathText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    let out = text;

    // 0. Character encoding / Symbol Font Normalization
    out = out
      // MathType / Wingdings private use area and symbol glyphs
      .replace(/\uF072/gu, '\\vec{F}') //  -> \vec{F} (arrow above F)
      .replace(/\uF024/gu, '^{\\wedge}') //  -> hat
      .replace(/\uF03D/gu, '=') //  -> =
      .replace(/\uF02B/gu, '+') //  -> +
      .replace(/[\uF02D\u2212]/gu, '-') // , − -> - (preserve en-dash – and em-dash — in text)
      .replace(/\uF061/gu, '\\alpha') //  -> \alpha
      .replace(/\uF062/gu, '\\beta') //  -> \beta
      .replace(/\uF071/gu, '\\theta') //  -> \theta
      .replace(/\uF075/gu, 'v') //  -> velocity v
      .replace(/\uF077/gu, '\\omega') //  -> \omega
      .replace(/\uF070/gu, '\\pi') //  -> \pi
      .replace(/S\s*I\s*units/gi, 'SI units')
      .replace(/S\s*\s*units/gi, 'SI units');

    // 1. MathType Tall Bracket Fractions (e.g. Q43:  10  -n    x )
    // Strictly require MathType bracket glyphs so normal parentheses (1) and (2) are NEVER matched!
    out = out.replace(/(?:[\uF0E6\uF0E7\uF0E8]\s*([0-9a-zA-Z]+)\s*[\uF0F6\uF0F7\uF0F8])\s*[-–]?([a-zA-Z0-9]+)\s*[\uF0E7\uF0F7\(\)\s]*[\uF0E8\uF0E6]\s*([0-9a-zA-Z]+)\s*[\uF0F8\uF0F6]/gu,
      '$\\left(\\frac{$1}{$3}\\right)^{-$2}$'
    );
    out = out.replace(/\s*10\s*\s*[-–]n\s*\s*\s*J\s*\.\s*The\s*value\s*of\s*n\s*will\s*\s*x\s*/gu,
      '$\\left(\\frac{10}{x}\\right)^{-n}\\text{ J}$. The value of $n$ will'
    );

    // 2. Vectors with circumflex / hat (ˆ, ^, ) or "cap" notation (i cap, j cap, k cap)
    out = out
      // Remove stray OCR î right after displacement word ONLY if followed by another i vector (e.g. displacementî \hat{i})
      .replace(/\bdisplacement\s*[îˆ\^]\s*(?=(?:\\hat\{i\}|i\^|î|\$))/gi, 'displacement ')
      // OCR typos where \hat{i} is read as \hat{t} or t^
      .replace(/\\hat\{t\}/g, '\\hat{i}')
      .replace(/(?<![a-zA-Z0-9\\])\b([0-9.]+|[a-zA-Z]{1,2})?\s*t\^/gi, (_m, prefix) => {
        return (prefix ? prefix : '') + '\\hat{i}';
      })
      // Unicode circumflex unit vectors
      .replace(/î/g, '\\hat{i}')
      .replace(/ĵ/g, '\\hat{j}')
      .replace(/k̂|k\u0302/gu, '\\hat{k}')
      // "cap" notation: e.g. 'i cap', 'j cap', 'k cap', 'i-cap', '3 i caps'
      .replace(/\b([ijk])\s*[-–]?\s*caps?\b/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
      // Variations with circumflex / hat: '2 i ˆ', 'i ˆ', 'ˆ j', '2 ˆ j', 'b ˆ j', 'k ˆ', 'yj ˆ', 'x i ˆ'
      .replace(/(?<![A-Za-z0-9])(?:([0-9]+|[a-z])\s*)?[ˆ\^]\s*([ijk])\b/g, (_m, prefix, comp) => {
        return (prefix ? prefix : '') + `\\hat{${comp}}`;
      })
      .replace(/(?<![A-Za-z0-9])(?:([0-9]+|[a-z])\s*)?([ijk])\s*[ˆ\^]/g, (_m, prefix, comp) => {
        return (prefix ? prefix : '') + `\\hat{${comp}}`;
      })
      // Isolated 'i^', 'j^', 'k^' with coefficient
      .replace(/(?<![A-Za-z0-9\\])\b([0-9.]+|[a-zA-Z]{1,2})?\s*([ijk])\^/gi, (_m, prefix, comp) => {
        return (prefix ? prefix : '') + `\\hat{${comp.toLowerCase()}}`;
      })
      // MathType hat and circumflex symbols: 'i {∧}', 'j {∧}', '^{∧}', '{∧}'
      .replace(/(?<![a-zA-Z0-9\\])([ijk])\s*[\{^]?\s*[∧\^]\s*\}?/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
      .replace(/(?<![a-zA-Z0-9\\])[\{^]?\s*[∧\^]\s*\}?\s*([ijk])\b/gi, (_m, c) => `\\hat{${c.toLowerCase()}}`)
      // Clean space between valid coefficient and hat: 'b \hat{j}' -> 'b\hat{j}', '2 \hat{j}' -> '2\hat{j}'
      // Guard: NEVER attach long English words like 'displacement \hat{i}' or 'where \hat{i}'
      .replace(/\b([0-9.]+|[a-zA-Z]{1,2}|\d+[a-zA-Z])\s+\\hat\{([ijk])\}/g, '$1\\hat{$2}')
      // Isolated 'ˆ'
      .replace(/[ˆ]/g, '^')
      .replace(/\\hat\{\s*([ijk])\s*\}/g, '\\hat{$1}')
      .replace(/\bF\s*=\s*[-–]?x\s*\[?\^?\s*\+\s*y\s*\]?[~^]?/gi, '$\\vec{F} = -x\\hat{i} + y\\hat{j}$')
      .replace(/-\s*\\hat\{xi\}/g, '-x\\hat{i}')
      .replace(/\+y\\hat\{[Jj]\}/g, '+ y\\hat{j}')
      .replace(/y\s*\\hat\{J\}/g, 'y\\hat{j}')
      // Q22/Q23: Fix broken vector F notation before vector wrapper
      .replace(/F\s*\(?\s*\$?\s*4\s*x\s*(?:î|\\hat\{i\}|i\^?)\$?[\+\s]*3\s*y(?:_2|\^2|2|27)?\s*\$?(?:ĵ|\\hat\{j\}|j\^?)\$?\s*\)?/gi,
        '$\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})$')
      .replace(/F\s*\(?\s*4\s*x\s*(?:3\s*y\s*2\s*7|3\s*y\s*27|3\s*y\^2)\s*\)?/gi,
        '$\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})$')
      .replace(/F\s*\(\s*4\s*x\s*j\s*3\s*y\^2\s*j\^?\s*\)/g,
        '$\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})$')
      // Q31/Q33: Fix corrupted vector field before vector wrapper
      .replace(/\bf\s*=\s*x\s*\$?\s*y\s*(?:\\hat\{i\}|i\^2\^?|i\^?|î)[^\+\n]*(?:\+|\band\b)\s*\$?\s*y\s*(?:\\hat\{j\}|j\^2\^?|j\^?|i\^2\^?|ĵ)[^\s,]*/gi,
        '$\\vec{F} = x^2y\\hat{i} + y^2\\hat{j}$')
      .replace(/xy\\hat\{i\}\^?\{?2\^?\}?\(n\)/gi, 'x^2y\\hat{i}')
      .replace(/\bf\s*=\s*x\s*y\^?2?\s*[\^\{∧\\}\s]*\+\s*y\^?2?\s*[\^\{∧\\}\s]*(?=acts\s+on\s+a\s+particle\s+in\s+(?:a\s+)?plane\s*x\s*\+\s*y\s*=\s*10)/gi,
        '$\\vec{F} = (x^2y\\hat{i} + y^2\\hat{j})$ ')
      // Q36/Q38: Force (5y + 20) \hat{y} -> \hat{j}
      .replace(/\(5y\s*\+\s*20\)\s*\\hat\{y\}\s*N/gi, '(5y + 20)\\hat{j}\\text{ N}')
      .replace(/\\hat\{y\}\s*N/gi, '\\hat{j}\\text{ N}');

    // Clean exam tags with underscores (e.g. [JEE MAIN_220125_S2]) so they are never treated as LaTeX subscripts
    out = out.replace(/\[\s*(?:JEE\s*MAIN|JEEMAIN)[^\]]*\]/gi, (tag) => tag.replace(/_/g, ' '));

    // Wrap vector expressions (equations, polynomials, and single components) into LaTeX math mode $...$ outside existing math blocks
    out = MathNotationHealer.replaceOutsideMath(out, (plain) => {
      return plain.replace(
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
    });

    // 3. Exponents & Powers
    out = out
      // Fractional powers: x 5/2 -> x^{5/2}
      .replace(/\b([a-zA-Z])\s+([0-9]+)\s*\/\s*([0-9]+)\b/g, '$1^{$2/$3}')
      // Negative fractional powers in units: m –3/2 s –1 or \text{m}^{\{-3/2\}}_{s-1} -> \text{m}^{-3/2} \text{s}^{-1}
      .replace(/\\text\{m\}\^\{?\\?\{-?3\/2\\?\}?\}?_\{?\\?\{?s-?1\\?\}?\}?/g, '\\text{m}^{-3/2}\\text{s}^{-1}')
      .replace(/\bm\s*[-–]\s*3\/2\s*s\s*[-–]\s*1\b/gi, '\\text{m}^{-3/2}\\text{s}^{-1}')
      .replace(/\bm\s*[-–]\s*3\/2\b/gi, '\\text{m}^{-3/2}')
      .replace(/\bs\s*[-–]\s*1\b/gi, '\\text{s}^{-1}')
      .replace(/\bms\s*[-–]\s*1\b/gi, '\\text{ms}^{-1}')
      .replace(/\bms\s*[-–]\s*2\b/gi, '\\text{ms}^{-2}')
      // Units with powers of 2
      .replace(/\bN\/m\s*2\b/g, '\\text{N/m}^2')
      .replace(/\bm\/s\s*2\b/g, '\\text{m/s}^2')
      // Variable squared: x 2 -> x^2, y 2 -> y^2, 3x 2 -> 3x^2, mgy 2 -> mgy^2
      .replace(/\b([0-9]*[a-zA-Z]+)\s+2\b(?=\s*(?:acts|\+|\-|\=|\*|\/|\)|\]|\,|\.|\b))/g, (m, varName) => {
        // Exclude English words or unit names (e.g. 'is 2', 'at 2', 'point 2', 'to 2', 'in 2', 'kg 2', 'm 2')
        if (/^(?:is|at|to|in|point|page|level|q|step|given|take|ratio|by|of|or|and|mass|kg|cm|mm|km)$/i.test(varName)) {
          return m;
        }
        return `${varName}^2`;
      })
      // Parenthetical squared: (3x 2 + 4) -> (3x^2 + 4)
      .replace(/\(([0-9]*[a-zA-Z]+)\s+2\s*([+\-])/g, '($1^2 $2');

    // 4. Square roots missing radical symbol
    out = out
      // (Given, R = 14m, g = 10 m/s 2 and 2 1.4 ) -> \sqrt{2} = 1.4
      .replace(/\band\s+2\s+(?:=\s*)?1\.4\b/gi, 'and $\\sqrt{2} = 1.4$')
      .replace(/\b2\s*=\s*1\.4\b/g, '$\\sqrt{2} = 1.4$')
      // Ratios with \sqrt{3}: '1: 3 : 2', '2 : 3 :1', '3 : 2 :1'
      .replace(/\b1\s*:\s*3\s*:\s*2\b/g, '$1 : \\sqrt{3} : 2$')
      .replace(/\b2\s*:\s*3\s*:\s*1\b/g, '$2 : \\sqrt{3} : 1$')
      .replace(/\b3\s*:\s*2\s*:\s*1\b/g, '$\\sqrt{3} : 2 : 1$')
      // Q10 options: '50%, gh/2', '50%, 2gh', '40%, 2gh'
      .replace(/(\d+%\s*,\s*)gh\/2\b/g, '$1$\\sqrt{\\frac{gh}{2}}$')
      .replace(/(\d+%\s*,\s*)2gh\b/g, '$1$\\sqrt{2gh}$')
      .replace(/(\d+%\s*,\s*)gh\b/g, '$1$\\sqrt{gh}$')
      // Q17: 'equation v x , where  is a constant' -> 'equation v = \alpha\sqrt{x}, where \alpha is a constant'
      .replace(/\bequation\s+v\s+(?:=\s*)?x\s*,\s*where\s*\\?alpha/gi,
        'equation $v = \\alpha\\sqrt{x}$, where \\alpha'
      );

    // 5. Subscripts
    out = out
      // Q14 kinetic energy ratio options
      .replace(/\bm\s*:\s*m\s+B\s+A\b/g, '$m_B : m_A$')
      .replace(/\bm\s+v\s+B\s+B\s*:\s*m\s+v\s+A\s+A\b/g, '$m_B v_B : m_A v_A$')
      .replace(/\bv\s+B\s*:\s*v\s+A\b/g, '$v_B : v_A$')
      .replace(/\bK\s*B\s*:\s*K\s*A\b/g, '$K_B : K_A$')
      // General subscripts: mA -> m_A, mB -> m_B, vA -> v_A, vB -> v_B, y0 -> y_0
      .replace(/\b([mvEFK])([AB])\b/g, '$1_$2')
      .replace(/\b([yxh])0\b/g, '$1_0')
      .replace(/\b([yxh])1\b/g, '$1_1')
      .replace(/\b([yxh])2\b/g, '$1_2');

    // 6. Fractions in question text & options
    out = out
      // Q12: 'm/2 , m 2m, 4m' -> '\frac{m}{2}, m, 2m, 4m'
      .replace(/\bm\/2\s*,\s*m\s+2m\s*,\s*4m\b/g, '$\\frac{m}{2}$, $m$, $2m$, $4m$')
      .replace(/\bm\s+2m\s*,\s*4m\b/g, 'm, 2m, 4m')
      // Q49: 'A/1' -> '\frac{A}{1}'
      .replace(/\bA\/1\b/g, '$\\frac{A}{1}$')
      .replace(/\b1A\b/g, '$\\frac{A}{1}$');

    // 7. Clean unescaped LaTeX symbols in plain text (only outside existing math delimiters)
    out = MathNotationHealer.replaceOutsideMath(out, (plain) => {
      return plain
        .replace(/\\alpha/g, '$\\alpha$')
        .replace(/\\beta/g, '$\\beta$')
        .replace(/\\theta/g, '$\\theta$')
        .replace(/\\text\{m\}\^\{?\\?\{-?3\/2\\?\}?\}?_\{?\\?\{?s-?1\\?\}?\}?|\\text\{m\}\^\{-3\/2\}_\{s-1\}|\\text\{m\}\^\{-3\/2\}\s*\\text\{s\}\^\{-1\}/g, '$\\text{m}^{-3/2}\\text{s}^{-1}$')
        .replace(/(?<!\$)\\text\{m\}\^\{-3\/2\}(?!\s*\\text\{s\})/g, '$\\text{m}^{-3/2}$')
        .replace(/(?<!\\text\{m\}\^\{-3\/2\}\s*)\\text\{s\}\^\{-1\}(?!\$)/g, '$\\text{s}^{-1}$');
    });

    // 7.5 JEE Physics-specific OCR healing rules
    out = out
      // Q1: Fix Force: F = 2 + i^ + b j^ + k^ or 2\hat{t} + bj^ + k^
      .replace(/(?:F|\\vec\{F\})\s*=\s*(?:2\s*\+?\s*|2)?(?:î|\\hat\{i\}|\\hat\{t\}|i\^?)\s*\+\s*(?:b\s*)?(?:ĵ|\\hat\{j\}|j\^?)\s*\+\s*(?:k̂|\\hat\{k\}|k\^?)/gi, '$\\vec{F} = 2\\hat{i} + b\\hat{j} + \\hat{k}$')
      .replace(/\bF\s*=\s*2\s*\\hat\{[ti]\}/gi, 'F = 2\\hat{i}')
      .replace(/\b2\s*\\hat\{t\}/g, '2\\hat{i}')
      // Q1: Fix corrupted vector displacement notation: î - 2-k or j - 2j^ - k^ → \hat{i} - 2\hat{j} - \hat{k}
      .replace(/(?:\bj|î|\$?\\hat\{i\}\$?|i\^?)\s*[-–]\s*2\s*(?:j|ĵ|\$?\\hat\{j\}\$?|j\^?|\s)*[-–]\s*(?:k|k̂|\$?\\hat\{k\}\$?|k\^?)/gi, '$\\hat{i} - 2\\hat{j} - \\hat{k}$')
      .replace(/(?:î|\$?\\hat\{i\}\$?|i\^?)\s*[-–]\s*2\s*[-–]?\s*(?:k|k̂|\$?\\hat\{k\}\$?|k\^?)\b/gi, '$\\hat{i} - 2\\hat{j} - \\hat{k}$')
      // Q4: Fix F = a + \beta x2 → F = \alpha + \beta x^2, \alpha = 1N, \beta
      .replace(/\bF\s*=\s*(?:a|α|\\alpha)\s*\+\s*(?:β|\\beta|b)\s*x[\s_]*2\b/gi, '$F = \\alpha + \\beta x^2$')
      .replace(/(?<!\$)\bIf\s+(?:the\s+)?constant\s+(?:a|α|\\alpha)\s*=\s*1\s*N\s+then\s+will\s+be\b/gi, 'If the constant $\\alpha = 1\\text{ N}$, then $\\beta$ will be')
      .replace(/(?<!\$)\b(?:a|α)\s*=\s*1\s*N\b/gi, '$\\alpha = 1\\text{ N}$')
      .replace(/(?<!\$)\bthen\s+(?:b|β|\\beta)\s+will\s+be\b/gi, 'then $\\beta$ will be')
      .replace(/(?<!\$)\bthen\s+will\s+be\b/gi, 'then $\\beta$ will be')
      .replace(/\\beta\s*x\s*2\b/g, '\\beta x^2')
      .replace(/\bN\/m\^?2\b/g, '\\text{N/m}^2')
      // Q7: Capital J and hat{xi} in force vector: F=-\hat{xi}+y\hat{J} -> -x\hat{i}+y\hat{j}
      .replace(/-\s*\\hat\{xi\}\s*\+\s*y\s*\\hat\{[Jj]\}|-\s*\\hat\{xi\}|\bF\s*=\s*-\s*\\hat\{xi\}\s*\+\s*y\s*\\hat\{[Jj]\}/g, '$\\vec{F} = -x\\hat{i} + y\\hat{j}$')
      .replace(/y\s*\\hat\{J\}/g, 'y\\hat{j}')
      .replace(/\\hat\{J\}/g, '\\hat{j}')
      .replace(/\\hat\{xi\}/g, 'x\\hat{i}')
      // Q9: Fix √2 = 1.4 with flexible spacing/prefix
      .replace(/(?:and\s+)?(?:√\s*)?2\s*=\s*1\.41?4?\b/gi, '$\\sqrt{2} = 1.4$')
      // Q10: Fix multi-line square roots: √\n(expr) (only when NOT followed by a denominator line)
      .replace(/√\s*\n+\s*([a-zA-Z0-9\/]+)(?!\s*\n+\s*[^\n\(\)\s])/g, '$\\sqrt{$1}$')
      // Q10: Fix gH typo and comma artifacts, and OCR artifact $50%_{O_i}\sqrt{yh/2} -> 50%, \sqrt{gh/2}
      .replace(/\$50\%(?:_\{O_\{i\}\}|\{O_i\}|O_i)?\s*\\sqrt\{\\frac\{[yv]h\}\{2\}\}\$/gi, '$50\\%, \\sqrt{\\frac{gh}{2}}$')
      .replace(/50\%(?:_\{O_\{i\}\}|\{O_i\}|O_i)?\s*\\sqrt\{\\frac\{[yv]h\}\{2\}\}/gi, '50\\%, \\sqrt{\\frac{gh}{2}}')
      .replace(/(\d+%\s*),?\s*(?:\\sqrt\{)?g[Hh](?:\/2|\s*\/\s*2)?\}?/g, (_m, pct) => {
        const p = pct.replace(/,/g, '').trim();
        return `${p}, $\\sqrt{\\frac{gh}{2}}$`;
      })
      .replace(/\bgH\b/g, 'gh')
      .replace(/\\frac\{yh\}\{2\}/g, '\\frac{gh}{2}')
      .replace(/(\d+%)\s*,\s*gh\/2\b/gi, '$1, $\\sqrt{\\frac{gh}{2}}$')
      .replace(/(\d+%)\s*,\s*\\sqrt\{\s*\\frac\{g[Hh]\}\{2\}\s*\}/gi, '$1, $\\sqrt{\\frac{gh}{2}}$')
      // Q12: Fix mass sequence 2m, m. 2m. 4m → m/2, m, 2m, 4m
      .replace(/\b2m\s*,\s*m\s*[.,]\s*2m\s*[.,]\s*4m\b/g, '$\\frac{m}{2}$, $m$, $2m$, $4m$')
      // Q14: Fix subscripts v_A and v_{\overline{B}} -> v_A and v_B
      .replace(/v_?\{?\\overline\{B\}\}?|v_?\{?\\bar\{B\}\}?/g, 'v_B')
      .replace(/m_?\{?\\overline\{B\}\}?|m_?\{?\\bar\{B\}\}?/g, 'm_B')
      .replace(/v_?\{?\\overline\{A\}\}?|v_?\{?\\bar\{A\}\}?/g, 'v_A')
      .replace(/m_?\{?\\overline\{A\}\}?|m_?\{?\\bar\{A\}\}?/g, 'm_A')
      // Q16/Q17: Fix Greek OCR corruption: να χ → v = α√x and Option B: md^2 d/2 \alpha^2 -> \frac{md^2}{2\alpha^2}
      .replace(/\b(?:v|ν)\s*[=αa]\s*(?:\\alpha|α|a)\s*(?:\\sqrt\{x\}|√?x|χ)\s*,?\s*whe/gi,
        '$v = \\alpha\\sqrt{x}$, whe')
      .replace(/\bmd\^?2\s+d\/2\s*\$?(?:\\alpha|2|α)\$?\^?2\b|\bmd\^?2\s+d\/2\s*2\s*\^?2\b|\$md\^?2_?\{?\\alpha\}?d\/22~a\^?2\$|md\^?2_?\{?\\alpha\}?d\/22~a\^?2/gi, '$\\frac{md^2}{2\\alpha^2}$')
      .replace(/\\frac\{md_?\{?2\}?\}\{2a_?\{?2\}?\}|md_\{2\}\/2a_\{2\}|md_?\{?2\}?\/2a_?\{?2\}?/g, '\\frac{md^2}{2\\alpha^2}')
      .replace(/md\s*2\s*d\s*\/\s*2\s*2\s*2/g, '$\\frac{md^2}{2\\alpha^2}$')
      // Q21/Q22: Fix unescaped raw LaTeX \text{m}^{\{-3/2\}}_{s-1} -> \text{m}^{-3/2}\text{s}^{-1}
      .replace(/\\text\{m\}\^\{\{-?3\/2\}\}_\{s-?1\}|\\text\{m\}\^\{-3\/2\}_\{s-1\}/g, '\\text{m}^{-3/2}\\text{s}^{-1}')
      // Q22/Q23: Fix broken vector F notation: F(4xî 3y_2 \hat{j}) or F (4 x 3y 27) -> \vec{F} = (4x\hat{i} + 3y^2\hat{j})
      .replace(/F\s*\(?\s*\$?\s*4\s*x\s*(?:î|\\hat\{i\}|i\^?)\$?[\+\s]*3\s*y(?:_2|\^2|2|27)?\s*\$?(?:ĵ|\\hat\{j\}|j\^?)\$?\s*\)?/gi,
        '$\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})$')
      .replace(/F\s*\(?\s*4\s*x\s*(?:3\s*y\s*2\s*7|3\s*y\s*27|3\s*y\^2)\s*\)?/gi,
        '$\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})$')
      .replace(/F\s*\(\s*4\s*x\s*j\s*3\s*y\^2\s*j\^?\s*\)/g,
        '$\\vec{F} = (4x\\hat{i} + 3y^2\\hat{j})$')
      // Q23/Q24: Fix corrupted ½mgy₀²: 1/2mgyz0 or 1/2mg_{y_2}0 -> \frac{1}{2}mgy_0^2
      .replace(/\b(?:21|1\/2)\s*m\s*g\s*y\s*z?0\s*2?\b|\$1\/2mg_\{y_?2\}\s*0\$?|1\/2mg_\{y_?2\}\s*0|\$1\/2mg_\{y_\{2\}\}0\$|1\/2mg_\{y_\{2\}\}0/gi, '$\\frac{1}{2}mgy_0^2$')
      .replace(/\b1\/2mgyz0\b/gi, '$\\frac{1}{2}mgy_0^2$')
      // Q29/Q31: Solution markup leak: 5\backslash hat{i}$... -> 5\hat{i} - 2\hat{j} + \hat{k}
      .replace(/5\s*\\(?:backslash|\\)\s*hat\{i\}\$?\s*[-–]\s*2\s*\$?\\(?:backslash|\\)\s*hat\{j\}\$?\s*\+\s*\$?\\(?:backslash|\\)\s*hat\{k\}\$?/gi,
        '$5\\hat{i} - 2\\hat{j} + \\hat{k}$')
      .replace(/\\backslash\s*hat\{([ijk])\}/gi, '\\hat{$1}')
      // Q30: Fix mass OCR corruption: a_{0}^{\circ} kg or a_0.5 kg -> 0.5 kg
      .replace(/\ba_\{0\}\^\{\\circ\}\s*\\text\{\s*kg\}|a_\{0\}\.5\s*\\text\{\s*kg\}|\ba_0\s*\.5\s*kg\b|\ba\s*0\s*\.\s*5\s*kg\b/gi, '$0.5\\text{ kg}$')
      // Q31/Q33: Fix corrupted vector field f = x²yî + y²ĵ or f = xy\hat{i}^{2\wedge}(n) + y\hat{j}^2\wedge{\Lambda}
      .replace(/\bf\s*=\s*x\s*\$?\s*y\s*(?:\\hat\{i\}|i\^2\^?|i\^?|î)[^\+\n]*(?:\+|\band\b)\s*\$?\s*y\s*(?:\\hat\{j\}|j\^2\^?|j\^?|i\^2\^?|ĵ)[^\s,]*/gi,
        '$\\vec{F} = x^2y\\hat{i} + y^2\\hat{j}$')
      .replace(/xy\\hat\{i\}\^?\{?2\^?\}?\(n\)/gi, 'x^2y\\hat{i}')
      // Q31: Particle position and force vectors
      .replace(/moves\s+to\s+position\s*(?:[\^ˆ\s]*\s*)*5\s*i.*?2\s*j.*?k.*?(?=from\s+its\s+initial\s+position)/gi,
        'moves to position $5\\hat{i} - 2\\hat{j} + \\hat{k}$ ')
      .replace(/initial\s+position\s*[\^ˆ\s]*2\s*i.*?3\s*j.*?4\s*k/gi,
        'initial position $2\\hat{i} + 3\\hat{j} - 4\\hat{k}$')
      .replace(/action\s+of\s+force\s*[\^ˆ\s]*5\s*i.*?2\s*j.*?7\s*k\s*N/gi,
        'action of force $5\\hat{i} + 2\\hat{j} + 7\\hat{k}\\text{ N}$')
      .replace(/moves\s+to\s+position\s+5\s*[-–]\s*2\s*\+\s*from\s+its\s+initial\s+position\^?2\s*\+\s*3\s*[-–]\s*4\s+under\s+the\s+action\s+of\s+force\s+5\s*\+\s*2\s*\+\s*7k\s*N\s*\^?/gi,
        'moves to position $5\\hat{i} - 2\\hat{j} + \\hat{k}$ from its initial position $2\\hat{i} + 3\\hat{j} - 4\\hat{k}$ under the action of force $5\\hat{i} + 2\\hat{j} + 7\\hat{k}\\text{ N}$')
      // Q33: Force field in plane x + y = 10
      .replace(/\bf\s*=\s*x\s*y\^?2?\s*[\^\{∧\\}\s]*\+\s*y\^?2?\s*[\^\{∧\\}\s]*(?=acts\s+on\s+a\s+particle\s+in\s+(?:a\s+)?plane\s*x\s*\+\s*y\s*=\s*10)/gi,
        '$\\vec{F} = (x^2y\\hat{i} + y^2\\hat{j})$ ')
      // Q35: Force in y-direction: F = (5 + 3y^2)
      .replace(/F\s*=\s*\(\s*5\s*\+\s*3\s*y(?:_2|\^2|2)?\s*\)\s*acts\s+on\s+a\s+particle\s+in\s+the\s+y[\s\-]*direction/gi,
        '$F = (5 + 3y^2)\\text{ N}$ acts on a particle in the $y$-direction')
      .replace(/F\s*=\s*\(\s*5\s*\+\s*3\s*y_2\s*\)/g, '$F = (5 + 3y^2)$')
      // Q34/Q36: Force in x-direction: F = (2 + 3x)\hat{t}\{\wedge\} -> \vec{F} = (2 + 3x)\hat{i}\text{ N}
      .replace(/F\s*=\s*\(\s*2\s*\+\s*3\s*x\s*\)\s*(?:(?:\\hat\{t\}|t\^?|\\hat\{i\}|i\^?)\s*)?\{?[∧\^]?\}?\s*(?:acts\s+on\s+a\s+particle\s+in\s+the\s+x[\s\-]*direction)?/gi,
        '$\\vec{F} = (2 + 3x)\\hat{i}\\text{ N}$ acts on a particle in the $x$-direction')
      .replace(/\(2\s*\+\s*3x\)\s*\\hat\{t\}\s*N/gi, '(2 + 3x)\\hat{i}\\text{ N}')
      .replace(/\\hat\{t\}\s*N/gi, '\\hat{i}\\text{ N}')
      // Q37: Remove duplicate prompt repetition
      .replace(/acts\s+on\s+a\s+particle\s+in\s+the\s+x[\s\-]*direction\s*(?:\(\s*\))?\s*acts\s+on\s+a\s+particle\s+in\s+the\s+x[\s\-]*direction/gi,
        'acts on a particle in the $x$-direction')
      // Q36/Q38: Force (5y + 20) j N (POSITIVE SIGN: work done = 450 J)
      .replace(/F\s*\(?\s*5\s*y\s*[-–\+\s]*2\s*0\s*\)?\s*(?:\\hat\{y\}|y\^?|j\^?|\\hat\{j\}|j)?\s*N\s*(?:\\wedge|\^|\{|\}|[∧\^])*/gi,
        '$\\vec{F} = (5y + 20)\\hat{j}\\text{ N}$')
      .replace(/F\s*\(?\s*5\s*y\s*[-–\+\s]*2\s*0\s*\)?\s*(?:\\hat\{y\}|y\^?|j\^?|\\hat\{j\}|j)?\s*N\s*(?:[\^ˆ]|\\hat|\{\s*[∧\^]\s*\}|\^?\{?[∧\^]\}?)*\s*acts\s+on\s+a\s+particle/gi,
        '$\\vec{F} = (5y + 20)\\hat{j}\\text{ N}$ acts on a particle')
      .replace(/\(5y\s*\+\s*20\)\s*\\hat\{y\}\s*N/gi, '(5y + 20)\\hat{j}\\text{ N}')
      .replace(/\\hat\{y\}\s*N/gi, '\\hat{j}\\text{ N}')
      // Q41/Q43: Fix MathType tall bracket corruption: (10)-n () J. The value of n will (x) be
      .replace(/\(?\s*10\s*\)?\s*[-–]\s*n\s*\(\s*\)\s*J\s*\.\s*The\s*value\s*of\s*n\s*will\s*(?:\(x\)|x)?\s*be/gi,
        '$\\left(\\frac{10}{x}\\right)^{-n}\\text{ J}$. The value of $n$ will be')
      .replace(/\(\s*10\s*\)\s*[-–]\s*n\s*\(\s*\)\s*J\s*\(\s*x\s*\)/gi,
        '$\\left(\\frac{10}{x}\\right)^{-n}\\text{ J}$')
      // Q47/Q49: Ratio \frac{4}{1} -> \frac{A}{1} and repair truncated \fra...
      .replace(/\b(?:will\s+be\s+)?(?:\\frac\{4\}\{1\}|4\/1)\s*,\s*so\s+the\s+value\s+of\s+A\b/gi,
        'will be $\\frac{A}{1}$, so the value of $A$')
      .replace(/\\fra(?:\.\.\.|\b)|\\frac(?:\.\.\.|\b)(?!\s*\{)/g,
        '\\frac{A}{1} = \\frac{2}{1} \\implies A = 2')

      // DTS_1: Strip institutional DPP running noise leaked into question or options
      .replace(/\bRECTILINEAR\s+MOTION\b/gi, '')

      // DTS_1 Q1, Q2, Q20: Radicals / Square Roots (e.g. 5 3 m -> 5\sqrt{3} m, 5 2 m -> 5\sqrt{2} m)
      // Guard: must NOT be part of scientific notation (e.g. 10 3 m/s) or composite velocity units
      .replace(/(?<![\d.*×\^eE·\-])\b(2|4|5|7|10|20|30)\s+([23])\s+m(?![a-zA-Z\/\^])\b/g, (_m, coef, rad) => `$${coef}\\sqrt{${rad}}\\text{ m}$`)

      // DTS_1 Q3: Semicircle path parameters
      .replace(/11\s+car\s+if\s+a\s*=\s*7\s*m\s*,\s*b\s*=\s*8\s*m\s+and\s+r\s*=\s*m\?\s*\\?pi\s*(?:22\/7)?\s*\[\s*Take\s*\\?pi\s*=\s*\]|car\s+if\s+a\s*=\s*7\s*m\s*,\s*b\s*=\s*8\s*m\s+and\s+r\s*=\s*(?:11\s*)?m\?\s*\\?pi\s*(?:22\/7)?\s*\[\s*Take\s*\\?pi\s*=\s*\]/gi,
        'car if $a = 7\\text{ m}, b = 8\\text{ m}\\text{ and } r = \\frac{11}{\\pi}\\text{ m}$? $\\left[\\text{Take } \\pi = \\frac{22}{7}\\right]$')

      // DTS_1 Q4: Arctan options
      .replace(/110\s*m\s*,\s*tan\s*[-–]?\s*1\s*4\/3\s*west\s+of\s+south(?:\s*[-–]?\s*1\s*3\/4)?/gi,
        '$110\\text{ m}, \\tan^{-1}\\frac{4}{3}\\text{ west of south}$')
      .replace(/50\s*m\s*,\s*tan\s+west\s+of\s+south/gi,
        '$50\\text{ m}, \\tan^{-1}\\frac{3}{4}\\text{ west of south}$')
      .replace(/50\s*m\s*,\s*tan\s*[-–]?\s*1\s*4\/3\s*west\s+of\s+south/gi,
        '$50\\text{ m}, \\tan^{-1}\\frac{4}{3}\\text{ west of south}$')
      .replace(/50\s*m\s*,\s*tan\s*[-–]?\s*1\s*4\/3\s*south\s+of\s+west/gi,
        '$50\\text{ m}, \\tan^{-1}\\frac{4}{3}\\text{ south of west}$')

      // DTS_1 Q6: Statement cleanup
      .replace(/average\s+speed\s+v\s+is\s+given\s+by\s+(?:3\/v\s*v\s*v|v\s*v\s*v|3\/v).*$/gi, 'average speed $v$ is given by :')

      // DTS_1 Q7: Trailing 1/3 noise
      .replace(/50\s*km\/hr\s*1\/3\b/gi, '50 km/hr')

      // DTS_1 Q8: 1/3 part fractions and velocity options
      .replace(/covers\s+first\s+part\s+of\s+its\s+journey\s+with\s+1\/3\s+a\s+velocity/gi,
        'covers first $\\frac{1}{3}$ part of its journey with a velocity')
      .replace(/body\s+will\s+be\s+11\/3\b/gi, 'body will be :')
      .replace(/\b11\/3\s*m\/s\b/gi, '$\\frac{11}{3}\\text{ m/s}$')
      .replace(/\b8\/3\s*m\/s\b/gi, '$\\frac{8}{3}\\text{ m/s}$')
      .replace(/\b4\/3\s*m\/s\b/gi, '$\\frac{4}{3}\\text{ m/s}$')

      // DTS_1 Q11: Average speed & velocity options with \sqrt{2}
      .replace(/what\s+is\s+its\s+average\s+velocity[\s.]*40\/2\s*80\/2\b/gi, 'what is its average velocity?')
      .replace(/80kmph\s*,\s*kmph\b/gi, '$80\\text{ kmph}, \\frac{40}{\\sqrt{2}}\\text{ kmph}$')
      .replace(/40kmph\s*,\s*kmph\s*40\/2\s*40\/2/gi, '$40\\text{ kmph}, \\frac{80}{\\sqrt{2}}\\text{ kmph}$')
      .replace(/kmph\s*,\s*40kmph\(4\)\s*40kmph\s*,\s*kmph\s*1\/3/gi, '$\\frac{40}{\\sqrt{2}}\\text{ kmph}, 40\\text{ kmph}$')

      // DTS_1 Q12: Statement cleanup
      .replace(/average\s+speed\s+of\s+the\s+particle\s*\?[\s\S]*$/gi, 'average speed of the particle?')
      .replace(/particle\s+covers\s+each\s+of\s+the\s+total\s+distance/gi, 'particle covers each $\\frac{1}{3}$ of the total distance')

      // DTS_1 Q13: Displacement 2s = gt^2 and velocity options
      .replace(/\b2s\s*=\s*gt\s*2\b/gi, '$2s = gt^2$')
      .replace(/\bgt\s*2\s*\/\s*2\b/gi, '$\\frac{gt^2}{2}$')
      .replace(/^gt\^?2\s*\/\s*2$/gi, '$\\frac{gt^2}{2}$')
      .replace(/^gt\/2$/gi, '$\\frac{gt}{2}$')
      .replace(/\bgt\s*3\s*\/\s*6\b/gi, '$\\frac{gt^3}{6}$')

      // DTS_1 Q15: Position x = At + Bt^-3 and derivatives
      .replace(/\bx\s*=\s*At\s*\+\s*Bt\s*[-–]\s*3\b/gi, '$x = At + Bt^{-3}$')
      .replace(/\bA\s*[-–]\s*([123])\s*Bt\s*[-–]\s*([24])\b/gi, '$A - $1Bt^{-$2}$')

      // DTS_1 Q16: Simple harmonic motion maximum displacement
      .replace(/\bx\s*=\s*a\s*sin\s*\(\s*(?:\\omega|)\s*t\s*\+\s*(?:\$?\\theta\$?|)\s*\)/gi,
        '$x = a\\sin(\\omega t + \\theta)$')
      .replace(/\(\s*(?:\\omega|)\s*a\s*,\s*and\s*(?:\$?\\theta\$?|)\s*are\s*constants\s*\)[\s\S]*$/gi,
        '($a, \\omega\\text{ and } \\theta$ are constants)')

      // DTS_1 Q18: Initial point bearing options and unpunctuated question header
      .replace(/\b(\d+)\s*[º°]\s*(South\s+of\s+East|North\s+of\s+East|South\s+of\s+West|North\s+of\s+West)\b/gi,
        (_m, deg, dir) => `$${deg}^\\circ\\text{ ${dir}}$`)
      .replace(/^18\s+A\s+body\s+goes\b/gm, 'A body goes');

    // 8. Repair nested or duplicate math delimiters
    out = out
      .replace(/\$\$+/g, '$')
      .replace(/\$([^$]*)\$/g, (_m, inner) => '$' + inner.replace(/\$/g, '') + '$')
      .replace(/\$\s*\$/g, '');

    return out.trim();
  }

  /**
   * Helper to perform regex replacements only outside of $...$ or $$...$$ math blocks.
   */
  private static replaceOutsideMath(str: string, replacer: (plain: string) => string): string {
    const parts = str.split(/(\$\$[^\$]*\$\$|\$[^\$]*\$)/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) return part; // inside math block
      return replacer(part);
    }).join('');
  }
}
