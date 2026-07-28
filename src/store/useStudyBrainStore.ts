import { create } from 'zustand';
import { StudyBrainRuntime, StudyBrainState } from '../runtime/StudyBrainRuntime';
import { StudyBrainActions } from '../actions/StudyBrainActions';

export interface StudyBrainStoreState {
  state: StudyBrainState | null;
  actions: StudyBrainActions | null;
  setState: (newState: StudyBrainState) => void;
  setActions: (actions: StudyBrainActions) => void;
}

export const useStudyBrainStore = create<StudyBrainStoreState>((set) => {
  const runtime = StudyBrainRuntime.getInstance();
  return {
    state: runtime.getState(),
    actions: new StudyBrainActions(runtime, 'guest'),
    setState: (newState) => set({ state: newState }),
    setActions: (actions) => set({ actions }),
  };
});
