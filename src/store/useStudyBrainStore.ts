import { create } from 'zustand';
import { StudyBrainRuntime, StudyBrainState } from '@/runtime/StudyBrainRuntime';
import { StudyBrainActions } from '@/actions/StudyBrainActions';

export type StudyBrainStoreState = StudyBrainState & {
  actions: StudyBrainActions;
  setState: (newState: Partial<StudyBrainState>) => void;
  setActions: (actions: StudyBrainActions) => void;
};

export const useStudyBrainStore = create<StudyBrainStoreState>((set) => {
  const runtime = StudyBrainRuntime.getInstance();
  return {
    ...runtime.getState(),
    actions: new StudyBrainActions(runtime, 'guest'),
    setState: (newState) => set((state) => ({ ...state, ...newState })),
    setActions: (actions) => set({ actions }),
  };
});
