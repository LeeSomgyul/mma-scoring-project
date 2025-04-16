package com.mma.backend.controller;

import com.mma.backend.dto.JudgeResponse;
import com.mma.backend.entity.Judges;
import com.mma.backend.entity.MatchProgress;
import com.mma.backend.entity.Matches;
import com.mma.backend.repository.JudgesRepository;
import com.mma.backend.service.JudgesService;
import com.mma.backend.service.MatchProgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Slf4j
@RequestMapping("/api/judges")
public class JudgeController {

    private final JudgesService judgesService;
    private final JudgesRepository judgesRepository;
    private final MatchProgressService matchProgressService;
    private final SimpMessagingTemplate messagingTemplate;


    //✅ 심판 입장 시 정보 등록하는 기능
    @PostMapping
    public ResponseEntity<?> registerJudge (
            @RequestParam String name,
            @RequestParam String deviceId,
            @RequestParam Long matchId
    ) {
        //🔴 입장 제한 체크(인원 초과될 수 있으니까)
        if(judgesService.isJudgeLimitReached()){
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("이미 심판 인원이 모두 입장하였습니다.");
        }

        Matches match = matchProgressService.findMatchById(matchId);

        Judges judge = judgesService.registerJudge(name, deviceId);
        judge.setMatch(match);
        judge.setConnected(true);
        judgesRepository.save(judge);

        //🔴 심판 입장 시 websocket 메시지 전송
        Map<String, Object> joinedJudge = Map.of(
                "status", "JOINED",
                "judgeName", judge.getName()
        );

        messagingTemplate.convertAndSend("/topic/messages", joinedJudge);

        JudgeResponse judgeResponse = new JudgeResponse(judge.getName(), judge.isConnected());
        return ResponseEntity.ok(judgeResponse);
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

    //✅ 본부석에 현재 경기에 참가한 심판 이름 목록 전송
    @GetMapping("/current")
    public ResponseEntity<List<JudgeResponse>> getCurrentJudges(@RequestParam Long matchId) {
        //🔴 현재 접속 중인 심판들 중, 이번 경기와 연결된 심판만 가져오기
        List<Judges> judges = judgesRepository.findByIsConnectedTrueAndMatch_Id(matchId);

        List<JudgeResponse> judgeNames = judges.stream()
                .map(judge -> new JudgeResponse(judge.getName(), judge.isConnected()))
                .toList();

        return ResponseEntity.ok(judgeNames);
    }
}
