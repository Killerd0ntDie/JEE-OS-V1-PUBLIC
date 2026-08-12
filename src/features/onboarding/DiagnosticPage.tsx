import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useStudyBrainStore } from '@/store/useStudyBrainStore';

import { useMentorInterviewForm } from '@/components/mentor/hooks/useMentorInterviewForm';
import { OrientationStep } from '@/components/mentor/steps/OrientationStep';
import { AcademicTargetsStep } from '@/components/mentor/steps/AcademicTargetsStep';
import { ClassAndSetupStep } from '@/components/mentor/steps/ClassAndSetupStep';
import { SubjectStrategyStep } from '@/components/mentor/steps/SubjectStrategyStep';
import { RealityAuditStep } from '@/components/mentor/steps/RealityAuditStep';
import { RoadmapLockStep } from '@/components/mentor/steps/RoadmapLockStep';

export const DiagnosticPage: React.FC = () => {
  const navigate = useNavigate();
  const mentorProfile = useStudyBrainStore(s => s.mentorProfile);
  
  // If the profile is incomplete, it's mandatory, so they can't close it directly
  const isMandatory = !mentorProfile?.interviewCompleted;

  const handleClose = () => {
    if (!isMandatory) {
      navigate('/dashboard');
    }
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  const formState = useMentorInterviewForm(handleFinish);
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
    <div className="flex-1 bg-[#090a0f] text-white flex flex-col min-h-[100dvh] overflow-hidden focus:outline-none">
      <div className="relative w-full mx-auto text-left flex flex-col h-full">
        

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
      </div>
    </div>
  );
};
