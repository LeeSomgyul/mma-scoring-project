import { create } from 'zustand';
import { RoundInfo } from './useJudgeMatchStore';
import { persist } from 'zustand/middleware';

export interface Match {
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

interface MatchStoreState {
    matches: Match[];
    setMatches: (m: Match[]) => void;
  
    currentIndex: number;
    setCurrentIndex: (i: number) => void;

    isHydrated: boolean;
    setIsHydrated: (val: boolean) => void;
}

export const useMatchStore = create<MatchStoreState>()(
  persist(
    (set) => ({
      matches: [],
      setMatches: (m) => set({ matches: m }),
    
      currentIndex: 0,
      setCurrentIndex: (i) => set({ currentIndex: i }),

      isHydrated: false,
      setIsHydrated: (val) => set({ isHydrated: val }),
    }),
    {
      name: "match-storage",
      onRehydrateStorage: (state) => {
        return () => {
          state?.setIsHydrated(true);
        };
      },
    }
  )
);
