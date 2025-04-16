import { create } from 'zustand';
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
    createdAt: string;
}

interface MatchSotreState {
    matches: Match[];
    setMatches: (m: Match[]) => void;
  
    currentIndex: number;
    setCurrentIndex: (i: number) => void;

    isHydrated: boolean;
    setHydrated: (val: boolean) => void;
}

export const useMatchStore = create<MatchSotreState>()(
    persist(
      (set, get) => ({
        matches: [],
        setMatches: (m) => set({ matches: m }),
  
        currentIndex: 0,
        setCurrentIndex: (i) => set({ currentIndex: i }),
  
        isHydrated: false,
        setHydrated: (val) => set({ isHydrated: val }),
      }),
      {
        name: 'match-storage',// localStorage에 저장될 키 이름
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
      }
    )
  );