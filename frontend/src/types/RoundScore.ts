export interface RoundScore{
    roundId: number;//라운드id
    matchId: number;//경기id
    judgeId: number;//심판id
    roundNumber: number;//몇 라운드인지
    redScore: number;//빨간팀 선수 점수
    blueScore: number;//파랑팀 선수 점수
    submitted: boolean;//관리자에게 점수 전송 유무
    submittedAt: string | null;//전송 시간(아직 전송 안했다면 null일 수도 있음)
}