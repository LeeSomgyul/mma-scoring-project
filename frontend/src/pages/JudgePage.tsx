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
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessCode = searchParams.get("accessCode");
  

  // ✅ WebSocket 연결
  useEffect(() => {
    const socket = new SockJS("/ws");

    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,

      onConnect: () => {
        console.log("✅ STOMP 연결 성공");

        //🔴 기존 경기 정보 연결
        client.subscribe("/topic/messages", (message) => {
          console.log("📩 서버로부터 메시지:", message.body);
        });

        //🔴 다음 경기 정보 받기 및 초기화
        client.subscribe("/topic/next-match", (message) => {

          const newMatch = JSON.parse(message.body);

          //🔥🔥 테스트 로그(나중에 삭제 - if문까지)
          console.log("🔥 새 경기 정보:", JSON.stringify(newMatch, null, 2)); // 구조화된 출력
          console.log("🔥 rounds 배열:", newMatch.rounds);
          if (!newMatch.rounds || newMatch.rounds.length === 0) {
            console.error("❌ rounds 배열이 비어 있거나 누락됨:", newMatch);
          }

          setMatchInfo(newMatch);

          setScores(Array.from({length: newMatch.roundCount}, () => ({ red: "", blue: "" })));
          setSubmitted(Array.from({ length: newMatch.roundCount }, () => false));
          setEditing(Array.from({ length: newMatch.roundCount }, (_, i) => i === 0));
          setCurrentRoundIndex(0);
        });


        //🔴 최초 연결 시 초기 경기 정보 가져오기
        axios
          .get("/api/matches")
          .then(async(res) => {
            const firstMatch = res.data[0];
            const roundsResponse = await axios.get(`/api/rounds/match/${firstMatch.id}`);
            const rounds = roundsResponse.data;

            const fullMatchInfo = {
              ...firstMatch,
              rounds: rounds,
            };

            setMatchInfo(fullMatchInfo);
            setScores(Array.from({length: firstMatch.roundCount}, () => ({ red: "", blue: "" }))
          );
          setSubmitted(Array.from({ length: firstMatch.roundCount }, () => false));
          setEditing(Array.from({ length: firstMatch.roundCount }, (_, i) => i === 0));
          setCurrentRoundIndex(0)
          })
          .catch((err) => console.error("❌ match 정보 가져오기 실패:", err));
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

  //✅ 심판이 라운드 순서대로 열 수 있도록 input제어
  useEffect(() => {
    const newEditing = [...editing];

    for(let i = 0; i < submitted.length; i++){
      if(submitted[i] && !submitted[i+1]){
        newEditing[i + 1] = true;
        break;
      }
    }

    setEditing(newEditing);
  }, [submitted]);



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

        let judgeResponse;
        try{
          judgeResponse = await axios.post(`${baseURL}/api/judges`, null, {
            params: {name, deviceId},
            validateStatus: () => true
          });
        }catch(error){
          console.error("❌ 심판 등록 실패:", error);
          alert("❌ 심판 등록 중 오류 발생");
          return;
        }

        if(judgeResponse.status === 403){
          alert("🚫 이미 심판 인원이 모두 입장했습니다.");
          return;
        }

        alert("✅ 인증 성공!");
        setIsVerified(true);
      }else{
        alert("❌ 비밀번호가 일치하지 않습니다.");
      }
    }catch(error:any){
      if(error.response?.status === 403){
        alert("🚫 이미 심판 인원이 모두 입장했습니다.");
      }else{
        console.error("❌ 인증 오류:", error);
        alert("서버 오류가 발생했습니다.");
      }
    }
  }

  

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

    //🔥🔥🔥아래 if2개까지 삭제 가능(디버그용)
    console.log("🔍 현재 matchInfo (전송 전):", JSON.stringify(matchInfo, null, 2));
    console.log("🔍 현재 roundIndex:", roundIndex);
    if (!matchInfo || !matchInfo.rounds || !matchInfo.rounds[roundIndex]) {
      console.error("❌ 경기 정보 또는 rounds 데이터 누락:", matchInfo);
      alert("❌ 경기 정보가 올바르지 않습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }

    const roundId = matchInfo.rounds[roundIndex].id;

    //🔥🔥🔥 디버그 용으로 삭제 가능
    if (!roundId) {
      console.error("❌ roundId가 undefined! 아래 matchInfo.rounds 로그 확인:", {
        roundIndex,
        rounds: matchInfo?.rounds,
        matchInfo,
      });
      alert("❌ 라운드 정보가 누락되었습니다. 관리자에게 문의하세요.");
      return;
    }

    const result = {
      roundId,
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

      if (submitted[roundIndex]) {
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

    const deviceId = localStorage.getItem("judgeDeviceId");
    const roundId = matchInfo?.rounds?.[roundIndex]?.id;

    if(stompClient && stompClient.connected && deviceId && roundId){
      const modifyMessage = {
        judgeId: deviceId,
        roundId: roundId,
        judgeName: name,
        status: "MODIFIED"
      };

      stompClient.publish({
        destination: "/app/modify",
        body: JSON.stringify(modifyMessage)
      });
  
      console.log("✏️ 수정 요청 전송:", modifyMessage);
    }
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
                  disabled={!editing[i]}
                />
                <input
                  type="number"
                  value={scores[i].blue}
                  onChange={(e) => handleScoreChange(i, "blue", e.target.value)}
                  disabled={!editing[i]}
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
