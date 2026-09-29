import { GoogleGenAI } from '@google/genai';
import {
  SectionQuestionsResponseSchema,
  Stage1SkeletonResponseSchema,
  QuestionsListResponseSchema
} from './geminiSchemas';
import { sanitizeQuestionsList, backfillAnswersFromKey } from './questionSanitizer';

export interface PyqPaperHandlerDeps {
  resolveGeminiApiKey: (req: any) => string;
  repairTruncatedJson: (str: string) => any;
  safeGetText: (resp: any, fallback: string) => string;
  generateWithFallback: (ai: any, contents: any, config: any) => Promise<any>;
}

export async function handlePyqPaperParse(req: any, res: any, deps: PyqPaperHandlerDeps) {
  const { resolveGeminiApiKey, repairTruncatedJson, safeGetText, generateWithFallback } = deps;

  try {
    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey && !process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unavailable. GEMINI_API_KEY is not configured." });
    }

    const { rawText, pdfBase64, paperTitle, targetSubject, isDpp, chapterName } = req.validatedBody;
    const docType = isDpp ? "Coaching Daily Practice Problem (DPP) Worksheet" : "Previous Year Question Paper (PYQ)";

    const ai = apiKey ? new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 180000, headers: { 'User-Agent': 'aistudio-build' } }
    }) : null;

    // Analyze rawText to detect section structure, question count target, and answer key
    let sectionInfo = '';
    let answerKeyInfo = '';
    let promptRawText = '';

    if (rawText) {
      // Count questions across document
      const qMatches = [...rawText.matchAll(/(?:\bQ\d{1,3}\]|(?:^|\s+)Q\d{1,3}\b|\[Q\d{1,3}\]|(?:\n|\r)\s*\d{1,3}\s*[:.\-)])/gi)];
      const totalQEstimate = qMatches.length;

      // Parse per-section question count breakdown from Answer Key if present
      const keyMatch = rawText.match(/(?:ANSWER\s*KEY|KEY\s*SHEET|SOLUTIONS)[\s\S]*$/i);
      const answerKeySections: { section: string; questionCount: number }[] = [];
      if (keyMatch) {
        const keyText = keyMatch[0];
        const sectionHeaderRegex = /\b(Level\s*[-–]?\s*\d+|SINGLE\s+CORRECT|MTOC|MULTIPLE\s+CORRECT|INTEGER\s+TYPE|NUMERICAL\s+VALUE|SECTION\s+[A-Z]|PART\s+[A-Z])\b/gi;
        const headers: { name: string; index: number }[] = [];
        let m: RegExpExecArray | null;
        while ((m = sectionHeaderRegex.exec(keyText)) !== null) {
          headers.push({ name: m[1].replace(/\s+/g, ' ').trim(), index: m.index });
        }
        for (let i = 0; i < headers.length; i++) {
          const cur = headers[i];
          const nextIndex = i + 1 < headers.length ? headers[i + 1].index : keyText.length;
          const chunk = keyText.substring(cur.index, nextIndex);
          const qNums = [...chunk.matchAll(/\b(\d{1,3})\s*\]/g)].map(x => parseInt(x[1], 10));
          const maxQ = qNums.length > 0 ? Math.max(...qNums) : 0;
          if (maxQ > 0) {
            answerKeySections.push({ section: cur.name, questionCount: maxQ });
          }
        }
      }

      const totalFromKey = answerKeySections.reduce((sum, s) => sum + s.questionCount, 0);
      const finalTargetCount = Math.max(totalQEstimate, totalFromKey);

      if (finalTargetCount >= 15) {
        let sectionListStr = '';
        if (answerKeySections.length > 0) {
          sectionListStr = answerKeySections.map(s => `- Section: ${s.section} (Q1 to Q${s.questionCount}, total ${s.questionCount} questions)`).join('\n');
        }

        sectionInfo = `
CRITICAL TARGET - COMPLETE MULTI-SECTION EXTRACTION:
- Total questions to extract: ${finalTargetCount} questions across all sections.
${sectionListStr ? `Document Section Structure:\n${sectionListStr}` : ''}
- Note: Question numbering often restarts at Q1 in each new section (e.g. Level-1: Q1-40, Level-2 Single Correct: Q1-20, Level-2 MTOC: Q1-20, Integer Type: Q1-10).
- CRITICAL: You MUST extract ALL questions from EVERY section above (all ${finalTargetCount} questions)!
- Do NOT skip any section! Extract every question completely through to the end of the document before the Answer Key!`;
      }

      if (keyMatch) {
        answerKeyInfo = `DOCUMENT ANSWER KEY REFERENCE (LOCATED AT END OF DOCUMENT):\n"""\n${keyMatch[0].substring(0, 6000)}\n"""`;
      }

      if (!pdfBase64) {
        promptRawText = rawText;
        if (promptRawText.length > 55000) {
          promptRawText = promptRawText.substring(0, 40000) + "\n\n... [INTERMEDIATE QUESTIONS OMITTED] ...\n\n--- [END OF DOCUMENT / ANSWER KEY SECTION] ---\n" + promptRawText.substring(promptRawText.length - 15000);
        }
      }
    }

    // Detect multi-section document structure (e.g. Level 1, Level 2, MTOC, Integer Type)
    const multiSections: { name: string; text: string }[] = [];
    if (rawText) {
      const keyMatch = rawText.match(/(?:ANSWER\s*KEY|KEY\s*SHEET|SOLUTIONS)[\s\S]*$/i);
      const keyIndex = keyMatch ? keyMatch.index : rawText.length;
      const mainText = rawText.substring(0, keyIndex).trim();
      const markerRegex = /\b(SINGLE\s+CORRECT(?:\s+QUESTIONS)?|MULTIPLE\s+CORRECT(?:\s+QUESTIONS)?|NUMERICAL\s+(?:VALUE|TYPE)(?:\s+QUESTIONS)?|INTEGER\s+TYPE(?:\s+QUESTIONS)?|MATCH\s+THE\s+COLUMN|LEVEL\s*[-–]\s*0?[1-5]|MTOC|PART\s*[-–]\s*[IVX\d]+(?:\s*:[^\n]+)?|SECTION\s*[-–]\s*[A-Z\d]+(?:\s*:[^\n]+)?|EXERCISE\s*[-–]\s*0?[1-5](?:\s*[[(]?[A-Z][\])]?)?(?:\s*:[^\n]+)?|BRAIN\s+TEASERS|CHECK\s+YOUR\s+GRASP|CONCEPTUAL\s+SUBJECTIVE|PREVIOUS\s+YEAR\s+QUESTIONS|MISCELLANEOUS\s+TYPE)\b/gi;
      const matches = [...mainText.matchAll(markerRegex)];

      if (matches.length >= 2) {
        const filteredMatches: RegExpExecArray[] = [];
        for (let i = 0; i < matches.length; i++) {
          const cur = matches[i];
          const curName = cur[0].replace(/\s+/g, ' ').toUpperCase().trim();
          const prev = filteredMatches[filteredMatches.length - 1];
          if (prev) {
            const prevName = prev[0].replace(/\s+/g, ' ').toUpperCase().trim();
            if (curName === prevName && (cur.index - prev.index) < 4000) {
              continue;
            }
          }
          filteredMatches.push(cur);
        }

        if (filteredMatches.length >= 2) {
          for (let i = 0; i < filteredMatches.length; i++) {
            const cur = filteredMatches[i];
            const nextIndex = (i + 1 < filteredMatches.length) ? filteredMatches[i + 1].index : mainText.length;
            const textChunk = mainText.substring(cur.index, nextIndex).trim();
            if (textChunk.length > 50) {
              multiSections.push({
                name: cur[0].replace(/\s+/g, ' ').toUpperCase().trim(),
                text: textChunk
              });
            }
          }
        }
      } else {
        const qBlockRegex = /(?:^|\n|\r|\s{2,})(?=(?:\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\])]*|\[\s*\d{1,3}\s*\]|(?:\n|\r)\s*\d{1,3}\s*[:.\-\])]))/i;
        const blocks = mainText.split(qBlockRegex).map(b => b.trim()).filter(b => b.length > 15);
        if (blocks.length >= 20) {
          console.log(`[Batch Parser] Detected ${blocks.length} questions in un-partitioned document. Partitioning into 15-question batches...`);
          const chunkSize = 15;
          for (let c = 0; c < blocks.length; c += chunkSize) {
            const batchNum = Math.floor(c / chunkSize) + 1;
            const totalBatches = Math.ceil(blocks.length / chunkSize);
            multiSections.push({
              name: `Batch ${batchNum} of ${totalBatches} (Q.${c + 1} - Q.${Math.min(c + chunkSize, blocks.length)})`,
              text: blocks.slice(c, c + chunkSize).join('\n\n')
            });
          }
        }
      }
    }

    if (multiSections.length >= 2) {
      console.log(`[Multi-Section Parser] Partitioned DPP into ${multiSections.length} sections: ${multiSections.map(s => s.name).join(', ')}. Extracting...`);
      let allQuestions: any[] = [];

      for (const sec of multiSections) {
        console.log(`[Multi-Section Parser] Processing section: ${sec.name} (${sec.text.length} chars)...`);
        const qBlockRegex = /(?:\r?\n)+(?=(?:\[?\s*Q(?:uestion)?\.?\s*\d+\s*[:.\-\])]*|\[\s*\d{1,3}\s*\]|\d{1,3}\s*[:.\-\])]\s+))/i;
        const secBlocks = sec.text.split(qBlockRegex).map(b => b.trim()).filter(b => b.length > 5);

        const chunkSize = 15;
        const chunks: string[] = [];
        if (secBlocks.length > chunkSize) {
          for (let c = 0; c < secBlocks.length; c += chunkSize) {
            chunks.push(secBlocks.slice(c, c + chunkSize).join('\n\n'));
          }
        } else {
          chunks.push(sec.text);
        }

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
          const chunkText = chunks[chunkIdx];
          const batchLabel = chunks.length > 1 ? `Batch ${chunkIdx + 1} of ${chunks.length}` : 'Full Section';
          console.log(`[Multi-Section Parser] Section ${sec.name} -> ${batchLabel} (${chunkText.length} chars)...`);

          const secPrompt = `
          You are an elite IIT-JEE question paper digitizer, academic curriculum expert, and multimodal document analyst.
          Extract ALL valid questions present in this section: "${sec.name}" (${batchLabel}).
          CRITICAL: Extract every single question in this batch completely without stopping early or skipping!

          Target Document Title: ${paperTitle || (isDpp ? 'Coaching DPP Worksheet' : 'JEE Previous Year Paper')}
          Target Subject: ${targetSubject || 'all (Physics, Chemistry, and Mathematics)'}
          ${chapterName ? `Chapter Focus: ${chapterName}` : ''}

          SECTION TEXT CONTENT:
          """
          ${chunkText}
          """

          ${answerKeyInfo ? `${answerKeyInfo}\n` : ''}

          INSTRUCTIONS:
          1. Extract ALL questions from this section into structured JSON.
          2. For each question:
             - subject: strictly one of "physics", "chemistry", or "mathematics" (all lowercase).
             - topic: chapter or topic name (e.g. "${chapterName || 'General'}").
             - type: "MCQ" if options exist, or "NUMERICAL" if integer or numerical value.
             - content: question statement formatted with LaTeX ($inline$ or $$block$$). NEVER use ( or ).
             - options: exactly 4 options for MCQ (ids: "A", "B", "C", "D"), empty array [] for NUMERICAL.
             - ANSWER DETERMINATION & FIRST-PRINCIPLES SOLVING PROTOCOL:
               * FIRST: Check if an Answer Key is available at the end of the section or document.
               * SECOND: If an answer key is absent, unconfirmed, or incomplete, YOU MUST SOLVE THE QUESTION FROM FIRST PRINCIPLES using rigorous IIT-JEE academic knowledge.
               * CRITICAL FOR "ONE OR MORE THAN ONE OPTIONS CORRECT" / MULTI-CORRECT QUESTIONS:
                 - You MUST set type: "MULTI".
                 - The 4 options (A), (B), (C), (D) MUST be the 4 actual statements given in the question!
                 - Evaluate EVERY statement (A), (B), (C), (D) independently from first principles.
                 - Concatenate ALL correct option letters alphabetically into "correctAnswer" (e.g. "ACD", "AC", "BC", "AB").
                 - Set solution.correctOptionIds to the array of correct letters (e.g. ["A", "C", "D"]).
                 - In the step-by-step derivation under "**Conclusion & Correct Option**", explicitly state which statements are correct and why.
                 - NEVER default to a single letter like "A" or "0" for multi-correct questions!
                 - NEVER drop the statements, and NEVER synthesize dummy combination options like "(A), (C), (D)", "(A), (C)"!
                 - If a question is Single Correct with statements (A)-(E) followed by combination choices like "(1) B and E only", keep ALL statements in question content, and extract the 4 combination choices (1)-(4) as options (A)-(D)!
             - solution: { text: "Step-by-step derivation with distinct sections separated by double newlines:\n\n**Key Concept & Formula**: Governing formula in LaTeX ($...$ or $$...$$).\n\n**Step 1**: Step derivation and equations with all variables formatted in LaTeX ($...$).\n\n**Step 2**: Intermediate calculations and substitutions in LaTeX ($...$).\n\n**Conclusion & Correct Option**: Final answer and option letter or numerical value." }
          3. Strip question prefixes like "Q1]" or "1." from the start of question content, BUT ALWAYS PRESERVE localQuestionNumber with the exact original printed question number (1, 2, 3...)!
          4. Preserve full mathematical values in options without stripping leading numbers. NEVER drop comparison operators like '<', '>', 'le', 'ge' (e.g. '> 120^circ' or '$< 109^circ 28'$' or '$\theta_1 > \theta_3$').
          5. LATEX, CHEMISTRY, AND DIAGRAM FORMATTING:
             - CRITICAL: NEVER wrap natural language English sentences in \\text{...}! Keep English prose in normal plain text, and wrap variables, formulas, chemical equations, bond angles, and symbols in $ ... $.
             - Format ALL mathematical symbols, variables, formulas, and equations in LaTeX ($...$ or $$...$$).
             - Format orbital subshells with subscripts (e.g. $p_x - p_x$, $p_pi - p_pi$, $p_pi - d_pi$, $d_{xy} - d_{xy}$).
             - Format chemical ions and formulas in LaTeX (e.g. $\\text{SO}_4^{2-}$, $\\text{CO}_3^{2-}$, $\\text{NO}_3^-$).
             - DIAGRAM DETECTION & METADATA:
               * hasDiagram: set true if this question contains or references a graphical visual diagram, apparatus, circuit, graph, curve, or molecular 2D/3D structure drawing in the PDF!
               * diagramPage: the 1-indexed page number of the PDF where the visual diagram is located.
               * diagramDescription: A concise description of what the visual illustration depicts.
               * When options in the PDF depict chemical structures, Lewis drawings, or graphs labeled (A), (B), (C), (D):
                 Set hasDiagram: true and set options to: [{ "id": "A", "text": "(A)" }, { "id": "B", "text": "(B)" }, { "id": "C", "text": "(C)" }, { "id": "D", "text": "(D)" }].
               * localQuestionNumber: The exact number printed on the page for this question.
               * sectionName: The section or part title header if present.
             - For Match The Column (MTOC) questions, format columns and mappings cleanly.
             - For Integer / Numerical Type questions, format given values, formulas, and final values in LaTeX.
          6. EXPLANATION STRUCTURE:
             - Every explanation MUST begin with "**Key Concept & Formula**" followed by the core formula or theorem.
             - Follow with "**Step 1**", "**Step 2**", and conclude with "**Conclusion & Correct Option**".
          `;

          const secContents: any[] = [{ text: secPrompt }];

          try {
            const secResponse = await generateWithFallback(ai, secContents, {
              req,
              responseMimeType: "application/json",
              temperature: 0.1,
              maxOutputTokens: 65536,
              thinkingConfig: { thinkingLevel: 'LOW' },
              responseSchema: SectionQuestionsResponseSchema
            });

            const secText = safeGetText(secResponse, "{}").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            const parsedSec = repairTruncatedJson(secText);
            if (Array.isArray(parsedSec.questions)) {
              console.log(`[Multi-Section Parser] Section ${sec.name} (${batchLabel}) extracted ${parsedSec.questions.length} questions.`);
              allQuestions = allQuestions.concat(parsedSec.questions);
            }
          } catch (secErr) {
            console.warn(`[Multi-Section Parser] Section ${sec.name} (${batchLabel}) extraction encountered an error:`, secErr);
          }
        }
      }

      if (allQuestions.length > 0) {
        const sanitized = sanitizeQuestionsList(allQuestions);
        backfillAnswersFromKey(sanitized, rawText);
        return res.json({
          title: paperTitle || (isDpp ? 'Coaching DPP Worksheet' : 'JEE Question Paper'),
          questions: sanitized
        });
      }
    }

    // Two-Stage AI Prompt Architecture for Standard / Full-Document Papers
    let skeletonList = [];
    let detectedTitle = paperTitle || (isDpp ? 'Coaching DPP Worksheet' : 'JEE Previous Year Paper');

    const stage1Prompt = `
    You are an expert IIT-JEE document layout and question paper analyzer.
    Analyze this ${docType} and extract ONLY the structural skeleton index of ALL questions present in the document.
    CRITICAL: Return the complete checklist of questions across ALL sections (Level 1, Level 2, MTOC, Integer Type, PART-I, PART-II, PART-III).
    DO NOT extract lengthy solutions, KaTeX derivations, or detailed answer prose in this stage! Focus purely on structural indexing.

    Target Document Title: ${paperTitle || (isDpp ? 'Coaching DPP Worksheet' : 'JEE Question Paper')}
    Target Subject: ${targetSubject || 'all (Physics, Chemistry, and Mathematics)'}
    ${chapterName ? `Chapter Focus: ${chapterName}` : ''}
    ${sectionInfo ? `${sectionInfo}\n` : ''}
    ${promptRawText ? `DOCUMENT TEXT CONTENT:\n"""\n${promptRawText.slice(0, 35000)}\n"""\n` : ''}

    INSTRUCTIONS:
    1. Identify EVERY question in the document without skipping intermediate questions.
    2. For each question provide:
       - qIndex: 1-based global sequential index (1, 2, 3, 4...)
       - localQuestionNumber: printed number on the page
       - sectionName: section/part header if present
       - subject: strictly one of "physics", "chemistry", or "mathematics" (lowercase)
       - type: "MCQ" if multiple-choice options exist, or "NUMERICAL" if integer/decimal value
       - hasDiagram: set true if this question depicts or references a visual illustration, 2D/3D molecular structure drawing, circuit, graph, curve, or physical apparatus in the PDF.
       - diagramPage: 1-indexed page number of the diagram in the PDF
       - diagramDescription: short description of what the visual diagram depicts
       - rawSnippet: the first 50-80 characters of the question statement for exact identification.
    `;

    const shouldRunStage1 = !isDpp && !req.body.singleStage;

    if (shouldRunStage1) {
      const stage1Contents = [];
      if (pdfBase64) {
        stage1Contents.push({
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64
          }
        });
      }
      stage1Contents.push({ text: stage1Prompt });

      try {
        const stage1Response = await generateWithFallback(ai, stage1Contents, {
          req,
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 16384,
          thinkingConfig: { thinkingLevel: 'LOW' },
          responseSchema: Stage1SkeletonResponseSchema
        });

        const stage1Text = safeGetText(stage1Response, "{}").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const stage1Parsed = repairTruncatedJson(stage1Text);
        if (stage1Parsed?.title) detectedTitle = stage1Parsed.title;
        if (Array.isArray(stage1Parsed?.skeleton) && stage1Parsed.skeleton.length > 0) {
          skeletonList = stage1Parsed.skeleton;
          console.log(`[Two-Stage Parser] Stage 1 skeleton extracted ${skeletonList.length} questions successfully.`);
        }
      } catch (stage1Err) {
        console.warn(`[Two-Stage Parser] Stage 1 fast skeleton extraction failed or skipped, falling back directly to single-pass generation:`, stage1Err);
      }
    } else {
      console.log(`[Fast Parser] Single-stage token saver mode active: Skipping Stage 1 skeleton to conserve API tokens and prevent 429 quota exhaustion.`);
    }

    // Stage 2: Deep Content, LaTeX Formatting, Clean Options, and Verified Solutions
    const skeletonContext = skeletonList.length > 0
      ? `VERIFIED QUESTION SKELETON CHECKLIST (${skeletonList.length} Questions):\n"""\n${JSON.stringify(skeletonList, null, 2)}\n"""\nCRITICAL REQUIREMENT: You MUST generate full question content and solutions for EVERY question in this verified checklist! Do NOT drop any question.`
      : '';

    const prompt = `
    You are an elite IIT-JEE question paper digitizer, academic curriculum expert, and multimodal document analyst.
    ${pdfBase64 ? 'You are provided with the original PDF document attached as multimodal inline document input. Visually analyze all pages, 2D mathematical layouts, diagrams, graphs, and formatting with highest visual precision.' : ''}
    Extract, parse, and structure questions from this ${docType}.

    Target Document Title: ${detectedTitle}
    Target Subject: ${targetSubject || 'all (Physics, Chemistry, and Mathematics)'}
    ${chapterName ? `Chapter Focus: ${chapterName}` : ''}

    ${skeletonContext ? `${skeletonContext}\n` : ''}
    ${sectionInfo ? `${sectionInfo}\n` : ''}
    ${answerKeyInfo ? `${answerKeyInfo}\n` : ''}
    ${promptRawText ? `DOCUMENT TEXT CONTENT:\n"""\n${promptRawText}\n"""\n` : ''}

    INSTRUCTIONS:
    1. Parse ALL valid questions from the document across ALL sections/parts.
    2. For each question:
       - Identify subject: strictly one of "physics", "chemistry", or "mathematics" (all lowercase).
       - Identify topic/chapter.
       - Identify type: "MCQ", "MULTI", or "NUMERICAL".
       - Format question content in LaTeX ($inline$ or $$block$$). NEVER use ( or ).
       - MULTIMODAL 2D MATH, CHEMICAL STRUCTURES & FORMULAS.
       - DIAGRAMS: specify hasDiagram, diagramPage, diagramBbox, diagramDescription.
       - If options are drawings/structures labeled (A)-(D), use text: "(A)", "(B)", "(C)", "(D)".
       - PROSE & LATEX: Double-escape backslashes in JSON, never wrap English words in \\text{...}.
       - ANSWER DETERMINATION: Check headerless answer keys; solve from first principles if absent.
       - MULTI: Evaluate all statements, concatenate sorted letters (e.g. "ACD").
       - STEP-BY-STEP EXPLANATION FORMAT: Key Concept & Formula, Step 1, Step 2, Conclusion & Correct Option.

    OUTPUT FORMAT:
    Return valid JSON matching the schema.
    `;

    const contents = [];
    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      });
    }
    contents.push({ text: prompt });

    const response = await generateWithFallback(ai, contents, {
      req,
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 65536,
      thinkingConfig: {
        thinkingBudget: 4096
      },
      responseSchema: QuestionsListResponseSchema
    });

    const text = safeGetText(response, "{}").replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    let parsed: any;
    try {
      parsed = repairTruncatedJson(text);
    } catch (e) {
      console.error("Failed to parse PYQ paper JSON from AI even with recovery:", e);
      throw new Error("AI generated malformed JSON for paper.");
    }

    if (Array.isArray(parsed.questions)) {
      parsed.questions = sanitizeQuestionsList(parsed.questions);
      backfillAnswersFromKey(parsed.questions, rawText);
    }

    res.json(parsed);
  } catch (error) {
    console.error("PYQ Paper Parse API error:", error);
    res.status(500).json({ error: "Internal server error during PYQ paper parsing" });
  }
}
