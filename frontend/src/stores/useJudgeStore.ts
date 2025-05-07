//🔥 [심판 본인 정보 저장 상태]

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface JudgeState {
  judgeName: string | null;
  setJudgeName: (name: string) => void;

  deviceId: string | null;
  setDeviceId: (id: string) => void;

  verified: boolean;
  setVerified: (val: boolean) => void;

  isHydrated: boolean;
    setIsHydrated: (val: boolean) => void;
}

export const useJudgeStore = create<JudgeState>()(
  persist(
    (set) => ({
      judgeName: null,
      setJudgeName: (name) => set({ judgeName: name }),
  
      deviceId: null,
      setDeviceId: (id) => set({ deviceId: id }),
  
      verified: false,
      setVerified: (val) => set({ verified: val }),

      isHydrated: false,
      setIsHydrated: (val) => set({ isHydrated: val }),
    }),
    {
      name: "judge-info-storage",
      onRehydrateStorage: () => (state) => {
        state?.setIsHydrated(true);
      },
    }
  )
  
);
