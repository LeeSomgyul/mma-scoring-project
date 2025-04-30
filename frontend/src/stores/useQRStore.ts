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
    }),
    {
      name: 'qr-store',
    }
  )
);
