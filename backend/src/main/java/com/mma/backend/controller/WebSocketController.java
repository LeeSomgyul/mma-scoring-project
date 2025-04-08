//⭐ 심판 -> 관리자에게 점수 보내는 기능
package com.mma.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mma.backend.service.ScoresService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Controller
@Slf4j
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final ScoresService scoresService;

    //🔴심판이 보낸 점수 --(서버: 여기 백엔드)--> 본부석에 점수 전달
    @MessageMapping("/send")
    public void receiveMessage(String message) {
        log.info("📥 서버가 받은 메시지: {}", message);

        try{
            //1️⃣ 받은 점수 정보를 JSON -> Map 변환
            Map<String, Object> scoreInfo = objectMapper.readValue(message, Map.class);

            Long roundId = Long.parseLong(scoreInfo.get("roundId").toString());
            String judgeDeviceId = scoreInfo.get("judgeId").toString();// 실제로는 deviceId
            int redScore = Integer.parseInt(scoreInfo.get("redScore").toString());
            int blueScore = Integer.parseInt(scoreInfo.get("blueScore").toString());

            //2️⃣ DB에 저장
            scoresService.saveScore(roundId, judgeDeviceId, redScore, blueScore);

            //3️⃣ 해당 대회의 심판 수와 해당 라운드에 입력된 점수의 수 비교
            int submittedCount = scoresService.countByRoundId(roundId);
            int totalJudges = scoresService.getTotalJudgeCount();

            //4️⃣ 심판이 전부 제출하지 않았을 때
            if(submittedCount < totalJudges){
                messagingTemplate.convertAndSend("/topic/messages", "⏳ 입력 대기 중...");
            }else{
                //5️⃣ 심판이 전부 제출했을 때 -> 점수 합하기
                    int totalRed = scoresService.sumRedScoreByRound(roundId);
                    int totalBlue = scoresService.sumBlueScoreByRound(roundId);

                    Map<String, Object> result = new HashMap<>();
                    result.put("roundId", roundId);
                    result.put("totalRed", totalRed);
                    result.put("totalBlue", totalBlue);
                    result.put("status", "✅ 모든 심판 입력 완료");

                    messagingTemplate.convertAndSend("/topic/messages", objectMapper.writeValueAsString(result));
                    log.info("📤 본부석에 합산 점수 전송 완료: {}", result);
            }
        }catch(Exception e){
            log.error("❌ 점수 처리 중 오류 발생:", e);
        }
    }
}
