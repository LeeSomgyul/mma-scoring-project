package com.mma.backend.controller;

import com.mma.backend.service.ScoresService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/scores")
public class ScoresController {

    private final ScoresService scoresService;

    @GetMapping("/count")
    public int countSubmittedScores(@RequestParam Long roundId) {
        return scoresService.countByRoundId(roundId);
    }
}
