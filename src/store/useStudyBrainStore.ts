import { create } from 'zustand';
import { StudyBrainRuntime, StudyBrainState } from '@/runtime/StudyBrainRuntime';
import { StudyBrainActions } from '@/actions/StudyBrainActions';

export type StudyBrainStoreState = StudyBrainState & {
  actions: StudyBrainActions;
  setState: (newState: Partial<StudyBrainState>) => void;
  syncFromRuntime: (newState: StudyBrainState) => void;
  setActions: (actions: StudyBrainActions) => void;
};

export const useStudyBrainStore = create<StudyBrainStoreState>((set) => {
  const runtime = StudyBrainRuntime.getInstance();
  const actions = new StudyBrainActions(runtime, 'guest');
  
  // Fix: Subscribe to runtime to avoid race conditions and desync
  runtime.subscribe((newState) => {
    set(newState);
  });
  
  return {
    ...runtime.getState(),
    actions,
    setState: (newState) => {
      runtime.updateStateOptimistic(newState);
      // The subscription callback above will automatically update Zustand
    },
    syncFromRuntime: (newState) => set(newState),
    setActions: (actions) => set({ actions }),
  };
});
