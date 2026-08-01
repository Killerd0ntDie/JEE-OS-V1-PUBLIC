import React from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { QuestionViewerWidget } from '@/features/mission/components/QuestionViewerWidget';

interface AiPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string | null;
  subject: string;
}

export const AiPracticeModal: React.FC<AiPracticeModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  subject
}) => {
  useEscapeKey(onClose, isOpen);

  if (!isOpen || !chapterId) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-2 sm:p-6 text-left">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AI Practice Questions Modal"
          className="w-full h-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-[#09090b] border border-zinc-800"
        >
          <QuestionViewerWidget
            chapterId={chapterId}
            subject={subject}
            onExitPractice={onClose}
          />
        </div>
      </div>
    </ModalPortal>
  );
};
