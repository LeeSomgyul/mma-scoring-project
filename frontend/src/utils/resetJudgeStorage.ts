export const resetJudgeStorage = () => {
    localStorage.removeItem("judge-info-storage");
    localStorage.removeItem("judge-score-storage");
    localStorage.removeItem("judgeDeviceId");
  };