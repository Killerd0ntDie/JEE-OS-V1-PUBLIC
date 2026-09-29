
import { MockTest } from '@/types/mockTest';
import { SubjectId, Chapter } from '@/types/index';
import { MockGeneratorMode } from '../../services/MockTestGeneratorService';
import { MockTestGeneratorStudio } from '../MockTestGeneratorStudio';
import { UploadPyqPaperModal } from '../UploadPyqPaperModal';
import { UploadDppModal } from '../UploadDppModal';
import { PrintableTestPaperModal } from '../PrintableTestPaperModal';
import { ExamBriefingModal } from '../ExamBriefingModal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

interface MockModalsContainerProps {
  showStudio: boolean;
  onCloseStudio: () => void;
  onTestGeneratedFromStudio: (test: MockTest) => void;
  onOpenPyqFromStudio: () => void;
  studioInitialMode: MockGeneratorMode;
  studioInitialSubject?: SubjectId;
  showPyqPaperModal: boolean;
  onClosePyqPaperModal: () => void;
  onPyqTestCreated: (test: MockTest) => void;
  showDppModal: boolean;
  onCloseDppModal: () => void;
  onDppTestCreated: (test: MockTest) => void;
  dppInitialSubject?: SubjectId;
  dppInitialChapterId?: string;
  dppInitialChapterName?: string;
  selectedTestForPrint: MockTest | null;
  onClosePrintModal: () => void;
  selectedTestForBriefing: MockTest | null;
  onConfirmStartExam: (test: MockTest) => void;
  onCancelBriefing: () => void;
  testToDelete: string | null;
  onCloseDeleteModal: () => void;
  onConfirmDeleteTest: () => void;
  isConfirmDeleteChapterTestsOpen: boolean;
  onCloseDeleteChapterTestsModal: () => void;
  onConfirmDeleteChapterTests: () => void;
  activeChapter: Chapter | null;
  customChapterTestsCount: number;
}

export function MockModalsContainer({
  showStudio,
  onCloseStudio,
  onTestGeneratedFromStudio,
  onOpenPyqFromStudio,
  studioInitialMode,
  studioInitialSubject,
  showPyqPaperModal,
  onClosePyqPaperModal,
  onPyqTestCreated,
  showDppModal,
  onCloseDppModal,
  onDppTestCreated,
  dppInitialSubject,
  dppInitialChapterId,
  dppInitialChapterName,
  selectedTestForPrint,
  onClosePrintModal,
  selectedTestForBriefing,
  onConfirmStartExam,
  onCancelBriefing,
  testToDelete,
  onCloseDeleteModal,
  onConfirmDeleteTest,
  isConfirmDeleteChapterTestsOpen,
  onCloseDeleteChapterTestsModal,
  onConfirmDeleteChapterTests,
  activeChapter,
  customChapterTestsCount
}: MockModalsContainerProps) {
  return (
    <>
      <MockTestGeneratorStudio
        isOpen={showStudio}
        onClose={onCloseStudio}
        onTestGenerated={onTestGeneratedFromStudio}
        onOpenPyqUploader={onOpenPyqFromStudio}
        initialMode={studioInitialMode}
        initialSubject={studioInitialSubject}
      />

      <UploadPyqPaperModal
        isOpen={showPyqPaperModal}
        onClose={onClosePyqPaperModal}
        onTestCreated={onPyqTestCreated}
      />

      <UploadDppModal
        isOpen={showDppModal}
        onClose={onCloseDppModal}
        onTestCreated={onDppTestCreated}
        initialSubject={dppInitialSubject}
        initialChapterId={dppInitialChapterId}
        initialChapterName={dppInitialChapterName}
      />

      {selectedTestForPrint && (
        <PrintableTestPaperModal
          isOpen={!!selectedTestForPrint}
          onClose={onClosePrintModal}
          test={selectedTestForPrint}
        />
      )}

      {selectedTestForBriefing && (
        <ExamBriefingModal
          isOpen={!!selectedTestForBriefing}
          test={selectedTestForBriefing}
          onConfirm={handleConfirmStartExam(selectedTestForBriefing)}
          onCancel={onCancelBriefing}
        />
      )}

      {testToDelete && (
        <ConfirmDeleteModal
          isOpen={!!testToDelete}
          onClose={onCloseDeleteModal}
          onConfirm={onConfirmDeleteTest}
          title="Delete Mock Test"
          message="Are you sure you want to delete this custom test? This action cannot be undone."
        />
      )}

      {isConfirmDeleteChapterTestsOpen && activeChapter && (
        <ConfirmDeleteModal
          isOpen={isConfirmDeleteChapterTestsOpen}
          onClose={onCloseDeleteChapterTestsModal}
          onConfirm={onConfirmDeleteChapterTests}
          title={`Delete All Tests for ${activeChapter.name}?`}
          message={`Are you sure you want to permanently delete all ${customChapterTestsCount} custom tests and DPP worksheets created for this chapter? Default curriculum seeds and official mock papers will remain unaffected.`}
          confirmLabel={`Delete All (${customChapterTestsCount})`}
        />
      )}
    </>
  );

  function handleConfirmStartExam(test: MockTest) {
    return () => onConfirmStartExam(test);
  }
}
