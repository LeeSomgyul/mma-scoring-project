import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import SockJS from "sockjs-client";
import axios from "axios";
import { Client } from "@stomp/stompjs";
import { useSearchParams } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid'; 

import { useJudgeStore } from "../stores/useJudgeStore";
import { useJudgeScoreStore } from "../stores/useJudgeScoreStore";
import { useJudgeMatchStore } from "../stores/useJudgeMatchStore";
import { useMatchStore } from "../stores/useMatchStore";

interface MyScore {
  red: string;
  blue: string;
  submitted: boolean;
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
  //✅ zustand 상태 연결
  const {judgeName,setJudgeName,deviceId,setDeviceId,verified,setVerified} = useJudgeStore();
  const {scores, setScores, submitted, setSubmitted, editing, setEditing, currentRoundIndex, setCurrentRoundIndex} = useJudgeScoreStore();
  const isHydrated = useJudgeScoreStore((state) => state.isHydrated);
  const { matchInfo, setMatchInfo } = useJudgeMatchStore();
  const { matches, setMatches, currentIndex, setCurrentIndex } = useMatchStore();
  //✅ 일반
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [inputPassword, setInputPassword] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  const [searchParams] = useSearchParams();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastFetchedMatchId, setLastFetchedMatchId] = useState<number | null>(null);
  //✅ 전역 변수
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessCode = searchParams.get("accessCode");
  const navigate = useNavigate();

  //🔥테스트용(나중에 삭제 가능)
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const log = (msg: string) => {
    console.log(msg); // 콘솔도 남기고
    setDebugLog(prev => [...prev.slice(-10), msg]); // 최근 10개까지 유지
  };

  //✅ devicedID가 judge페이지 들어오자마자 저장되도록
  useEffect(() => {
    const id = getOrCreateDeviceId();
    log("✅ 초기 deviceId 확보:" + id);
  },[]);

  useEffect(() => {
    if (!matchInfo || !isHydrated || matches.length === 0) return;
  
    const index = matches.findIndex((m) => m.id === matchInfo.id);
    if (index !== -1) {
      useMatchStore.getState().setCurrentIndex(index);
      console.log("🔄 currentIndex 재설정:", index);
    } else {
      console.warn("⚠️ matchInfo.id에 해당하는 경기 없음");
    }
  }, [matchInfo, isHydrated, matches]);

  //✅ localStorage에서 복원 -> 서버에서 복원 
  useEffect(() => {
    if(!isVerified || !isHydrated || !matchInfo || !isInitialLoad) return;

    if(lastFetchedMatchId === matchInfo.id) return;

    setLastFetchedMatchId(matchInfo.id);

    //🔴 서버에서 최신 점수 덮어쓰기
      const deviceId = getOrCreateDeviceId();
      if(!deviceId) return;

      console.log("📦 score 요청 시 matchId:", matchInfo?.id);

      axios.get(`${baseURL}/api/scores/by-match`, {
        params: {matchId: matchInfo.id }
      })
      .then(response => {
        const myScores: MyScore[] = response.data.map((round: any) => {
          const myScore = round.judges.find((judge: any) => judge.judgeId === deviceId);

          return{
            red: myScore?.red?.toString() ?? "",
            blue: myScore?.blue?.toString() ?? "",
            submitted: myScore?.submitted ?? false,
          };
        });

        const scores = myScores.map((s) => ({ red: s.red, blue: s.blue }));
        const submitted = myScores.map((s) => s.submitted);
        const editing = submitted.map((s, i) => {
          if (i === 0) return !submitted[0];
          return submitted[i - 1] && !s;
        });

        useJudgeScoreStore.setState({
          scores,
          submitted,
          editing,
          currentRoundIndex: 0,
        });

        setSubmitted(submitted);
        setEditing(editing);
        setCurrentRoundIndex(0);

        console.log("✅ 서버 점수 기반으로 상태 복원 완료");
      })
      .catch(err => {
        console.error("❌ 서버 점수 복원 실패:", err);
      })
      .finally(() => {
        setIsInitialLoad(false);
      });
  },[isVerified, isHydrated, matchInfo]);

  //✅ 해당 브라우저 페이지가 처음 QR로 입장한건지 감지하기 위한 코드
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get("matchId");
    const judgeId = urlParams.get("judgeId");
  
    if (matchId && judgeId) {
      sessionStorage.setItem("enteredViaQR", "true");
      window.location.href = window.location.href; 
    }
  }, []);


  //✅ 심판이 새로고침하거나 나갔다가 돌아왔을 떄, 다시 로그인하지 않아도 되는 것. 
  useEffect(() => {
    //🔴matchId 비교해서 이전 경기의 로컬 남아있음 초기화.(이유: 크롬에서 삭제가 잘 안됨.)
    const saved = localStorage.getItem("judge-score-storage");
    const enteredViaQR = sessionStorage.getItem("enteredViaQR");

    if (saved && matchInfo && enteredViaQR === "true") {
      const parsed = JSON.parse(saved);
  
      if (
        parsed.matchId !== matchInfo.id ||
        parsed.matchNumber !== matchInfo.matchNumber ||
        parsed.roundCount !== matchInfo.roundCount
      ) {
        localStorage.removeItem("judge-score-storage");
        sessionStorage.removeItem("enteredViaQR");
        window.location.reload();
      }
    }

    //🔴 심판이 새로고침 및 나갔다와도 데이터 안날라가도록
    const restoredDeviceId = localStorage.getItem("judgeDeviceId");
    const restoredName = useJudgeStore.getState().judgeName;
    const wasVerified = useJudgeStore.getState().verified;

    if (restoredDeviceId && restoredName && wasVerified) {
      setIsVerified(true);
      console.log("✅ 자동 인증 복원됨:", restoredName);
    }
  },[matchInfo]);

  // ✅ WebSocket 연결
  useEffect(() => {
    const socket = new SockJS("/ws");
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,

      onConnect: () => {
        //🔴 기존 경기 정보 연결
        client.subscribe("/topic/messages", (message) => {
          console.log("📩 서버로부터 메시지:", message.body);
        });

        //🔴 다음 경기 정보 받기 및 초기화
        client.subscribe("/topic/next-match", (message) => {
          const newMatch = JSON.parse(message.body);
          if (!newMatch.rounds || newMatch.rounds.length === 0) {
            console.error("❌ rounds 배열이 비어 있거나 누락됨:", newMatch);
            return;
          }

          //🔴 본부에서 '다음경기'를 눌렀을 때만 초기화
          if (matchInfo?.id !== newMatch.id) {
            setMatchInfo(newMatch);

            useJudgeScoreStore.setState({
              scores: Array.from({ length: newMatch.roundCount }, () => ({ red: "", blue: "" })),
              submitted: Array.from({ length: newMatch.roundCount }, () => false),
              editing: Array.from({ length: newMatch.roundCount }, (_, i) => i === 0),
              currentRoundIndex: 0,
            });
          }
        });

        if(!isHydrated) return;

        //🔴 최초 연결 시 초기 경기 정보 가져오기
        axios
          .get("/api/matches")
          .then(async(res) => {
            const matches = res.data;

            const currentIndex = useMatchStore.getState().currentIndex;
            const currentMatch = matches[currentIndex];

            const roundsResponse = await axios.get(`/api/rounds/match/${currentMatch.id}`);
            const rounds = roundsResponse.data;

            useMatchStore.setState({matches});

            setMatchInfo({
              ...currentMatch,
              rounds,
            });

            const existingScores = useJudgeScoreStore.getState().scores;

            if(existingScores.length === 0){
              setScores(Array.from({ length: currentMatch.roundCount }, () => ({ red: "", blue: "" })));
              setSubmitted(Array.from({ length: currentMatch.roundCount }, () => false));
              setEditing(Array.from({ length: currentMatch.roundCount }, (_, i) => i === 0));
              setCurrentRoundIndex(0);
            }
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
  }, [isHydrated]);

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
    
    if(!judgeName || !inputPassword){
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

        const matchId = matchInfo?.id;
        if (!matchId) {
          alert("❌ matchId가 없습니다. 경기 정보를 다시 불러와주세요.");
          return;
        }

        let judgeResponse;
        try{
          judgeResponse = await axios.post(`${baseURL}/api/judges`, null, {
            params: {
              name: judgeName,
              deviceId,
              matchId,
            },
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
        setVerified(true);//🔴 zustand에도 반영
        setDeviceId(deviceId);
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

    const newScores = scores.map((score, i) => 
      i === roundIndex ? {...score, [color]: value}: score
    );

    setScores(newScores);
    useJudgeScoreStore.setState({ 
      scores: newScores,
      submitted: [...submitted],
      editing: [...editing],
      currentRoundIndex,
    });
  };

  // ✅ 점수 전송
  const handleSubmit = (roundIndex: number) => {
    const { red, blue } = scores[roundIndex];

    if (red === "" || blue === "") {
      alert("점수를 모두 입력해주세요!");
      return;
    }

    const deviceId = getOrCreateDeviceId();
    if (!deviceId) {
      alert("❌ deviceId가 없습니다. 다시 로그인해주세요.");
      return;
    }

    if (!matchInfo || !matchInfo.rounds || !matchInfo.rounds[roundIndex]) {
      alert("❌ 경기 정보가 올바르지 않습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
  
    const roundId = matchInfo.rounds[roundIndex].id;
    if (!roundId) {
      alert("❌ 라운드 정보가 누락되었습니다. 관리자에게 문의하세요.");
      return;
    }

    
    const result = {
      roundId,
      redScore: parseInt(red),
      blueScore: parseInt(blue),
      judgeId: deviceId,
    };

    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/send",
        body: JSON.stringify(result),
      });

      const newScores = scores.map((score, i) => ({...score}));
      const newSubmitted = [...submitted];
      const newEditing = [...editing];

      newSubmitted[roundIndex] = true;
      newEditing[roundIndex] = false;

      //🔴 zustand에 저장
      useJudgeScoreStore.setState({
        scores: newScores,
        submitted: newSubmitted,
        editing: newEditing,
        currentRoundIndex,
      });

      setScores(newScores);
      setSubmitted(newSubmitted);
      setEditing(newEditing);

      alert(submitted[roundIndex] ? "수정 완료!" : "전송 완료!");
    } else {
      alert("❌ 서버와 연결되지 않았습니다.");
    }
  };

  // ✅ 수정 버튼
  const handleEdit = (roundIndex: number) => {
    const newScores = scores.map((score) => ({...score}));
    const newSubmitted = [...submitted];
    const newEditing = [...editing];

    newEditing[roundIndex] = true;

    //🔴 zustand에도 저장
    useJudgeScoreStore.setState({
      scores: newScores,
      submitted: newSubmitted,
      editing: newEditing,
      currentRoundIndex,
    });

    setEditing(newEditing);

    const deviceId = getOrCreateDeviceId();
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
    }
  };

  //✅ 경기 종료 시 로컬스토리지 초기화 버튼
  const handleOut = () => {
    const confirmEnd = window.confirm("경기를 종료하시겠습니까?(초기화)");
    if (!confirmEnd) return;

    localStorage.removeItem("judge-score-storage");
    localStorage.removeItem("judge-info-storage");
    localStorage.removeItem("judge-match-storage");

    alert("✅ 데이터가 초기화되었습니다.");
    navigate("/judge-end");
  };

  return (
    <div>
      {!isVerified ? (
        <div>
          <h3>🧑‍⚖️ 심판 입장</h3>
          <input
            type="text"
            placeholder="이름을 입력하세요."
            value={judgeName ?? ""}
            onChange={(e) => setJudgeName(e.target.value)}
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
          <button onClick={handleOut}>
            경기종료
          </button>
        </>
        ) : (
          <div>⏳ 경기 정보를 불러오는 중입니다...</div>
        )}

      {/*🔥테스트용 로그보기(나중에 삭제 가능) */}
      <div style={{ background: '#f0f0f0', padding: '10px', fontSize: '12px' }}>
        <strong>📋 DEBUG LOG</strong>
        <ul>
          {debugLog.map((line, index) => <li key={index}>{line}</li>)}
        </ul>
      </div>
      </div>
    );
};

export default JudgePage;
