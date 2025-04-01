export interface Room{
    roomId: number;//방id
    competitionId: number;//대회id
    name: string;//종목 이름
    password: string;//방(종목) 입장 비밀번호
    roundCount: number;//방(종목)의 라운드 수
    createdAt: string;//생성 일자
}