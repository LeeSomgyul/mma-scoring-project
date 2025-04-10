package com.mma.backend.controller;

import com.mma.backend.entity.MatchProgress;
import com.mma.backend.service.MatchProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class MatchProgressController {

    private final SimpMessagingTemplate messagingTemplate;
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

    //✅ 본부화면에서 '다음 경기' 누르면 admin, judge모두 화면 전환
    @PostMapping("/next")
    public ResponseEntity<?> switchToNextMatch(@RequestParam Long currentMatchId){

        try{
            //🔴 다음 경기 정보 가져오기
            MatchProgress nextProgress = matchProgressService.switchToNextMatch(currentMatchId);
            Long nextMatchId = nextProgress.getCurrentMatch().getId();

            //🔴 다음 경기 정보 WebSocket 전송
            Map<String, Object> nextMatch = Map.of(
                    "matchId", nextProgress.getCurrentMatch().getId(),
                    "matchNumber", nextProgress.getCurrentMatch().getMatchNumber(),
                    "roundCount", nextProgress.getCurrentMatch().getRoundCount(),
                    "redName", nextProgress.getCurrentMatch().getRedName(),
                    "redGym", nextProgress.getCurrentMatch().getRedGym(),
                    "blueName", nextProgress.getCurrentMatch().getBlueName(),
                    "blueGym", nextProgress.getCurrentMatch().getBlueGym(),
                    "division", nextProgress.getCurrentMatch().getDivision()
            );

            messagingTemplate.convertAndSend("/topic/next-match", nextMatch);

            return ResponseEntity.ok(Map.of("nextMatchId", nextMatchId));
        }catch (Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("전환 실패: " + e.getMessage());
        }
    }
}
