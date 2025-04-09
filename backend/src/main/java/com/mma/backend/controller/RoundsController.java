package com.mma.backend.controller;

import com.mma.backend.entity.Rounds;
import com.mma.backend.repository.RoundsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rounds")
public class RoundsController {

    private final RoundsRepository roundsRepository;

    //✅ 특정 경기의 모든 라운드 가져오기
    @GetMapping("/match/{matchid}")
    public List<Rounds> getRoundsByMatchId(@PathVariable Long matchid) {
        return roundsRepository.findByMatchId(matchid);
    }
}
