package com.mma.backend.service;

import com.mma.backend.entity.MatchProgress;
import com.mma.backend.entity.Matches;
import com.mma.backend.entity.Rounds;
import com.mma.backend.repository.MatchProgressRepository;
import com.mma.backend.repository.MatchesRepository;
import com.mma.backend.repository.RoundsRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class MatchProgressService {

    private final MatchProgressRepository matchProgressRepository;
    private final MatchesRepository matchesRepository;
    private final RoundsRepository roundsRepository;

    //✅ 현재 경기 정보를 DB에 저장하기 위한 MatchProgress 생성
    @Transactional
    public MatchProgress createProgress(Long matchId, int judgeCount) {
        Matches match = matchesRepository.findById(matchId)
                .orElseThrow(() -> new NoSuchElementException("해당 경기를 찾을 수 없습니다."));

        //🔴 해당 경기(match)의 첫 라운드 가져오기
        Rounds firstRound = roundsRepository.findByMatchAndRoundNumber(match, 1)
                .orElseThrow(() -> new IllegalArgumentException("❌ 라운드 없음"));

        MatchProgress progress = MatchProgress.builder()
                .currentMatch(match)
                .currentRoundNumber(1)
                .currentRound(firstRound)
                .isLocked(false)
                .isEndOfMatch(false)
                .judgeCount(judgeCount)
                .build();

        return matchProgressRepository.save(progress);
    }

    //✅ 현재 경기 정보를 어디서든 불러올 수 있도록 하는 기능
    @Transactional(readOnly = true)
    public MatchProgress getCurrentProgress(){
        return matchProgressRepository.findCurrentProgress()
                .orElseThrow(() -> new NoSuchElementException("진행 중인 경기 정보가 없습니다."));
    }

    //✅ 본부석의 '다음 라운드' 넘어가는 버튼 기능
    @Transactional
    public void goToNextRound(){
        MatchProgress progress = getCurrentProgress();
        progress.setCurrentRoundNumber(progress.getCurrentRoundNumber() + 1);
        progress.setIsLocked(false);
        matchProgressRepository.save(progress);
    }

    //✅ 경기 종료 처리
    @Transactional
    public void endMatch(){
        MatchProgress progress = getCurrentProgress();
        progress.setIsEndOfMatch(true);
        progress.setIsLocked(true);
        matchProgressRepository.save(progress);
    }

    //✅ 점수 입력 잠금 (심판 점수 입력 막기)
    @Transactional
    public void lockInput(){
        MatchProgress progress = getCurrentProgress();
        progress.setIsLocked(true);
        matchProgressRepository.save(progress);
    }

    //✅ 점수 입력 해제 (심판 입력 허용)
    @Transactional
    public void unlockInput(){
        MatchProgress progress = getCurrentProgress();
        progress.setIsLocked(false);
        matchProgressRepository.save(progress);
    }

    //✅ 현재 경기의 심판 수 확인 (점수 합산용)
    @Transactional(readOnly = true)
    public int getJudgeCount(){
        return getCurrentProgress().getJudgeCount();
    }
}
