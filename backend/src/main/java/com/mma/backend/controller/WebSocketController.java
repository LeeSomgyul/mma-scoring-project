//⭐ 심판 -> 관리자에게 점수 보내는 기능
package com.mma.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mma.backend.entity.MatchProgress;
import com.mma.backend.entity.Matches;
import com.mma.backend.repository.MatchProgressRepository;
import com.mma.backend.service.MatchProgressService;
import com.mma.backend.service.ScoresService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
@Slf4j
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final ScoresService scoresService;
    private final MatchProgressService matchProgressService;

    //✅ 심판이 보낸 점수 --(서버: 여기 백엔드)--> 본부석에 점수 전달
    @MessageMapping("/send")
    public void receiveMessage(String message) {
        log.info("📥 서버가 받은 메시지: {}", message);

        try{
            //🔴 받은 점수 정보를 JSON -> Map 변환
            Map<String, Object> scoreInfo = objectMapper.readValue(message, Map.class);
            String judgeDeviceId = scoreInfo.get("judgeId").toString();// 실제로는 deviceId
            int redScore = Integer.parseInt(scoreInfo.get("redScore").toString());
            int blueScore = Integer.parseInt(scoreInfo.get("blueScore").toString());

            //🔴 roundId는 클라이언트가 보낸 걸 사용
            Long roundId = Long.parseLong(scoreInfo.get("roundId").toString());

            //🔴 현재 경기에 대한 정보 가져오기
            MatchProgress matchProgress = matchProgressService.getCurrentProgress();
            int expectedjudgeCount = matchProgress.getJudgeCount();

            //🔴 DB에 저장
            scoresService.saveScore(roundId, judgeDeviceId, redScore, blueScore);

            //🔴 해당 대회의 심판 수와 해당 라운드에 입력된 점수의 수 비교
            int submittedCount = scoresService.countByRoundId(roundId);

            //🔴 심판이 전부 제출하지 않았을 때
            if(submittedCount < expectedjudgeCount){
                Map<String, Object> waitingMessage = Map.of(
                        "status", "WAITING",
                        "roundId", roundId
                );
                messagingTemplate.convertAndSend("/topic/messages", waitingMessage);
                return;
            }

            //🔴 심판이 전부 제출했을 때 -> 점수 합하기
            int totalRed = scoresService.sumRedScoreByRound(roundId);
            int totalBlue = scoresService.sumBlueScoreByRound(roundId);
            int roundNumber = scoresService.getRoundNumberById(roundId);

            Map<String, Object> result = Map.of(
                    "status", "COMPLETE",
                    "roundId", roundId,
                    "roundNumber", roundNumber,
                    "totalRed", totalRed,
                    "totalBlue", totalBlue
            );


            messagingTemplate.convertAndSend("/topic/messages", result);
            log.info("📤 본부석에 합산 점수 전송 완료: {}", result);
        }catch(Exception e){
            log.error("❌ 점수 처리 중 오류 발생:", e);
        }
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
