import React, { useEffect } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const JudgePage: React.FC = () => {
  useEffect(() => {
    const socket = new SockJS("/ws");

    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,

      onConnect: () => {
        console.log("✅ STOMP 연결 성공");

        // 메시지 수신
        stompClient.subscribe("/topic/messages", (message) => {
          console.log("📩 서버로부터 메시지:", message.body);
        });

        // 메시지 전송
        stompClient.publish({
          destination: "/app/send",
          body: "👋 심판이 서버에게 인사합니다!",
        });
      },

      onStompError: (frame) => {
        console.error("❌ STOMP 에러:", frame.headers["message"]);
      },

      onWebSocketError: (event) => {
        console.error("❌ WebSocket 에러:", event);
      },

      onDisconnect: () => {
        console.log("🔌 STOMP 연결 종료");
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, []);

  return (
    <div>
      <h2>⚖️ 심판 페이지입니다</h2>
    </div>
  );
};

export default JudgePage;
