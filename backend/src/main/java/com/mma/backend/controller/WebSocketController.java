//⭐ 심판 -> 관리자에게 점수 보내는 기능
package com.mma.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mma.backend.entity.MatchProgress;
import com.mma.backend.service.MatchProgressService;
import com.mma.backend.service.ScoresService;
import com.mma.backend.utils.WebSocketSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@Slf4j
@RequiredArgsConstructor
public class WebSocketController {

    private final ObjectMapper objectMapper;
    private final ScoresService scoresService;
    private final MatchProgressService matchProgressService;
    private final WebSocketSender webSocketSender;

    //✅ 심판이 보낸 점수 --(서버: 여기 백엔드)--> 본부석에 점수 전달
    @MessageMapping("/send")
    public void receiveMessage(String message) {
        log.info("📥 서버가 받은 메시지: {}", message);

        try{
            //🔴 받은 점수 정보를 JSON -> Map 변환
            Map<String, Object> scoreInfo = objectMapper.readValue(message, Map.class);

            if(!scoreInfo.containsKey("judgeId") || scoreInfo.get("judgeId") == null) {
                log.error("judgeId가 누락되었거나 null입니다: {}", scoreInfo);
                return;
            }

            String judgeDeviceId = scoreInfo.get("judgeId").toString();// 실제로는 deviceId
            int redScore = scoreInfo.containsKey("redScore") ? Integer.parseInt(scoreInfo.get("redScore").toString()) : 0;
            int blueScore = scoreInfo.containsKey("blueScore") ? Integer.parseInt(scoreInfo.get("blueScore").toString()) : 0;

            //🔴 roundId는 클라이언트가 보낸 걸 사용
            Long roundId = scoreInfo.containsKey("roundId") && scoreInfo.get("roundId") != null
                    ? Long.parseLong(scoreInfo.get("roundId").toString())
                    : null;
            if(roundId == null) {
                log.error("roundId가 누락되었거나 null입니다: {}", scoreInfo);
                webSocketSender.sendError("roundId가 누락되었습니다");
                return;
            }

            //🔴 현재 경기에 대한 정보 가져오기
            MatchProgress matchProgress = matchProgressService.getCurrentProgress();
            int expectedjudgeCount = matchProgress.getJudgeCount();

            //🔴 DB에 저장
            scoresService.saveScore(roundId, judgeDeviceId, redScore, blueScore);

            //🔴 해당 대회의 심판 수와 해당 라운드에 입력된 점수의 수 비교
            int submittedCount = scoresService.countByRoundId(roundId);

            //🔴 심판이 전부 제출하지 않았을 때
            if (submittedCount < expectedjudgeCount) {
                webSocketSender.sendWaiting(roundId);
                return;
            }

            //🔴 심판이 전부 제출했을 때 -> 점수 합하기
            int totalRed = scoresService.sumRedScoreByRound(roundId);
            int totalBlue = scoresService.sumBlueScoreByRound(roundId);
            int roundNumber = scoresService.getRoundNumberById(roundId);

            webSocketSender.sendComplete(roundId, roundNumber, totalRed, totalBlue);

        }catch(Exception e){
            log.error("❌ 점수 처리 중 오류 발생:", e);
        }
    }
}
