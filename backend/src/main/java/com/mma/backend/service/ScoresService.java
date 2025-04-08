package com.mma.backend.service;

import com.mma.backend.entity.Judges;
import com.mma.backend.entity.Rounds;
import com.mma.backend.entity.Scores;
import com.mma.backend.repository.JudgesRepository;
import com.mma.backend.repository.RoundsRepository;
import com.mma.backend.repository.ScoresRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ScoresService {

    private final ScoresRepository scoresRepository;
    private final RoundsRepository roundsRepository;
    private final JudgesRepository judgesRepository;

    //✅ 심판이 전송한 점수를 저장하는 기능
    public void saveScore(Long roundId, String judgeDeviceId, int redScore, int blueScore) {
        Rounds round = roundsRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("해당 라운드를 찾을 수 없습니다."));
        Judges judge = judgesRepository.findByDevicedId(judgeDeviceId)
                .orElseThrow(() -> new IllegalArgumentException("해당 심판 기기를 찾을 수 없습니다."));

        Scores scores = Scores.builder()
                .rounds(round)
                .judges(judge)
                .redScore(redScore)
                .blueScore(blueScore)
                .isSubmitted(true)
                .submittedAt(LocalDateTime.now())
                .isEditable(true)
                .build();

        scoresRepository.save(scores);
    }

    //✅ 해당 라운드에 저장된 모든 심판 점수 목록을 가져옴.
    public List<Scores> getScoresByRoundId(Long roundId) {
        return scoresRepository.findByRounds_Id(roundId);
    }

    //✅ 심판 전원 점수가 다 도착했는지 확인 후 -> 합산 점수 리턴
    public Optional<RoundTotalScore> getTotalScoreIfComplete(Long roundId, int totalJudgeCount) {
        List<Scores> scores = getScoresByRoundId(roundId);

        //🔴 점수 보내지 않은 심판이 있다면, 본부로 점수 보내지 않음
        if(scores.size() < totalJudgeCount) {
            return Optional.empty();
        }

        int redTotal = scores.stream().mapToInt(Scores::getRedScore).sum();
        int blueTotal = scores.stream().mapToInt(Scores::getBlueScore).sum();

        return Optional.of(new RoundTotalScore(roundId, redTotal, blueTotal));
    }

    public record RoundTotalScore(Long roundId, int redTotal, int blueTotal) {}

    //✅ 해당 라운드에 점수가 몇개 저장되어져 있는지
    public int countByRoundId(Long roundId) {
        return scoresRepository.findByRounds_Id(roundId).size();
    }

    //✅ 해당 대회에 심판이 총 몇명인지
    public int getTotalJudgeCount(){
        return (int) judgesRepository.count();
    }

    //✅ 한 라운드에서 모든 심판이 준 레드 선수 점수 합산
    public int sumRedScoreByRound(Long roundId){
        return scoresRepository.findByRounds_Id(roundId).stream().mapToInt(Scores::getRedScore).sum();
    }

    //✅ 한 라운드에서 모든 심판이 준 블루 선수 점수 합산
    public int sumBlueScoreByRound(Long roundId){
        return scoresRepository.findByRounds_Id(roundId).stream().mapToInt(Scores::getBlueScore).sum();
    }
}
