import { create } from 'zustand';
import { persist } from "zustand/middleware";

interface QRStoreState {
  showQRButton: boolean;
  setShowQRButton: (val: boolean) => void;

  qrGenerated: boolean;
  setQrGenerated: (val: boolean) => void;

  isPasswordSet: boolean;
  setIsPasswordSet: (val: boolean) => void;

  accessCode: string;
  setAccessCode: (code: string) => void;

  isFileUploaded: boolean;
  setIsFileUploaded: (val: boolean) => void;

  isHydrated: boolean;
  setIsHydrated: (val: boolean) => void;

  judgeQRList: { name: string; deviceId: string }[];
  setJudgeQRList: (list: { name: string; deviceId: string }[]) => void;

}

export const useQRStore = create<QRStoreState>()(
  persist(
    (set) => ({
      showQRButton: false,
      setShowQRButton: (val) => set({ showQRButton: val }),

      qrGenerated: false,
      setQrGenerated: (val) => set({ qrGenerated: val }),

      isPasswordSet: false,
      setIsPasswordSet: (val) => set({ isPasswordSet: val }),

      accessCode: '',
      setAccessCode: (code) => set({ accessCode: code }),

      isFileUploaded: false,
      setIsFileUploaded: (val) => set({ isFileUploaded: val }),

      isHydrated: false,
      setIsHydrated: (val) => set({ isHydrated: val }),

      judgeQRList: [],
      setJudgeQRList: (list) => set({ judgeQRList: list }),
    }),
    {
      name: 'qr-store',
      onRehydrateStorage: (state) => {
        return () => {
          state?.setIsHydrated(true); // ✅ 정확한 setter 호출
        };
      }
    }
  )
);
