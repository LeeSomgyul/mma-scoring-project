package com.mma.backend.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mma.backend.dto.GenerateQrRequest;
import com.mma.backend.dto.JudgeQrResponse;
import com.mma.backend.repository.MatchProgressRepository;
import com.mma.backend.repository.MatchesRepository;
import com.mma.backend.service.JudgeAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/judge-access")
public class JudgeAccessController {

    private final JudgeAccessService judgeAccessService;
    private final MatchesRepository matchesRepository;
    private final MatchProgressRepository matchProgressRepository;
    private final ObjectMapper objectMapper;

    //✅ 관리자의 비밀번호 설정 및 심판 별 QR생성
    @PostMapping("/generate-qr")
    public ResponseEntity<Map<String, Object>> generateQr(@RequestBody GenerateQrRequest request) {
        String accessCode = judgeAccessService.setPassword(request.getPassword());
        List<JudgeQrResponse> judgeQRList = judgeAccessService.registerJudges(request.getMatchId(), request.getJudgeNames());

        Map<String, Object> response = new HashMap<>();

        response.put("accessCode", accessCode);
        response.put("judgeQRList", judgeQRList);

        return ResponseEntity.ok(response);
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
