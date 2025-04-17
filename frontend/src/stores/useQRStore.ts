import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QRStoreState {
  // ✅ 'QR 코드 생성'버튼 보여줄지 말지 여부
  showQRButton: boolean;
  setShowQRButton: (val: boolean) => void;

  // ✅ 실제 QR 코드가 화면에 떠있는지 여부
  qrGenerated: boolean;
  setQrGenerated: (val: boolean) => void;

  // ✅ 심판 비밀번호가 설정됐는지 여부
  isPasswordSet: boolean;
  setIsPasswordSet: (val: boolean) => void;

  // ✅ QR URL에 붙는 accessCode 값 (심판 입장용 링크 코드)
  accessCode: string;
  setAccessCode: (code: string) => void;

  // ✅ QR 코드 보여주기 여부  
  isFileUploaded: boolean;
  setIsFileUploaded: (val: boolean) => void;

  // ✅ zustand persist 복원 여부
  isHydrated: boolean;
  setHydrated: (val: boolean) => void;
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
      setHydrated: (val) => set({ isHydrated: val }),
    }),
    {
      name: 'qr-storage', // localStorage 키
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        showQRButton: state.showQRButton,
        qrGenerated: state.qrGenerated,
        isPasswordSet: state.isPasswordSet,
        accessCode: state.accessCode,
        isFileUploaded: state.isFileUploaded,
        isHydrated: state.isHydrated,
      }),
    }
  )
);