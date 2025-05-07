package com.mma.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mma.backend.dto.CurrentMatchDto;
import com.mma.backend.entity.MatchProgress;
import com.mma.backend.repository.MatchProgressRepository;
import com.mma.backend.service.MatchProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class MatchProgressController {

    private final MatchProgressService matchProgressService;
    private final MatchProgressRepository matchProgressRepository;

    //✅ 현재 경기 정보 불러오기
    @GetMapping
    public ResponseEntity<CurrentMatchDto> getCurrentProgress() {
        MatchProgress progress = matchProgressService.getCurrentProgress();
        Long matchId = progress.getCurrentMatch().getId();
        return ResponseEntity.ok(new CurrentMatchDto(matchId));
    }

    //✅ 경기 시작 -> MatchProgress 생성
    @PostMapping("/start")
    public ResponseEntity<MatchProgress> createProgress(
            @RequestParam Long matchId, @RequestParam int judgeCount
    ) {
        MatchProgress createdProgress = matchProgressService.createProgress(matchId, judgeCount);
        return ResponseEntity.ok(createdProgress);
    }

    //✅ 현재 진행 중인 라운드 번호를 조회하는 기능
    @GetMapping("/current-round")
    public int getCurrentRoundNumber(){
        return matchProgressService.getCurrentProgress().getCurrentRoundNumber();
    }

    //✅ 경기 종료 처리
    @PostMapping("/end")
    public ResponseEntity<String> endMatch(){
        matchProgressService.endMatch();
        return ResponseEntity.ok("✅ 모든 데이터가 초기화되었습니다.");
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

            return ResponseEntity.ok(Map.of("nextMatchId", nextMatchId));
        }catch (Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("전환 실패: " + e.getMessage());
        }
    }

    //✅ 새로고침 해도 QR 정보 가져올 수 있도록
    @GetMapping("/{matchId}/qr-generated")
    public ResponseEntity<?> getQRStatus(@PathVariable Long matchId) {
        Optional<MatchProgress> optionalProgress = matchProgressRepository.findByCurrentMatch_Id(matchId);

        if (optionalProgress.isPresent()) {
            MatchProgress progress = optionalProgress.get();

            Map<String, Object> response = new HashMap<>();
            response.put("qrGenerated", progress.getQrGenerated());
            response.put("isPasswordSet", progress.getPasswordSet());

            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("❌ match_progress를 찾을 수 없습니다.");
        }
    }
}
