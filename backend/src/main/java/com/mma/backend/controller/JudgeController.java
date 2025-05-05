package com.mma.backend.controller;

import com.mma.backend.dto.JudgeResponse;
import com.mma.backend.entity.Judges;
import com.mma.backend.entity.Matches;
import com.mma.backend.repository.JudgesRepository;
import com.mma.backend.repository.MatchesRepository;
import com.mma.backend.service.JudgesService;
import com.mma.backend.service.MatchProgressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
@Slf4j
@RequestMapping("/api/judges")
public class JudgeController {

    private final JudgesService judgesService;
    private final JudgesRepository judgesRepository;
    private final MatchesRepository matchesRepository;
    private final SimpMessagingTemplate messagingTemplate;


    //✅ 심판 입장 시 정보 등록 & 재입장 시 deviceID 확인 후 입장
    @PostMapping
    public ResponseEntity<?> registerJudge (
            @RequestParam String deviceId,
            @RequestParam Long matchId
    ) {
        Optional<Judges> optionalJudge = judgesRepository.findByDeviceIdAndMatch_Id(deviceId, matchId);

        if(optionalJudge.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("❌deviceId가 등록되어있지 않습니다.");
        }

        Judges judge = optionalJudge.get();
        judge.setConnected(true);

        Matches match = matchesRepository.findById(matchId)
                .orElseThrow(() -> new NoSuchElementException("❌ matchId로 매치 못 찾음"));
        System.out.println("✅ 매치 가져옴: " + match.getId());

        judge.setMatch(match);
        System.out.println("✅ judge에 match 설정 완료: " + judge.getMatch().getId());

        Judges saved = judgesRepository.save(judge);
        System.out.println("✅ 저장된 judge: " + saved.getId() + ", matchId: " + saved.getMatch().getId());


        //🔴 심판 입장 시 websocket 메시지 전송
        Map<String, Object> joinedJudge = Map.of(
            "status", "JOINED",
            "judgeName", judge.getName()
        );

        messagingTemplate.convertAndSend("/topic/messages", joinedJudge);

        JudgeResponse judgeResponse = new JudgeResponse(judge.getName(), true, judge.getDeviceId());
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
        //🔴 경기(matchId)에 소속된 모든 심판 가져오기
        List<Judges> judges = judgesRepository.findByMatch_Id(matchId);
        System.out.println("✅Found judges: " + judges);

        List<JudgeResponse> judgeResponses = judges.stream()
                .map(judge -> new JudgeResponse(
                        judge.getName(),
                        judge.isConnected(),
                        judge.getDeviceId()
                        ))
                .toList();

        System.out.println("✅Response: " + judgeResponses);
        return ResponseEntity.ok(judgeResponses);
    }
}
