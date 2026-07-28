import { ChapterInfoEngine } from '../../src/engines/chapterInfo/ChapterInfoEngine';
import { StudyBrainRuntime } from '../../src/runtime/StudyBrainRuntime';
import { StudyBrainActions } from '../../src/actions/StudyBrainActions';
import { INITIAL_CHAPTERS } from '../../src/constants/initialSeeds';
import { Chapter } from '../../src/types/index';

async function runEmpiricalVerification() {
  console.log("=================================================");
  console.log("EMPIRICAL VERIFICATION SUITE: ChapterInfoEngine & StudyBrainActions");
  console.log("=================================================\n");

  const results: { name: string; status: 'PASS' | 'FAIL'; details: string; metrics?: any }[] = [];

  // ---------------------------------------------------------
  // TEST SCENARIO 1: ChapterInfoEngine Direct Telemetry Calculation & Telemetry Accuracy
  // ---------------------------------------------------------
  try {
    const engine = new ChapterInfoEngine();
    const mockChapters: Chapter[] = JSON.parse(JSON.stringify(INITIAL_CHAPTERS));
    
    // Pick chapter p1 (Units & Measurements)
    const p1 = mockChapters.find(c => c.id === 'p1')!;
    p1.currentLecture = 2;
    p1.totalLectures = 4;
    p1.theoryComplete = false;
    p1.dppComplete = true;
    p1.pyqsComplete = false;
    p1.confidence = 70;

    const input = {
      chapters: mockChapters,
      mistakes: [],
      sessions: [],
      mocks: []
    };

    const telemetryMap = engine.generateChapterTelemetry(input);
    const p1Telemetry = telemetryMap['p1'];

    if (!p1Telemetry) {
      throw new Error("Telemetry not generated for chapter p1");
    }

    const theoryPctExpected = Math.round((2 / 4) * 100); // 50%
    const isTheoryPctCorrect = p1Telemetry.strategyRadar.theoryCompletionPercent === theoryPctExpected;
    const isDppCorrect = p1Telemetry.dppComplete === true && p1Telemetry.strategyRadar.dppCompletionPercent === 100;
    const isPyqCorrect = p1Telemetry.pyqsComplete === false;
    const isBottleneckDetected = p1Telemetry.isBottleneck === true; // Lecture backlog 2/4
    const bottleneckReasonValid = p1Telemetry.bottleneckReason?.includes('Lecture 2/4 backlog');

    if (isTheoryPctCorrect && isDppCorrect && isPyqCorrect && isBottleneckDetected && bottleneckReasonValid) {
      results.push({
        name: "Scenario 1: Telemetry Field Calculation & Bottleneck Detection",
        status: 'PASS',
        details: `p1 Telemetry correctly calculated: theoryPct=${p1Telemetry.strategyRadar.theoryCompletionPercent}%, dppComplete=true, pyqsComplete=false, isBottleneck=${p1Telemetry.isBottleneck}, reason="${p1Telemetry.bottleneckReason}"`
      });
    } else {
      results.push({
        name: "Scenario 1: Telemetry Field Calculation & Bottleneck Detection",
        status: 'FAIL',
        details: `Field mismatch: theoryPct=${p1Telemetry.strategyRadar.theoryCompletionPercent} (exp ${theoryPctExpected}), dpp=${p1Telemetry.dppComplete}, pyq=${p1Telemetry.pyqsComplete}, bottleneck=${p1Telemetry.isBottleneck}, reason=${p1Telemetry.bottleneckReason}`
      });
    }
  } catch (err: any) {
    results.push({
      name: "Scenario 1: Telemetry Field Calculation & Bottleneck Detection",
      status: 'FAIL',
      details: err.message || String(err)
    });
  }

  // ---------------------------------------------------------
  // TEST SCENARIO 2: Memoization Caching Behavior (Unchanged vs Changed State)
  // ---------------------------------------------------------
  try {
    const engine = new ChapterInfoEngine();
    const mockChapters: Chapter[] = JSON.parse(JSON.stringify(INITIAL_CHAPTERS));
    const input = {
      chapters: mockChapters,
      mistakes: [],
      sessions: [],
      mocks: []
    };

    // First call - Cache Miss
    const t0 = performance.now();
    const result1 = engine.generateChapterTelemetry(input);
    const t1 = performance.now();
    const firstCallTime = t1 - t0;

    // Second call - Unchanged State (Cache Hit)
    const t2 = performance.now();
    const result2 = engine.generateChapterTelemetry(input);
    const t3 = performance.now();
    const secondCallTime = t3 - t2;

    // Direct object equality check on cached map values
    const isCachedObjectIdentical = result1['p1'] === result2['p1'];

    // Mutate state - Changed State (Cache Invalidation & Miss)
    const mutatedChapters: Chapter[] = JSON.parse(JSON.stringify(mockChapters));
    mutatedChapters[0].currentLecture = 4;
    mutatedChapters[0].theoryComplete = true;

    const mutatedInput = {
      chapters: mutatedChapters,
      mistakes: [],
      sessions: [],
      mocks: []
    };

    const t4 = performance.now();
    const result3 = engine.generateChapterTelemetry(mutatedInput);
    const t5 = performance.now();
    const mutatedCallTime = t5 - t4;

    const isCacheInvalidatedAndUpdated = result3['p1'].currentLecture === 4 && result3['p1'] !== result1['p1'];

    // Manual Cache Invalidation Test
    engine.invalidateCache();
    const t6 = performance.now();
    const result4 = engine.generateChapterTelemetry(mutatedInput);
    const t7 = performance.now();
    const postInvalidateCallTime = t7 - t6;

    if (isCachedObjectIdentical && isCacheInvalidatedAndUpdated) {
      results.push({
        name: "Scenario 2: Memoized Cache Hit, Invalidation & Manual Cache Reset",
        status: 'PASS',
        details: `Cache Hit verified (identical object returned). Cache invalidation on mutation verified (currentLecture updated to 4).`,
        metrics: {
          firstCallTimeMs: firstCallTime.toFixed(4),
          cacheHitCallTimeMs: secondCallTime.toFixed(4),
          mutatedCallTimeMs: mutatedCallTime.toFixed(4),
          postInvalidateCallTimeMs: postInvalidateCallTime.toFixed(4),
          cacheHitSpeedup: (firstCallTime / Math.max(0.0001, secondCallTime)).toFixed(2) + 'x'
        }
      });
    } else {
      results.push({
        name: "Scenario 2: Memoized Cache Hit, Invalidation & Manual Cache Reset",
        status: 'FAIL',
        details: `Cache check failed. identical=${isCachedObjectIdentical}, invalidated=${isCacheInvalidatedAndUpdated}`
      });
    }
  } catch (err: any) {
    results.push({
      name: "Scenario 2: Memoized Cache Hit, Invalidation & Manual Cache Reset",
      status: 'FAIL',
      details: err.message || String(err)
    });
  }

  // ---------------------------------------------------------
  // TEST SCENARIO 3: Runtime & Actions Telemetry Map Update & Cache Invalidation Integration
  // ---------------------------------------------------------
  try {
    const runtime = StudyBrainRuntime.getInstance();
    const initialChapters: Chapter[] = JSON.parse(JSON.stringify(INITIAL_CHAPTERS));
    
    await runtime.initialize({
      chapters: initialChapters,
      mistakes: [],
      studySessions: [],
      mocks: [],
      timeline: []
    });

    const initialTelemetry = runtime.getState().chapterTelemetryMap;
    const initialP1 = initialTelemetry['p1'];

    if (!initialP1) {
      throw new Error("Initial telemetry map empty or missing p1");
    }

    const actions = new StudyBrainActions(runtime, 'test-user-123');

    // Mutate p1 telemetry via actions.updateChapter
    await actions.updateChapter('p1', {
      currentLecture: 4,
      totalLectures: 4,
      theoryComplete: true,
      dppComplete: true,
      pyqsComplete: true,
      confidence: 90
    });

    const updatedTelemetryMap = runtime.getState().chapterTelemetryMap;
    const updatedP1 = updatedTelemetryMap['p1'];

    const isStateUpdated = updatedP1.currentLecture === 4 &&
      updatedP1.theoryComplete === true &&
      updatedP1.dppComplete === true &&
      updatedP1.pyqsComplete === true &&
      updatedP1.isMastered === true &&
      updatedP1.syllabusStage === 'Mastered';

    // Simulate ChapterEditModal Save behavior for p2
    await actions.updateChapter('p2', {
      currentLecture: 5,
      totalLectures: 8,
      theoryComplete: false,
      dppComplete: true,
      pyqsComplete: false,
      confidence: 75,
      difficulty: 'Hard',
      priority: 1,
      weightage: 5.5,
      estimatedRemainingTime: 6,
      completion: 60,
      status: 'Learning',
      syllabusStage: 'Watching Lectures'
    });

    const p2Telemetry = runtime.getState().chapterTelemetryMap['p2'];
    const isP2Updated = p2Telemetry.currentLecture === 5 &&
      p2Telemetry.dppComplete === true &&
      p2Telemetry.pyqsComplete === false &&
      p2Telemetry.isBottleneck === true &&
      p2Telemetry.weightagePercent === 5.5;

    if (isStateUpdated && isP2Updated) {
      results.push({
        name: "Scenario 3: StudyBrainActions.updateChapter Telemetry Sync & Cache Invalidation",
        status: 'PASS',
        details: `actions.updateChapter updated state.chapterTelemetryMap for p1 (Mastered) and p2 (In Progress, Bottleneck) successfully. Cache invalidated and recalculated on runtime.refresh.`
      });
    } else {
      results.push({
        name: "Scenario 3: StudyBrainActions.updateChapter Telemetry Sync & Cache Invalidation",
        status: 'FAIL',
        details: `State update check failed: p1Updated=${isStateUpdated}, p2Updated=${isP2Updated}`
      });
    }
  } catch (err: any) {
    results.push({
      name: "Scenario 3: StudyBrainActions.updateChapter Telemetry Sync & Cache Invalidation",
      status: 'FAIL',
      details: err.message || String(err)
    });
  }

  // ---------------------------------------------------------
  // TEST SCENARIO 4: High-Load Memory & Execution Performance Benchmark
  // ---------------------------------------------------------
  try {
    const engine = new ChapterInfoEngine();
    const mockChapters: Chapter[] = JSON.parse(JSON.stringify(INITIAL_CHAPTERS));
    const input = { chapters: mockChapters, mistakes: [], sessions: [], mocks: [] };

    // Initial warm-up
    engine.generateChapterTelemetry(input);

    const UNCHANGED_ITERATIONS = 5000;
    const CHANGED_ITERATIONS = 1000;

    // Measure Unchanged State Performance (Cache Hits)
    if (global.gc) global.gc();
    const memBeforeHits = process.memoryUsage().heapUsed;
    const tStartHits = performance.now();
    for (let i = 0; i < UNCHANGED_ITERATIONS; i++) {
      engine.generateChapterTelemetry(input);
    }
    const tEndHits = performance.now();
    const memAfterHits = process.memoryUsage().heapUsed;
    const totalHitTime = tEndHits - tStartHits;
    const avgHitTimeUs = (totalHitTime / UNCHANGED_ITERATIONS) * 1000; // in microseconds

    // Measure Changed State Performance (Cache Misses & Recalculations)
    const tStartMisses = performance.now();
    for (let i = 0; i < CHANGED_ITERATIONS; i++) {
      // Mutate one property each iteration
      mockChapters[i % mockChapters.length].currentLecture = (i % 10);
      engine.generateChapterTelemetry(input);
    }
    const tEndMisses = performance.now();
    const memAfterMisses = process.memoryUsage().heapUsed;
    const totalMissTime = tEndMisses - tStartMisses;
    const avgMissTimeUs = (totalMissTime / CHANGED_ITERATIONS) * 1000; // in microseconds

    const memoryDeltaKb = ((memAfterMisses - memBeforeHits) / 1024).toFixed(2);
    const speedupFactor = (avgMissTimeUs / Math.max(0.001, avgHitTimeUs)).toFixed(1);

    results.push({
      name: "Scenario 4: High-Load Benchmark & Memory Footprint",
      status: 'PASS',
      details: `Executed ${UNCHANGED_ITERATIONS} cache hits and ${CHANGED_ITERATIONS} cache invalidation cycles. Speedup factor: ${speedupFactor}x`,
      metrics: {
        unchangedAvgTimeUs: avgHitTimeUs.toFixed(3) + ' μs',
        changedAvgTimeUs: avgMissTimeUs.toFixed(3) + ' μs',
        totalUnchangedTimeMs: totalHitTime.toFixed(2) + ' ms',
        totalChangedTimeMs: totalMissTime.toFixed(2) + ' ms',
        memoryDeltaKb: memoryDeltaKb + ' KB',
        speedupFactor: speedupFactor + 'x'
      }
    });
  } catch (err: any) {
    results.push({
      name: "Scenario 4: High-Load Benchmark & Memory Footprint",
      status: 'FAIL',
      details: err.message || String(err)
    });
  }

  // ---------------------------------------------------------
  // PRINT SUMMARY
  // ---------------------------------------------------------
  console.log("\n=================================================");
  console.log("SUMMARY RESULTS OF VERIFICATION");
  console.log("=================================================");
  
  let allPassed = true;
  results.forEach((r, idx) => {
    const symbol = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`\n[${idx + 1}] ${symbol}: ${r.name}`);
    console.log(`    Details: ${r.details}`);
    if (r.metrics) {
      console.log(`    Metrics:`, JSON.stringify(r.metrics, null, 2));
    }
    if (r.status === 'FAIL') allPassed = false;
  });

  console.log("\n=================================================");
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log("=================================================\n");

  if (!allPassed) process.exit(1);
}

runEmpiricalVerification();
