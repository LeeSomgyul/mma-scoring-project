//🔥 [본부용 점수 관련 상태]

import { create } from 'zustand';

export interface JudgeScore {
    judgeName: string;
    red: number | null;
    blue: number | null;
    submitted: boolean;
    isConnected: boolean;
}
  
export interface RoundScore {
  roundId: number;
  roundNumber: number;
  judges: JudgeScore[];
}
  
interface ScoreStoreState {
  roundScores: RoundScore[];
  setRoundScores: (
    updater: RoundScore[] | ((prev: RoundScore[]) => RoundScore[])
  ) => void;

  currentRoundIndex: number;
  setCurrentRoundIndex: (index: number) => void;

  scoreStatus: string;
  setScoreStatus: (msg: string) => void;
}

export const useScoreStore = create<ScoreStoreState>()(
  (set) => ({
    roundScores: [],
    setRoundScores: (updater) =>
      set((state) => ({
        roundScores: typeof updater === "function" ? updater(state.roundScores) : updater,
      })),
  
    currentRoundIndex: 0,
    setCurrentRoundIndex: (index) => set({ currentRoundIndex: index }),
  
    scoreStatus: '⏳ 점수 대기 중...',
    setScoreStatus: (msg) => set({ scoreStatus: msg }),
  })
);
