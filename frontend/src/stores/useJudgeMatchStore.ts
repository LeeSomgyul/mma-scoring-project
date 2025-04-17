//🔥 [심판용 match 상태 저장]

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RoundInfo {
    id: number;
    roundNumber: number;
}

export interface MatchInfo {
    id: number;
    matchNumber: number;
    division: string;
    roundCount: number;
    redName: string;
    redGym: string;
    blueName: string;
    blueGym: string;
    rounds: RoundInfo[];
}

interface JudgeMatchStore {
    matchInfo: MatchInfo | null;
    setMatchInfo: (info: MatchInfo) => void;
  
    isHydrated: boolean;
    setHydrated: (val: boolean) => void;
  }
  
  export const useJudgeMatchStore = create<JudgeMatchStore>()(
    persist(
      (set) => ({
        matchInfo: null,
        setMatchInfo: (info) => set({ matchInfo: info }),
  
        isHydrated: false,
        setHydrated: (val) => set({ isHydrated: val }),
      }),
      {
        name: 'judge-match-storage',
        partialize: (state) => ({
          matchInfo: state.matchInfo,
          isHydrated: state.isHydrated,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
      }
    )
  );