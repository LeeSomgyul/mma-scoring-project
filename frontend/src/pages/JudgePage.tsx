import React, { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import axios from "axios";
import { Client } from "@stomp/stompjs";
import { useSearchParams } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid'; 

interface RoundInfo{
  id: number;
  roundNumber: number;
}

interface MatchInfo {
  id: number;
  matchNumber: number;
  division: string;
  roundCount: number;
  redName: string;
  blueName: string;
  redGym: string;
  blueGym: string;
  rounds: RoundInfo[];
}

//✅ UUID생성 + 저장 함수
const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem("judgeDeviceId");
  if(!deviceId){
    deviceId = uuidv4();
    localStorage.setItem("judgeDeviceId", deviceId);
  }
  return deviceId;
};

const JudgePage: React.FC = () => {
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [scores, setScores] = useState<{ red: string; blue: string }[]>([]);
  const [submitted, setSubmitted] = useState<boolean[]>([]);
  const [editing, setEditing] = useState<boolean[]>([]);
  const [name, setName] = useState<string>("");
  const [inputPassword, setInputPassword] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  const [searchParams] = useSearchParams();

  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessCode = searchParams.get("accessCode");
  

  //✅ 비밀번호 검증 버튼
  const handleVerify = async() => {
    
    if(!name || !inputPassword){
      alert("이름과 비밀번호를 모두 입력해주세요.");
      return;
    }

    if (!accessCode) {
      alert("접속 코드(accessCode)가 유효하지 않습니다.");
      return;
    }

    try{
      const response = await axios.post(`${baseURL}/api/judge-access/verify`, {
        password: inputPassword,
        accessCode
      });

      if(response.data === true){
        const deviceId = getOrCreateDeviceId();

        await axios.post(`${baseURL}/api/judges`, null, {
          params: {
            name,
            deviceId
          }
        });

        alert("✅ 인증 성공!");
        setIsVerified(true);
      }else{
        alert("❌ 비밀번호가 일치하지 않습니다.");
      }
    }catch(error){
      console.error("❌ 인증 오류:", error);
      alert("서버 오류가 발생했습니다.");
    }
  }

  // ✅ WebSocket 연결
  useEffect(() => {
    const socket = new SockJS("/ws");

    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,

      onConnect: () => {
        console.log("✅ STOMP 연결 성공");

        client.subscribe("/topic/messages", (message) => {
          console.log("📩 서버로부터 메시지:", message.body);
        });
      },

      onStompError: (frame) => {
        console.error("❌ STOMP 에러:", frame.headers["message"]);
      },

      onWebSocketError: (event) => {
        console.error("❌ WebSocket 에러:", event);
      },

      onDisconnect: () => {
        console.log("🚫 STOMP 연결 종료");
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      client.deactivate();
    };
  }, []);

  // ✅ match 정보 가져오기
  useEffect(() => {
    axios
      .get("/api/matches")
      .then((res) => {
        const firstMatch = res.data[0];
        setMatchInfo(firstMatch);
        setScores(
          Array.from({ length: firstMatch.roundCount }, () => ({ red: "", blue: "" }))
        );
        setSubmitted(Array.from({ length: firstMatch.roundCount }, () => false));
        setEditing(Array.from({ length: firstMatch.roundCount }, () => false));
      })
      .catch((err) => {
        console.error("❌ match 정보 가져오기 실패:", err);
      });
  }, []);

  // ✅ 점수 입력
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

  // ✅ 점수 전송
  const handleSubmit = (roundIndex: number) => {
    const { red, blue } = scores[roundIndex];

    if (red === "" || blue === "") {
      alert("점수를 모두 입력해주세요!");
      return;
    }

    const deviceId = localStorage.getItem("judgeDeviceId");

    if (!deviceId) {
      alert("❌ deviceId가 없습니다. 다시 로그인해주세요.");
      return;
    }

    const result = {
      roundId: matchInfo?.rounds?.[roundIndex]?.id,
      redScore: parseInt(red),
      blueScore: parseInt(blue),
      judgeId: deviceId,
    };

    console.log("📤 보낼 점수 메시지:", result);

    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/send",
        body: JSON.stringify(result),
      });


      const newSubmitted = [...submitted];
      newSubmitted[roundIndex] = true;
      setSubmitted(newSubmitted);

      const newEditing = [...editing];
      newEditing[roundIndex] = false;
      setEditing(newEditing);

      if (editing[roundIndex]) {
        alert("수정 완료!");
      } else {
        alert("전송 완료!");
      }
    } else {
      alert("❌ 서버와 연결되지 않았습니다.");
    }
  };

  // ✅ 수정 버튼
  const handleEdit = (roundIndex: number) => {
    const newEditing = [...editing];
    newEditing[roundIndex] = true;
    setEditing(newEditing);
  };

  return (
    <div>
      {!isVerified ? (
        <div>
          <h3>🧑‍⚖️ 심판 입장</h3>
          <input
            type="text"
            placeholder="이름을 입력하세요."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="비밀번호 입력 (숫자 4자리)"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            maxLength={4}
          />
          <button onClick={handleVerify}>입장하기</button>
        </div>
      ) : matchInfo ? (
        <>
          <div>{matchInfo.matchNumber}경기 {matchInfo.division}</div>
          <div>
            <span>{matchInfo.redName}({matchInfo.redGym})</span>
            <span>{matchInfo.blueName}({matchInfo.blueGym})</span>
          </div>
          <div>
            {Array.from({ length: matchInfo.roundCount }, (_, i) => (
              <div key={i}>
                <span>{i + 1}라운드</span>
                <input
                  type="number"
                  value={scores[i].red}
                  onChange={(e) => handleScoreChange(i, "red", e.target.value)}
                  disabled={!editing[i] && submitted[i]}
                />
                <input
                  type="number"
                  value={scores[i].blue}
                  onChange={(e) => handleScoreChange(i, "blue", e.target.value)}
                  disabled={!editing[i] && submitted[i]}
                />
                {submitted[i] && !editing[i] ? (
                  <button onClick={() => handleEdit(i)}>수정</button>
                ) : (
                  <button onClick={() => handleSubmit(i)}>
                    {submitted[i] ? "재전송" : "전송"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>⏳ 경기 정보를 불러오는 중입니다...</div>
      )}
    </div>
  );
};

export default JudgePage;
