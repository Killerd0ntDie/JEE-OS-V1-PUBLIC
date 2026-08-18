import React from 'react';
import { Modal } from '@/components/ui/Modal';
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

  if (!chapterId) return null;

  return (
    
      <Modal isOpen={isOpen} onClose={onClose} zIndex={999} backdropClassName="bg-black/10 backdrop-blur-md animate-fade-in p-2 sm:p-6 text-left" className="w-full h-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-zinc-800 glass-panel">
          <QuestionViewerWidget
            chapterId={chapterId}
            subject={subject}
            onExitPractice={onClose}
          />
        </Modal>
    
  );
};
