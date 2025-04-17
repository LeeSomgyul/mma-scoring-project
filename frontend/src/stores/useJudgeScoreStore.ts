//🔥 [심판이 입력한 점수 상태 저장]

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Score {
  red: string;
  blue: string;
}

interface JudgeScoreState {
  scores: Score[];
  setScores: (scores: Score[]) => void;

  submitted: boolean[];
  setSubmitted: (submitted: boolean[]) => void;

  editing: boolean[];
  setEditing: (editing: boolean[]) => void;

  currentRoundIndex: number;
  setCurrentRoundIndex: (index: number) => void;

  isHydrated: boolean;
  setHydrated: (val: boolean) => void;
}

export const useJudgeScoreStore = create<JudgeScoreState>()(
  persist(
    (set) => ({
      scores: [],
      setScores: (scores) => set({ scores }),

      submitted: [],
      setSubmitted: (submitted) => set({ submitted }),

      editing: [],
      setEditing: (editing) => set({ editing }),

      currentRoundIndex: 0,
      setCurrentRoundIndex: (index) => set({ currentRoundIndex: index }),

      isHydrated: false,
      setHydrated: (val) => set({ isHydrated: val }),
    }),
    {
      name: "judge-score-storage",
      partialize: (state) => ({
        scores: state.scores,
        submitted: state.submitted,
        editing: state.editing,
        currentRoundIndex: state.currentRoundIndex,
        isHydrated: state.isHydrated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
