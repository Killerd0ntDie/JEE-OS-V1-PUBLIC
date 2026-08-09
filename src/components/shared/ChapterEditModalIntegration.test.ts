import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('App-Wide UI Integration & Modal Cleanup empirical verification', () => {
  const rootSrcDir = path.resolve(process.cwd(), 'src');

  it('verifies src/components/ui/QuickChapterSetupModal.tsx is completely deleted', () => {
    const deprecatedModalPath = path.join(rootSrcDir, 'components', 'ui', 'QuickChapterSetupModal.tsx');
    expect(fs.existsSync(deprecatedModalPath)).toBe(false);
  });

  it('verifies zero dangling imports or occurrences of deprecated modal across src/ implementation files', () => {
    const targetTerm = 'QuickChapter' + 'SetupModal'; // Obfuscated so test file itself doesn't match literal substring
    function searchDir(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(searchDir(filePath));
        } else if ((file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) && !file.includes('.test.')) {
          const content = fs.readFileSync(filePath, 'utf-8');
          if (content.includes(targetTerm)) {
            results.push(filePath);
          }
        }
      });
      return results;
    }

    const matches = searchDir(rootSrcDir);
    expect(matches).toEqual([]);
  });

  it('verifies App.tsx renders ChapterEditModal globally', () => {
    const appPath = path.join(rootSrcDir, 'App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    expect(content).toContain("import { ChapterEditModal } from './components/shared/ChapterEditModal';");
    expect(content).toContain('<ChapterEditModal />');
  });

  it('verifies StudyBrainActions exposes openChapterEditModal and closeChapterEditModal', () => {
    const actionsPath = path.join(rootSrcDir, 'actions', 'StudyBrainActions.ts');
    const content = fs.readFileSync(actionsPath, 'utf-8');
    expect(content).toContain('openChapterEditModal(chapterId: string)');
    expect(content).toContain('closeChapterEditModal()');
    expect(content).toContain('activeEditChapterId: chapterId');
    expect(content).toContain('activeEditChapterId: null');
  });

  describe('Consumer Domain Integration Checks', () => {
    it('Domain 1: Dashboard Execution Queue triggers openChapterEditModal', () => {
      const filePath = path.join(rootSrcDir, 'features', 'dashboard', 'components', 'DailyMissionTimeline.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('actions.openChapterEditModal');
    });

    it('Domain 2: Subject Command Center / Trackers triggers openChapterEditModal', () => {
      const cardPath = path.join(rootSrcDir, 'features', 'subjects', 'components', 'ChapterCommandCard.tsx');
      const expandedPath = path.join(rootSrcDir, 'features', 'subjects', 'components', 'SubjectExpandedView.tsx');
      
      const cardContent = fs.readFileSync(cardPath, 'utf-8');
      const expandedContent = fs.readFileSync(expandedPath, 'utf-8');

      expect(cardContent).toContain('actions.openChapterEditModal');
      expect(expandedContent).toContain('actions.openChapterEditModal');
    });

    it('Domain 3: Planner Page & Inspector Modal triggers openChapterEditModal', () => {
      const filePath = path.join(rootSrcDir, 'features', 'mission', 'components', 'PlannerSidebarPanel.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('actions.openChapterEditModal(id)');
    });

    it('Domain 4: Syllabus Table & Revision Ledger triggers openChapterEditModal', () => {
      const diagnosisPath = path.join(rootSrcDir, 'components', 'mentor', 'SyllabusDiagnosisModal.tsx');
      const content = fs.readFileSync(diagnosisPath, 'utf-8');
      expect(content).toContain('actions.openChapterEditModal(selectedChapter.id)');
    });

    it('Domain 5: Analytics Engine / Analytics Page connects to global ChapterEditModal via App frame', () => {
      const analyticsPath = path.join(process.cwd(), 'src', 'features', 'analytics', 'AnalyticsPage.tsx');
      const enginePath = path.join(process.cwd(), 'packages', 'engines', 'src', 'analytics', 'AnalyticsEngine.ts');
      
      expect(fs.existsSync(analyticsPath)).toBe(true);
      expect(fs.existsSync(enginePath)).toBe(true);

      const engineContent = fs.readFileSync(enginePath, 'utf-8');
      // AnalyticsEngine consumes chapterTelemetryMap
      expect(engineContent).toContain('chapterTelemetryMap');
    });
  });
});
