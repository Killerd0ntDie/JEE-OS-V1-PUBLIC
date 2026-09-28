import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { StudyBrainRuntime, StudyBrainState } from '@/runtime/StudyBrainRuntime';
import { StudyBrainActions } from '@/actions/StudyBrainActions';

export { useShallow };

export type StudyBrainStoreState = StudyBrainState & {
  actions: StudyBrainActions;
  setState: (newState: Partial<StudyBrainState>) => void;
  syncFromRuntime: (newState: StudyBrainState) => void;
  setActions: (actions: StudyBrainActions) => void;
  unsubscribeRuntime: () => void;
};

export const useStudyBrainStore = create<StudyBrainStoreState>((set) => {
  const runtime = StudyBrainRuntime.getInstance();
  const actions = new StudyBrainActions(runtime, 'guest');
  
  // Directly subscribe to runtime so Zustand store is always synchronized
  const unsubscribe = runtime.subscribe((newState) => {
    set(newState);
  });

  return {
    ...runtime.getState(),
    actions,
    setState: (newState) => {
      runtime.updateStateOptimistic(newState);
    },
    syncFromRuntime: (newState) => set(newState),
    setActions: (actions) => set({ actions }),
    unsubscribeRuntime: unsubscribe,
  };
});
