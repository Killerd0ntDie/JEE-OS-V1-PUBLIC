
import { motion } from 'motion/react';
import { 
  Atom, FlaskConical, Calculator, Search, Zap, Sparkles, BookOpen, 
  FileUp, ChevronRight, ArrowLeft, Trash2, FileText, GraduationCap, Target 
} from 'lucide-react';
import { MockTest } from '@/types/mockTest';
import { SubjectId, Chapter } from '@/types/index';
import { MockTestCard } from '../MockTestCard';
import { isTestForChapter } from '../../utils/mockTestCategorization';

interface SubjectChaptersDirectoryProps {
  currentSubject: SubjectId;
  currentSubjectChapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapterId: (id: string | null) => void;
  chapterSearchQuery: string;
  onChapterSearchChange: (q: string) => void;
  selectedUnit: string;
  onSelectedUnitChange: (u: string) => void;
  availableUnits: string[];
  filteredChapters: Chapter[];
  activeChapter: Chapter | null;
  allAvailableTests: MockTest[];
  activeChapterTests: MockTest[];
  chapterTestFilter: 'all' | 'dpp' | 'drill' | 'official';
  onChapterTestFilterChange: (f: 'all' | 'dpp' | 'drill' | 'official') => void;
  chapterFilterCounts: { all: number; dpp: number; drill: number; official: number };
  testSearchQuery: string;
  onTestSearchQueryChange: (q: string) => void;
  customChapterTests: MockTest[];
  attemptStatsByTest: Map<string, any>;
  customMockTests: MockTest[];
  onStartTest: (test: MockTest) => void;
  onPrintTest: (test: MockTest) => void;
  onDeleteTest: (testId: string) => void;
  onOpenStudioForChapter: (subject: SubjectId, chapterId: string) => void;
  onOpenDppForChapter: (subject: SubjectId, chapterId?: string, chapterName?: string) => void;
  onOpenStudioForSubjectSprint: (subject: SubjectId) => void;
  onRequestDeleteAllChapterTests: () => void;
  navigate: any;
}

export function SubjectChaptersDirectory({
  currentSubject,
  currentSubjectChapters,
  selectedChapterId,
  onSelectChapterId,
  chapterSearchQuery,
  onChapterSearchChange,
  selectedUnit,
  onSelectedUnitChange,
  availableUnits,
  filteredChapters,
  activeChapter,
  allAvailableTests,
  activeChapterTests,
  chapterTestFilter,
  onChapterTestFilterChange,
  chapterFilterCounts,
  testSearchQuery,
  onTestSearchQueryChange,
  customChapterTests,
  attemptStatsByTest,
  customMockTests,
  onStartTest,
  onPrintTest,
  onDeleteTest,
  onOpenStudioForChapter,
  onOpenDppForChapter,
  onOpenStudioForSubjectSprint,
  onRequestDeleteAllChapterTests,
  navigate
}: SubjectChaptersDirectoryProps) {
  return (
    <motion.div
      key={`pcm-${currentSubject}-${selectedChapterId || 'dir'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="space-y-5">
        {/* SUB-VIEW 3A: CHAPTERS DIRECTORY (Default for PCM subjects) */}
        {!selectedChapterId && (
          <>
            {/* Subject Hero Header Bar */}
            <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  currentSubject === 'physics'
                    ? 'bg-sky-950/60 border-sky-800/60 text-sky-400'
                    : currentSubject === 'chemistry'
                    ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                    : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-400'
                }`}>
                  {currentSubject === 'physics' && <Atom className="w-5 h-5" />}
                  {currentSubject === 'chemistry' && <FlaskConical className="w-5 h-5" />}
                  {currentSubject === 'maths' && <Calculator className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white font-display capitalize">
                      {currentSubject} Chapters
                    </h2>
                    <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                      {currentSubjectChapters.length} Chapters
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Select any chapter below to inspect targeted practice tests, coaching DPPs, or generate custom drills.
                  </p>
                </div>
              </div>

              {/* Filter & Sprint Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={chapterSearchQuery}
                    onChange={(e) => onChapterSearchChange(e.target.value)}
                    placeholder={`Search ${currentSubject} chapters...`}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                  />
                </div>

                {/* Unit filter */}
                {availableUnits.length > 0 && (
                  <select
                    value={selectedUnit}
                    onChange={(e) => onSelectedUnitChange(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none font-mono"
                  >
                    <option value="all" className="bg-zinc-900">All Units</option>
                    {availableUnits.map(unit => (
                      <option key={unit} value={unit} className="bg-zinc-900">{unit}</option>
                    ))}
                  </select>
                )}

                {/* Subject sprint shortcut */}
                <button
                  onClick={() => onOpenStudioForSubjectSprint(currentSubject)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    currentSubject === 'physics'
                      ? 'bg-zinc-900 text-sky-300 border-zinc-800 hover:bg-zinc-850'
                      : currentSubject === 'chemistry'
                      ? 'bg-zinc-900 text-emerald-300 border-zinc-850 hover:bg-zinc-850'
                      : 'bg-zinc-900 text-indigo-300 border-zinc-850 hover:bg-zinc-850'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Subject Sprint (25 Qs)</span>
                </button>
              </div>
            </div>

            {/* Chapters Full-Width List */}
            <div className="flex flex-col gap-3 w-full">
              {filteredChapters.map(chapter => {
                const testsForChapter = allAvailableTests.filter(t => isTestForChapter(t, chapter.name, currentSubject, chapter.id));
                const weightageNum = chapter.weightage ?? 4;
                const approxQs = Math.max(1, Math.round(weightageNum / 3.3));
                const isHighYield = chapter.priority === 1;

                return (
                  <div
                    key={chapter.id}
                    onClick={() => onSelectChapterId(chapter.id)}
                    className="group relative w-full bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Metadata, Title, Stats & Progress Bar */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                        {isHighYield && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700/50 text-amber-300 flex items-center gap-1 shrink-0">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            <span>High Yield (P1)</span>
                          </span>
                        )}

                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                          chapter.difficulty === 'Hard'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/50'
                            : chapter.difficulty === 'Medium'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                            : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                        }`}>
                          {chapter.difficulty || 'Medium'}
                        </span>

                        <span className="text-zinc-500 uppercase tracking-wider font-semibold">
                          {chapter.unit || 'Core Unit'}
                        </span>

                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400">
                          Weightage: {weightageNum}% (~{approxQs} Qs)
                        </span>

                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400">
                          {chapter.solvedQuestions ?? 0} Qs Solved
                        </span>

                        {chapter.pyqsComplete ? (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-emerald-400 font-medium">✓ PYQs Done</span>
                          </>
                        ) : (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-500">PYQs Pending</span>
                          </>
                        )}

                        {chapter.revisionStage && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-sky-400 font-medium">{chapter.revisionStage}</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-zinc-100 group-hover:text-white font-display transition-colors truncate">
                        {chapter.name}
                      </h3>

                      {/* Syllabus Completion bar & Confidence */}
                      <div className="flex items-center gap-3 max-w-md">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              currentSubject === 'physics' ? 'bg-sky-400' : currentSubject === 'chemistry' ? 'bg-emerald-400' : 'bg-indigo-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, chapter.completion || 0))}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                          {chapter.completion || 0}% Mastery
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                          • {chapter.confidence ?? chapter.completion ?? 0}% Confidence
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800/80 shrink-0">
                      <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800">
                        <BookOpen className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400" />
                        <span>{testsForChapter.length} {testsForChapter.length === 1 ? 'Test' : 'Tests'}</span>
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDppForChapter(currentSubject, chapter.id, chapter.name);
                        }}
                        title="Upload DPP for this chapter"
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-mono font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <FileUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Upload DPP</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenStudioForChapter(currentSubject, chapter.id);
                        }}
                        title="Quick Drill Generator"
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Drill</span>
                      </button>

                      <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all hidden sm:block" />
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredChapters.length === 0 && (
              <div className="bg-zinc-900/40 rounded-2xl p-12 text-center border border-zinc-800/80">
                <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-zinc-300 font-display">No Chapters Match "{chapterSearchQuery}"</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Try searching for a different keyword or reset unit filter.
                </p>
              </div>
            )}
          </>
        )}

        {/* SUB-VIEW 3B: DRILLED-DOWN CHAPTER TESTS */}
        {selectedChapterId && activeChapter && (
          <div className="space-y-5">
            {/* Breadcrumb & Navigation Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => onSelectChapterId(null)}
                className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-850 px-3.5 py-1.5 rounded-xl border border-zinc-800 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span>Back to {currentSubject.toUpperCase()} Chapters</span>
              </button>

              <div className="text-xs font-mono text-zinc-400">
                {currentSubject.toUpperCase()} &gt; {activeChapter.unit}
              </div>
            </div>

            {/* Chapter Hero Summary Banner */}
            <div className="bg-zinc-900/50 rounded-2xl p-5 sm:p-6 border border-zinc-800/80 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                      {activeChapter.unit || 'Core Unit'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                      {activeChapter.completion || 0}% Mastery
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-2">
                    {activeChapter.name}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Practice tests, high-yield concept workouts, and uploaded DPP worksheets for this chapter.
                  </p>
                </div>

                {/* Chapter Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => onOpenStudioForChapter(currentSubject, activeChapter.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Generate Chapter Drill (15 Qs)</span>
                  </button>

                  <button
                    onClick={() => onOpenDppForChapter(currentSubject, activeChapter.id, activeChapter.name)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <FileUp className="w-4 h-4 text-emerald-400" />
                    <span>Upload DPP</span>
                  </button>

                  {customChapterTests.length > 0 && (
                    <button
                      onClick={onRequestDeleteAllChapterTests}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-rose-100 transition-all cursor-pointer"
                      title={`Delete all ${customChapterTests.length} custom tests for this chapter`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete All Tests ({customChapterTests.length})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chapter Test Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => onChapterTestFilterChange('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    chapterTestFilter === 'all'
                      ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-855 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <span>All Tests</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                    {chapterFilterCounts.all}
                  </span>
                </button>
                <button
                  onClick={() => onChapterTestFilterChange('dpp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    chapterTestFilter === 'dpp'
                      ? 'bg-emerald-950/60 text-emerald-200 border-emerald-700/60 shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-855 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>Coaching DPPs</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    {chapterFilterCounts.dpp}
                  </span>
                </button>
                <button
                  onClick={() => onChapterTestFilterChange('drill')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    chapterTestFilter === 'drill'
                      ? 'bg-indigo-950/60 text-indigo-200 border-indigo-700/60 shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-855 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <Zap className="w-3 h-3 text-indigo-400" />
                  <span>AI Drills</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                    {chapterFilterCounts.drill}
                  </span>
                </button>
                <button
                  onClick={() => onChapterTestFilterChange('official')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    chapterTestFilter === 'official'
                      ? 'bg-amber-950/60 text-amber-200 border-amber-700/60 shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-855 hover:bg-zinc-850 hover:text-zinc-200'
                  }`}
                >
                  <GraduationCap className="w-3 h-3 text-amber-400" />
                  <span>Official PYQs</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                    {chapterFilterCounts.official}
                  </span>
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testSearchQuery}
                  onChange={(e) => onTestSearchQueryChange(e.target.value)}
                  placeholder="Search chapter tests..."
                  className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
                />
              </div>
            </div>

            {/* Chapter Test Cards List */}
            <div className="flex flex-col gap-3 w-full">
              {activeChapterTests.map(test => (
                <MockTestCard
                  key={test.id}
                  test={test}
                  attemptStats={attemptStatsByTest.get(test.id) || attemptStatsByTest.get(test.name)}
                  onStart={onStartTest}
                  onPrint={onPrintTest}
                  onDelete={onDeleteTest}
                  isCustom={customMockTests.some(t => t.id === test.id)}
                  navigate={navigate}
                />
              ))}
            </div>

            {/* Empty state for chapter */}
            {activeChapterTests.length === 0 && (
              <div className="bg-zinc-900/40 rounded-2xl p-10 text-center border border-zinc-800/80 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-indigo-400">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white font-display">No Custom Drills for {activeChapter.name} Yet</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    Generate a targeted 15-question AI drill or upload a coaching DPP worksheet to practice this chapter.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => onOpenStudioForChapter(currentSubject, activeChapter.id)}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
                  >
                    Generate 15-Q Drill
                  </button>
                  <button
                    onClick={() => onOpenDppForChapter(currentSubject, activeChapter.id, activeChapter.name)}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 transition-all cursor-pointer"
                  >
                    Upload Coaching DPP
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
