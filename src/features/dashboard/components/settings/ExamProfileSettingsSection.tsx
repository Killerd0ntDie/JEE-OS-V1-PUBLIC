import React from 'react';
import { Target } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface ExamProfileSettingsSectionProps {
  targetYear: string;
  dreamIit: string;
  targetBranch: string;
  targetYearOptions: { value: string; label: string }[];
  targetInstituteOptions: { value: string; label: string }[];
  targetBranchOptions: { value: string; label: string }[];
  onChange: (key: string, value: any) => void;
}

export const ExamProfileSettingsSection: React.FC<ExamProfileSettingsSectionProps> = ({
  targetYear,
  dreamIit,
  targetBranch,
  targetYearOptions,
  targetInstituteOptions,
  targetBranchOptions,
  onChange
}) => {
  return (
    <div className="bg-zinc-900/90 border border-white/15 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl text-left relative z-30 overflow-visible">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
          <Target className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-white tracking-tight">
            Academic Targets & Exam Horizon
          </h3>
          <p className="text-xs text-zinc-400 font-sans">
            Defines target year metrics, dream IIT benchmark, and branch priority.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <CustomSelect
          id="targetYear"
          label="Target Exam Year"
          value={targetYear}
          options={targetYearOptions}
          onChange={(val) => onChange('targetYear', val)}
        />

        <CustomSelect
          id="dreamIit"
          label="Dream Institute / Goal"
          value={dreamIit}
          options={targetInstituteOptions}
          onChange={(val) => onChange('dreamIit', val)}
        />

        <CustomSelect
          id="targetBranch"
          label="Target Branch / Focus"
          value={targetBranch}
          options={targetBranchOptions}
          onChange={(val) => onChange('targetBranch', val)}
        />
      </div>
    </div>
  );
};
