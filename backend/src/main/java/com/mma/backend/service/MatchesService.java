package com.mma.backend.service;

import com.mma.backend.entity.Matches;
import com.mma.backend.repository.MatchesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MatchesService {

    private final MatchesRepository matchesRepository;

    //✅ 엑셀 파일 불러오기(경기 목록 조회)
    public List<Matches> getAllMatches(){
        return matchesRepository.findAll();
    }
}
