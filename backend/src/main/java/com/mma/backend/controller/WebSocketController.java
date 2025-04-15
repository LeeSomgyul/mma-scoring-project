//⭐ 심판 -> 관리자에게 점수 보내는 기능
package com.mma.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mma.backend.entity.Judges;
import com.mma.backend.entity.MatchProgress;
import com.mma.backend.entity.Scores;
import com.mma.backend.repository.JudgesRepository;
import com.mma.backend.repository.ScoresRepository;
import com.mma.backend.service.MatchProgressService;
import com.mma.backend.service.ScoresService;
import com.mma.backend.utils.WebSocketSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;

@Controller
@Slf4j
@RequiredArgsConstructor
public class WebSocketController {

    private final ObjectMapper objectMapper;
    private final ScoresService scoresService;
    private final WebSocketSender webSocketSender;
    private final JudgesRepository judgesRepository;

    //✅ 심판이 보낸 점수 --(서버: 여기 백엔드)--> 본부석에 점수 전달
    @MessageMapping("/send")
    public void receiveMessage(String message) {

        try{
            //🔴 받은 점수 정보를 JSON -> Map 변환
            Map<String, Object> scoreInfo = objectMapper.readValue(message, Map.class);

            if(!scoreInfo.containsKey("judgeId") || scoreInfo.get("judgeId") == null) {
                log.error("judgeId가 누락되었거나 null입니다: {}", scoreInfo);
                return;
            }

            String judgeDeviceId = scoreInfo.get("judgeId").toString();

            Judges judge = judgesRepository.findByDevicedId(judgeDeviceId)
                    .orElseThrow(() -> new IllegalArgumentException("해당 judge를 찾을 수 없습니다."));

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

            scoresService.saveScore(roundId, judgeDeviceId, redScore, blueScore);

        }catch(Exception e){
            log.error("❌ 점수 처리 중 오류 발생:", e);
        }
    }

    //✅ 심판이 점수 수정할때 실행될 기능
    @MessageMapping("/modify")
    public void handleModifyRequest(String message) {
        try{
            Map<String, Object> data = objectMapper.readValue(message, Map.class);

            if (!data.containsKey("judgeId") || data.get("judgeId") == null ||
                    !data.containsKey("roundId") || data.get("roundId") == null) {
                log.error("❌ judgeId 또는 roundId 누락: {}", data);
                return;
            }

            String judgeDeviceId = data.get("judgeId").toString();
            Long roundId = Long.parseLong(data.get("roundId").toString());

            Judges judge = judgesRepository.findByDevicedId(judgeDeviceId)
                    .orElseThrow(() -> new IllegalArgumentException("해당 심판 없음"));

            //🔴 제출 상태 false로 바꾸기
            scoresService.revertSubmission(roundId, judge.getId());

            //🔴 다시 제출된 심판 목록 뽑아서 본부에 전송
            List<Scores> all = scoresService.getScoresByRoundId(roundId);
            List<String> submittedJudges = all.stream()
                    .filter(Scores::isSubmitted)
                    .map(score -> score.getJudges().getName())
                    .toList();

            Map<String, Object> updated = Map.of(
                    "status", "MODIFIED",
                    "roundId", roundId,
                    "submittedJudges", submittedJudges,
                    "judgeName", judge.getName()
            );

            webSocketSender.sendModified(updated);

        } catch (Exception e) {
            log.error("❌ 수정 처리 중 오류 발생", e);
        }
    }
}
