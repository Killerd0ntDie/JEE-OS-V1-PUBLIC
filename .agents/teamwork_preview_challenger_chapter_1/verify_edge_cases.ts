import { ChapterInfoEngine } from '../../src/engines/chapterInfo/ChapterInfoEngine';
import { INITIAL_CHAPTERS } from '../../src/constants/initialSeeds';
import { Chapter, Mistake } from '../../src/types/index';

async function verifyEdgeCases() {
  console.log("=================================================");
  console.log("ADVERSARIAL STRESS TEST: Edge Cases & InputHash Invalidation");
  console.log("=================================================\n");

  const engine = new ChapterInfoEngine();
  const mockChapters: Chapter[] = JSON.parse(JSON.stringify(INITIAL_CHAPTERS));
  
  const m1: Mistake = {
    id: 'm1',
    chapter: 'Units & Measurements',
    subject: 'physics',
    topic: 'Dimensional Analysis',
    questionText: 'Test Question',
    correctAnswer: 'A',
    userAnswer: 'B',
    errorType: 'Conceptual Error',
    revisionStatus: 'Reviewing',
    createdAt: new Date().toISOString()
  };

  const input1 = {
    chapters: mockChapters,
    mistakes: [m1],
    sessions: [],
    mocks: []
  };

  const res1 = engine.generateChapterTelemetry(input1);
  const p1_unresolved_before = res1['p1'].unresolvedMistakesCount;

  // Change mistake status from Reviewing to Mastered (length remains 1)
  const m1_updated: Mistake = { ...m1, revisionStatus: 'Mastered' };
  const input2 = {
    chapters: mockChapters,
    mistakes: [m1_updated],
    sessions: [],
    mocks: []
  };

  const res2 = engine.generateChapterTelemetry(input2);
  const p1_unresolved_after = res2['p1'].unresolvedMistakesCount;

  console.log(`Mistake status changed from 'Reviewing' to 'Mastered' (length stays 1):`);
  console.log(`  Unresolved Count in Telemetry Before: ${p1_unresolved_before}`);
  console.log(`  Unresolved Count in Telemetry After:  ${p1_unresolved_after}`);

  if (p1_unresolved_before === 1 && p1_unresolved_after === 1) {
    console.log(`  ⚠️ FINDING CONFIRMED: Cache returned stale data because computeInputHash only includes mistakes.length!`);
  } else {
    console.log(`  Cache invalidated correctly.`);
  }

  // Also test runtime refresh on MISTAKE_UPDATE
  console.log("\nTesting chapter weightage boundaries:");
  mockChapters[0].weightage = 7.0; // Tier 1
  const res3 = engine.generateChapterTelemetry({ chapters: mockChapters, mistakes: [], sessions: [], mocks: [] });
  console.log(`  Weightage 7.0 Rank: ${res3['p1'].strategyRadar.jeeWeightageRank}`);

  mockChapters[0].weightage = 2.0; // Tier 3
  const res4 = engine.generateChapterTelemetry({ chapters: mockChapters, mistakes: [], sessions: [], mocks: [] });
  console.log(`  Weightage 2.0 Rank: ${res4['p1'].strategyRadar.jeeWeightageRank}`);
}

verifyEdgeCases();
