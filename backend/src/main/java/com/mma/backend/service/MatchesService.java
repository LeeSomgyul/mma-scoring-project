package com.mma.backend.service;

import com.mma.backend.entity.Matches;
import com.mma.backend.entity.Rounds;
import com.mma.backend.repository.MatchesRepository;
import com.mma.backend.repository.RoundsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MatchesService {

    private final MatchesRepository matchesRepository;
    private final RoundsRepository roundsRepository;

    //✅ 엑셀 파일 불러오기(경기 목록 조회)
    public List<Matches> getAllMatches(){
        return matchesRepository.findAll();
    }

    //✅ 엑셀 불러온 후 라운드 수만큼 경기정보 저장공간 자동 생성
    public Matches saveMatch(Matches matches) {
        Matches savedMatches = matchesRepository.save(matches);

        for(int i = 1; i <= matches.getRoundCount(); i++){
            Rounds round = new Rounds();
            round.setMatches(savedMatches);
            round.setRoundNumber(i);
            round.setFinished(false);
            round.setWinnerCorner(null);
            roundsRepository.save(round);
        }

        return savedMatches;
    }
}
