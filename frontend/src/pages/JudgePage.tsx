import React, { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

const JudgePage: React.FC = () => {

   //✅ test용 데이터터
   const matchInfo = {
    matchNumber: 1,
    division: "아마추어",
    roundCount: 3,
    redName: "홍길동",
    redGym: "부산짐",
    blueName: "김철수",
    blueGym: "서울짐",
  }

  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [scores, setScores] = useState(Array.from({length: matchInfo.roundCount}, () => ({ red: "", blue: "" })));
  const [submitted, setSubmitted] = useState(Array.from({length: matchInfo.roundCount}, () => false));


  //✅ WebSocket 연결결
  useEffect(() => {
    const socket = new SockJS("/ws");

    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,

      onConnect: () => {
        console.log("✅ STOMP 연결 성공");

        stompClient.subscribe("/topic/messages", (message) => {
          console.log("📩 서버로부터 메시지:", message.body);
        });

        //🔴 서버에게 점수 보내기기
        stompClient.publish({
          destination: "/app/send",
          body: JSON.stringify({
            test: "👋 심판이 서버에게 인사합니다!"
          }),
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
    setStompClient(stompClient);

    return () => {
      stompClient.deactivate();
    };
  }, []);

  //✅ 점수 입력 시 상태 반영하는 함수
  const handleScoreChange = (
    roundIndex: number,
    color: "red" | "blue",
    value: string
  ) => {
    if (!/^\d*$/.test(value)) {
      alert("숫자만 입력해주세요!");
      return;
    }

    const newScores = [...scores];
    newScores[roundIndex][color] = value;
    setScores(newScores);
  };

  //✅ 점수 전송 버튼 함수
  const handleSubmit = (roundIndex: number) => {
    const { red, blue } = scores[roundIndex];

    if(red === "" || blue === ""){
      alert("점수를 모두 입력해주세요!");
      return;
    }

    //🔴 라운드 및 심판별 선수 점수 전송 객체
    const result = {
      round: roundIndex + 1,
      redScore: red,
      blueScore: blue,
      judgeId: "judge1"//🔥🔥🔥 나중에 실제 ID로 바꾸기
    };

    if(stompClient && stompClient.connected){
      stompClient.publish({
        destination: "/app/send",
        body: JSON.stringify(result),
      });

      console.log(`📤 ${roundIndex + 1}라운드 점수 전송:`, result);

      const newSubmitted = [...submitted];
      newSubmitted[roundIndex] = true;
      setSubmitted(newSubmitted);
    }else{
      alert("❌ 서버와 연결되지 않았습니다.");
    }
  };

  return (
    <div>
      <div>{matchInfo.matchNumber}경기 {matchInfo.division}</div>
      <div>
        <span>{matchInfo.redName}({matchInfo.redGym})</span>
        <span>{matchInfo.blueName}({matchInfo.blueGym})</span>
      </div>
      <div>
        {Array.from({length: matchInfo.roundCount}, (_, i) => (
          <div key={i}>
            <span>{i+1}라운드</span>
            <input 
              type="number"
              value={scores[i].red}
              onChange={(e) => handleScoreChange(i, "red", e.target.value)}
            />
            <input 
              type="number"
              value={scores[i].blue}
              onChange={(e) => handleScoreChange(i, "blue", e.target.value)}
            />
            <button onClick={() => handleSubmit(i)}>
              {submitted[i] ? "수정" : "전송"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JudgePage;
