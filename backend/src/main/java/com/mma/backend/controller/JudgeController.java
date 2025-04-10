package com.mma.backend.controller;

import com.mma.backend.entity.Judges;
import com.mma.backend.service.JudgesService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/judges")
public class JudgeController {

    private final JudgesService judgesService;

    //✅ 심판 입장 시 정보 등록하는 기능
    @PostMapping
    public ResponseEntity<?> registerJudge (@RequestParam String name, @RequestParam String deviceId) {
        //🔴 입장 제한 체크(인원 초과될 수 있으니까)
        if(judgesService.isJudgeLimitReached()){
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("이미 심판 인원이 모두 입장하였습니다.");
        }

        Judges judge = judgesService.registerJudge(name, deviceId);
        return ResponseEntity.ok(judge);
    }

    //✅ 심판의 연결 상태 업데이트(연결 끊길수도 있으니까 여부 확인)
    @PutMapping("/{id}/connect")
    public ResponseEntity<Void> updateConnectionStatus (@PathVariable Long id, @RequestParam boolean isConnected) {
        judgesService.updateConnectionStatus(id, isConnected);
        return ResponseEntity.ok().build();
    }

    //✅ 본부석에서 전체 심판 목록 확인 기능(연결 유무 상관없이)
    @GetMapping
    public List<Judges> getAllJudges() {
        return judgesService.getAllJudges();
    }

    //✅ 심판용 UUID 여러 개 생성
    @PostMapping("/generate")
    public ResponseEntity<List<String>> generateJudgeUUIDs(@RequestParam int count) {
        List<String> uuids = judgesService.generateJudges(count);
        return ResponseEntity.ok(uuids);
    }
}
