//🔥 [심판용 match 상태 저장]

import { create } from 'zustand';

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
}

export const useJudgeMatchStore = create<JudgeMatchStore>()(
  (set) => ({
    matchInfo: null,
    setMatchInfo: (info) => set({ matchInfo: info }),
  })
);
