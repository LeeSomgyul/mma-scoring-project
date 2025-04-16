import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ✅ 심판 점수 타입
export interface JudgeScore {
    judgeName: string;
    red: number | null;
    blue: number | null;
    submitted: boolean;
}
  
// ✅ 라운드별 점수 구조
export interface RoundScore {
  roundId: number;
  roundNumber: number;
  judges: JudgeScore[];
}
  
  interface ScoreStoreState {
    // ✅ 전체 라운드의 점수들(심판별 점수 포함)
    roundScores: RoundScore[];
    setRoundScores: (
      updater: RoundScore[] | ((prev: RoundScore[]) => RoundScore[])
    ) => void;

    // ✅ 현재 몇 번째 라운드인지
    currentRoundIndex: number;
    setCurrentRoundIndex: (index: number) => void;
  
    // ✅ 점수 상태 메시지 ("대기 중", "완료" 등)
    scoreStatus: string;
    setScoreStatus: (msg: string) => void;

    isHydrated: boolean;
    setHydrated: (val: boolean) => void;
  }
  
  export const useScoreStore = create<ScoreStoreState>()(
    persist(
      (set) => ({
        roundScores: [],
        setRoundScores: (updater) =>
        set((state) => ({
          roundScores:
            typeof updater === "function"
              ? updater(state.roundScores)
              : updater,
        })),
  
        currentRoundIndex: 0,
        setCurrentRoundIndex: (index: number) => set({ currentRoundIndex: index }),
  
        scoreStatus: '⏳ 점수 대기 중...',
        setScoreStatus: (msg: string) => set({ scoreStatus: msg }),

        isHydrated: false,
        setHydrated: (val) => set({ isHydrated: val }),
      }),
      {
        name: 'score-storage', // localStorage에 저장될 키 이름
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
      }
    )
  );