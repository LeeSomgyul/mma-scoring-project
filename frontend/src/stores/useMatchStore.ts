import { create } from 'zustand';
import { RoundInfo } from './useJudgeMatchStore';

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
}

export const useMatchStore = create<MatchStoreState>()(
  (set) => ({
    matches: [],
    setMatches: (m) => set({ matches: m }),
  
    currentIndex: 0,
    setCurrentIndex: (i) => set({ currentIndex: i }),
  })
);
