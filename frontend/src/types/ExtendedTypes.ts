import {Match} from './Match';
import { RoundScore } from './RoundScore';
import { Room } from './Room';

//한 경기 + 해당 경기의 모든 점수 정보
export interface MatchWithScores extends Match{
    scores: RoundScore[];
}

//한 종목 방 + 해당 방의 모든 경기 정보
export interface RoomWithMatches extends Room{
    matches: Match[];
}