package com.mma.backend.controller;

import com.mma.backend.entity.JudgeAccess;
import com.mma.backend.service.JudgeAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/judge-access")
public class JudgeAccessController {

    private final JudgeAccessService judgeAccessService;

    //✅ 관리자의 비밀번호 설정 및 수정
    @PostMapping("/password")
    public ResponseEntity<Map<String, String>> setPassword(@RequestBody Map<String, String> request) {
        String password = request.get("password");
        String accessCode = judgeAccessService.setPassword(password);
        return ResponseEntity.ok(Map.of("accessCode", accessCode));
    }

    //✅ 심판 입장 시 비밀번호 검증용
    @PostMapping("/verify")
    public ResponseEntity<Boolean> verify(@RequestBody Map<String, String> payload) {
        String accessCode = payload.get("accessCode");
        String password = payload.get("password");

        boolean result = judgeAccessService.verifyPassword(accessCode, password);
        return ResponseEntity.ok(result);
    }
}
