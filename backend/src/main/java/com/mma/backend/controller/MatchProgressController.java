package com.mma.backend.controller;

import com.mma.backend.entity.MatchProgress;
import com.mma.backend.service.MatchProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class MatchProgressController {

    private final MatchProgressService matchProgressService;

    //✅ 경기 시작 -> MatchProgress 생성
    @PostMapping("/start")
    public ResponseEntity<MatchProgress> createProgress(
            @RequestParam Long matchId, @RequestParam int judgeCount
    ) {
        MatchProgress createdProgress = matchProgressService.createProgress(matchId, judgeCount);
        return ResponseEntity.ok(createdProgress);
    }

    //✅ 현재 경기 정보를 어디서든 불러올 수 있도록 하는 기능
    @GetMapping
    public ResponseEntity<MatchProgress> getCurrentProgress() {
        return ResponseEntity.ok(matchProgressService.getCurrentProgress());
    }

    //✅ 본부석의 '다음 라운드' 넘어가는 버튼 기능
    @PostMapping("/next-round")
    public ResponseEntity<Void> nextRound(){
        matchProgressService.goToNextRound();
        return ResponseEntity.ok().build();
    }

    //✅ 경기 종료 처리
    @PostMapping("/end")
    public ResponseEntity<Void> endMatch(){
        matchProgressService.endMatch();
        return ResponseEntity.ok().build();
    }

    //✅ 점수 입력 잠금 (심판 점수 입력 막기)
    @PostMapping("/lock")
    public ResponseEntity<Void> lockInput(){
        matchProgressService.lockInput();
        return ResponseEntity.ok().build();
    }

    //✅ 점수 입력 해제 (심판 입력 허용)
    @PostMapping("/unlock")
    public ResponseEntity<Void> unlockInput(){
        matchProgressService.unlockInput();
        return ResponseEntity.ok().build();
    }

    //✅ 현재 경기의 심판 수 확인 (점수 합산용)
    @GetMapping("/judge-count")
    public ResponseEntity<Integer> getJudgeCount(){
        return ResponseEntity.ok(matchProgressService.getJudgeCount());
    }
}
