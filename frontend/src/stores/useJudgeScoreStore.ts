//🔥 [심판이 입력한 점수 상태 저장]

import { create } from 'zustand';

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
}

export const useJudgeScoreStore = create<JudgeScoreState>()(
  (set) => ({
    scores: [],
    setScores: (scores) => set({ scores }),

    submitted: [],
    setSubmitted: (submitted) => set({ submitted }),

    editing: [],
    setEditing: (editing) => set({ editing }),

    currentRoundIndex: 0,
    setCurrentRoundIndex: (index) => set({ currentRoundIndex: index }),
  })
);
