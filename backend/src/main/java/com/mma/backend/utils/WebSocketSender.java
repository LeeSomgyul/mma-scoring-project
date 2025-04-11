package com.mma.backend.utils;

import com.mma.backend.entity.MatchProgress;
import com.mma.backend.entity.Matches;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketSender {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendComplete(Long roundId, int roundNumber, int totalRed, int totalBlue) {
        Map<String, Object> result = Map.of(
                "status", "COMPLETE",
                "roundId", roundId,
                "roundNumber", roundNumber,
                "totalRed", totalRed,
                "totalBlue", totalBlue
        );

        messagingTemplate.convertAndSend("/topic/messages", result);
        log.info("📤 본부석에 합산 점수 전송 완료: {}", result);
    }

    public void sendWaiting(Long roundId) {
        Map<String, Object> message = Map.of(
                "status", "WAITING",
                "roundId", roundId
        );
        messagingTemplate.convertAndSend("/topic/messages", message);
    }

    public void sendError(String errorMessage) {
        messagingTemplate.convertAndSend("/topic/errors", Map.of("error", errorMessage));
    }

    //✅ 다음 경기 정보를 /judge에 전달하는 메서드
    public void sendNextMatch(MatchProgress nextProgress) {
        try{
            //🔴 다음 경기 정보 가져오기
            Matches match = nextProgress.getCurrentMatch();

            //🔴 다음 경기를 map형식으로 변환
            List<Map<String, Object>> rounds = match.getRounds().stream()
                    .map(r -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", r.getId());
                        map.put("roundNumber", r.getRoundNumber());
                        return map;
                    })
                    .toList();

            Map<String, Object> matchInfo = new HashMap<>();
            matchInfo.put("id", match.getId());
            matchInfo.put("matchNumber", match.getMatchNumber());
            matchInfo.put("division", match.getDivision());
            matchInfo.put("roundCount", match.getRoundCount());
            matchInfo.put("redName", match.getRedName());
            matchInfo.put("blueName", match.getBlueName());
            matchInfo.put("redGym", match.getRedGym());
            matchInfo.put("blueGym", match.getBlueGym());
            matchInfo.put("rounds", rounds);

            messagingTemplate.convertAndSend("/topic/next-match", matchInfo);
            log.info("📤 다음 경기 정보 전송: {}", matchInfo);
        }catch(Exception e){
            log.error("❌ 다음 경기 정보 전송 실패:", e);
        }
    }
}
