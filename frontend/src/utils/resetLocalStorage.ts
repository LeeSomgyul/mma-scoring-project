export const resetAllStores = () => {
  // zustand persist 스토어
  localStorage.removeItem("match-storage");
  localStorage.removeItem("score-storage");
  localStorage.removeItem("qr-storage");

  // 예전 방식으로 수동 저장된 상태들
  localStorage.removeItem("admin_matches");
  localStorage.removeItem("admin_roundScores");
  localStorage.removeItem("admin_currentIndex");
  localStorage.removeItem("admin_isFileUploaded");
  localStorage.removeItem("admin_isPasswordSet");
  localStorage.removeItem("admin_qrGenerated");
  localStorage.removeItem("admin_showQRButton");
  localStorage.removeItem("admin_accessCode");
};
