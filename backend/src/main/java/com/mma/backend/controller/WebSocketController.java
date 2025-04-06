//⭐ 심판 -> 관리자에게 점수 보내는 기능
package com.mma.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@Slf4j
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    //🔴심판이 보낸 점수 --(서버: 여기 백엔드)--> 본부석에 점수 전달
    @MessageMapping("/send")
    public void receiveMessage(String message) {
        log.info("📥 서버가 받은 메시지: {}", message);
        messagingTemplate.convertAndSend("/topic/messages", message);
    }
}
