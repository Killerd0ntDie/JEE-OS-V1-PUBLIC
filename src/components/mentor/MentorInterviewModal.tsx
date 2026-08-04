import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Modal } from '@/components/ui/Modal';
import { Sparkles, X, Check } from 'lucide-react';

import { useMentorInterviewForm } from './hooks/useMentorInterviewForm';
import { OrientationStep } from './steps/OrientationStep';
import { AcademicTargetsStep } from './steps/AcademicTargetsStep';
import { ClassAndSetupStep } from './steps/ClassAndSetupStep';
import { SubjectStrategyStep } from './steps/SubjectStrategyStep';
import { RealityAuditStep } from './steps/RealityAuditStep';
import { RoadmapLockStep } from './steps/RoadmapLockStep';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean;
}

export const MentorInterviewModal: React.FC<Props> = ({ isOpen, onClose, isMandatory = false }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useLockBodyScroll(isOpen);
  useFocusTrap(modalRef, isOpen);
  
  const handleClose = () => {
    if (!isMandatory && onClose) onClose();
  };
  
  useEscapeKey(handleClose, isOpen);

  const formState = useMentorInterviewForm(onClose);
  const { step, setStep } = formState;

  const stepTitles = [
    'Orientation',
    'Academic Targets',
    'Class & Setup',
    'Subject Strategy',
    'Reality Audit',
    'Roadmap Lock'
  ];

  return (

        <Modal isOpen={isOpen} onClose={handleClose} zIndex={50} backdropClassName="p-4 overflow-y-auto" className="relative w-full max-w-3xl bg-[#090a0f]/95 border border-indigo-500/25 rounded-3xl shadow-[0_0_80px_rgba(79,70,229,0.2)] overflow-hidden my-6 text-left flex flex-col max-h-[90vh] focus:outline-none">
            {/* Modern Glowing Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-950/40 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      AI MENTOR DIAGNOSTIC
                    </span>
                    <span className="text-xs font-mono text-zinc-500">Step {step} of 6</span>
                  </div>
                  <h2 id="mentor-interview-modal-title" className="text-base font-display font-bold text-white tracking-tight mt-0.5">
                    Personalized JEE Preparation Roadmap
                  </h2>
                </div>
              </div>

              {!isMandatory && onClose && (
                <button 
                  onClick={handleClose}
                  aria-label="Close Diagnostic Modal"
                  className="w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modern Step Progress Indicator */}
            <div className="px-6 py-3 bg-[#06070a] border-b border-zinc-800/60 shrink-0">
              <div className="grid grid-cols-6 gap-2">
                {stepTitles.map((title, idx) => {
                  const num = idx + 1;
                  const isActive = step === num;
                  const isCompleted = step > num;
                  return (
                    <button
                      key={num}
                      onClick={() => step > num && setStep(num)}
                      disabled={step < num}
                      className={`flex flex-col gap-1 text-left transition-all ${step > num ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-110'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                        }`}>
                          {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : num}
                        </div>
                        <div className={`h-1 flex-1 rounded-full transition-all ${
                          isCompleted ? 'bg-emerald-500/60' : isActive ? 'bg-indigo-500' : 'bg-zinc-800'
                        }`} />
                      </div>
                      <span className={`text-[10px] font-mono truncate transition-all ${
                        isActive ? 'text-indigo-300 font-bold' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'
                      }`}>
                        {title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {step === 1 && <OrientationStep setStep={setStep} />}
              {step === 2 && (
                <AcademicTargetsStep
                  setStep={setStep}
                  selectedExams={formState.selectedExams}
                  toggleExam={formState.toggleExam}
                  targetYear={formState.targetYear}
                  setTargetYear={formState.setTargetYear}
                  targetRank={formState.targetRank}
                  setTargetRank={formState.setTargetRank}
                  targetCollege={formState.targetCollege}
                  setTargetCollege={formState.setTargetCollege}
                  targetBranch={formState.targetBranch}
                  setTargetBranch={formState.setTargetBranch}
                />
              )}
              {step === 3 && (
                <ClassAndSetupStep
                  setStep={setStep}
                  currentClass={formState.currentClass}
                  setCurrentClass={formState.setCurrentClass}
                  coachingType={formState.coachingType}
                  setCoachingType={formState.setCoachingType}
                  coachingName={formState.coachingName}
                  setCoachingName={formState.setCoachingName}
                  dailyHours={formState.dailyHours}
                  setDailyHours={formState.setDailyHours}
                />
              )}
              {step === 4 && (
                <SubjectStrategyStep
                  setStep={setStep}
                  subjectSplitStrategy={formState.subjectSplitStrategy}
                  setSubjectSplitStrategy={formState.setSubjectSplitStrategy}
                />
              )}
              {step === 5 && (
                <RealityAuditStep
                  setStep={setStep}
                  completedCount={formState.completedCount}
                  inProgressCount={formState.inProgressCount}
                  notStartedCount={formState.notStartedCount}
                  activeAuditSubject={formState.activeAuditSubject}
                  setActiveAuditSubject={formState.setActiveAuditSubject}
                  searchQuery={formState.searchQuery}
                  setSearchQuery={formState.setSearchQuery}
                  groupedByUnit={formState.groupedByUnit}
                  chapterReality={formState.chapterReality}
                  handleRealityChange={formState.handleRealityChange}
                />
              )}
              {step === 6 && (
                <RoadmapLockStep
                  setStep={setStep}
                  selectedExams={formState.selectedExams}
                  targetYear={formState.targetYear}
                  targetCollege={formState.targetCollege}
                  targetBranch={formState.targetBranch}
                  targetRank={formState.targetRank}
                  dailyHours={formState.dailyHours}
                  currentClass={formState.currentClass}
                  subjectSplitStrategy={formState.subjectSplitStrategy}
                  completedCount={formState.completedCount}
                  inProgressCount={formState.inProgressCount}
                  notStartedCount={formState.notStartedCount}
                  isSubmitting={formState.isSubmitting}
                  handleFinishInterview={formState.handleFinishInterview}
                />
              )}
            </div>
          </Modal>

  );
};
