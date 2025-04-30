//🔥 [심판 본인 정보 저장 상태]

import { create } from 'zustand';

interface JudgeState {
  judgeName: string | null;
  setJudgeName: (name: string) => void;

  deviceId: string | null;
  setDeviceId: (id: string) => void;

  verified: boolean;
  setVerified: (val: boolean) => void;
}

export const useJudgeStore = create<JudgeState>()(
  (set) => ({
    judgeName: null,
    setJudgeName: (name) => set({ judgeName: name }),

    deviceId: null,
    setDeviceId: (id) => set({ deviceId: id }),

    verified: false,
    setVerified: (val) => set({ verified: val }),
  })
);
