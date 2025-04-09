package com.mma.backend.service;

import com.mma.backend.entity.Matches;
import com.mma.backend.entity.Rounds;
import com.mma.backend.repository.MatchesRepository;
import com.mma.backend.repository.RoundsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

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
    @Transactional
    public Matches saveMatch(Matches matches) {
        //🔴 이미 존재하는 matchNumber인지 확인
        Optional<Matches> existingMatch = matchesRepository.findByMatchNumber(matches.getMatchNumber());
        Matches savedMatches;

        //🔴 이미 업로드 된 경기정보가 있다면 (이전에 엑셀 파일 업로드 한 적 있다면)
        if(existingMatch.isPresent()) {
            savedMatches = existingMatch.get();//☑️ 덮어쓰고
            roundsRepository.deleteByMatchId(savedMatches.getId()); //☑️ 기존 rounds 삭제
            roundsRepository.flush();
        }else{
            //🔴 업로드 된 경기정보가 없다면 새로 저장
            savedMatches = matchesRepository.save(matches);
        }

        //🔴 경기 정보 덮어쓰기
        savedMatches.setDivision(matches.getDivision());
        savedMatches.setRoundCount(matches.getRoundCount());
        savedMatches.setRedName(matches.getRedName());
        savedMatches.setRedGym(matches.getRedGym());
        savedMatches.setBlueName(matches.getBlueName());
        savedMatches.setBlueGym(matches.getBlueGym());
        
        //🔴 다시 저장
        savedMatches = matchesRepository.save(savedMatches);

        //🔴 라운드 정보 다시 생성
        for(int i = 1; i <= matches.getRoundCount(); i++){
            Rounds round = new Rounds();
            round.setMatch(savedMatches);
            round.setRoundNumber(i);
            round.setFinished(false);
            round.setWinnerCorner(null);
            roundsRepository.save(round);
        }

        return savedMatches;
    }
}
