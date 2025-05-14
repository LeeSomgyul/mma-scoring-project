import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import SockJS from "sockjs-client";
import axios from "axios";
import { Client } from "@stomp/stompjs";
import { useSearchParams } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid'; 
import BackgroundLayout from "../components/BackgroundLayout";

import { useJudgeStore } from "../stores/useJudgeStore";
import { useJudgeScoreStore } from "../stores/useJudgeScoreStore";
import { useJudgeMatchStore } from "../stores/useJudgeMatchStore";
import { useMatchStore } from "../stores/useMatchStore";

//✅ 아이콘
import {SquareX} from "lucide-react";

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
  const {judgeName,setJudgeName,deviceId,setDeviceId,verified,setVerified, isHydrated} = useJudgeStore();
  const {scores, setScores, submitted, setSubmitted, editing, setEditing, currentRoundIndex, setCurrentRoundIndex} = useJudgeScoreStore();
  const { matchInfo, setMatchInfo } = useJudgeMatchStore();
  const { matches, setMatches, currentIndex, setCurrentIndex } = useMatchStore();
  //✅ 일반
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [inputPassword, setInputPassword] = useState<string>("");
  const [searchParams] = useSearchParams();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastFetchedMatchId, setLastFetchedMatchId] = useState<number | null>(null);
  //✅ 전역 변수
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessCode = searchParams.get("accessCode");
  const navigate = useNavigate();

  //✅ 본부에서 QR에 담아 전송한 deviceID를 심판들 각자 기기에 심기
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const deviceIdFromQR = urlParams.get("deviceId");

    if(deviceIdFromQR){
      localStorage.setItem("judgeDeviceId", deviceIdFromQR);
      useJudgeStore.getState().setDeviceId(deviceIdFromQR);
      console.log("✅ QR로부터 deviceId 저장 완료:", deviceIdFromQR);
    }else{
      const id = getOrCreateDeviceId();
      useJudgeStore.getState().setDeviceId(id);
      console.log("✅ deviceId 새로 생성:", id);
    }
  },[]);

  //✅ fetchInitialData 함수 실행행
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!matchInfo || matches.length === 0) return;
  
    const index = matches.findIndex((m) => m.id === matchInfo.id);
    if (index !== -1) {
      useMatchStore.getState().setCurrentIndex(index);
      console.log("🔄 currentIndex 재설정:", index);
    } else {
      console.warn("⚠️ matchInfo.id에 해당하는 경기 없음");
    }
  }, [matchInfo, matches]);

  //✅ localStorage에서 복원 -> 서버에서 복원 
  useEffect(() => {
    if(!verified || !matchInfo || !isInitialLoad) return;

    if(lastFetchedMatchId === matchInfo.id) return;

    setLastFetchedMatchId(matchInfo.id);

    //🔴 서버에서 최신 점수 덮어쓰기
      const deviceId = localStorage.getItem("judgeDeviceId");

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
  },[verified, matchInfo]);

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
            useJudgeMatchStore.getState().setMatchInfo(newMatch);

            useJudgeScoreStore.setState({
              scores: Array.from({ length: newMatch.roundCount }, () => ({ red: "", blue: "" })),
              submitted: Array.from({ length: newMatch.roundCount }, () => false),
              editing: Array.from({ length: newMatch.roundCount }, (_, i) => i === 0),
              currentRoundIndex: 0,
            });
          }
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

  useEffect(() => {
    if (!matchInfo || !stompClient?.connected) {
      console.warn("⛔ JOINED 안보냄 → 조건 미충족 (matchInfo or stompClient)");
      return;
    }
  
    if (!judgeName || !deviceId) {
      console.warn("⛔ JOINED 안보냄 → judgeName/deviceId 없음");
      return;
    }
  
    // ✅ JOINED 메시지 재전송
    stompClient.publish({
      destination: "/app/join",
      body: JSON.stringify({
        status: "JOINED",
        matchId: matchInfo.id,
        judgeName,
        deviceId,
      }),
    });
  
    console.log("✅ 다음 경기로 전환됨 → JOINED 메시지 재전송:", {
      matchId: matchInfo.id,
      judgeName,
      deviceId
    });
  }, [matchInfo?.id, stompClient?.connected, judgeName, deviceId]);
  

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

  //✅ 경기정보+심판정보+점수 가져오기
  const fetchInitialData = async () => {
    try {
      const deviceId = localStorage.getItem("judgeDeviceId");
      if (!deviceId) {
        console.error("❌ deviceId가 없습니다.");
        return;
      }
  
      //🔴 1. 전체 경기 목록 가져오기
      const matchesResponse = await axios.get(`${baseURL}/api/matches`);
      const matches = matchesResponse.data;
      setMatches(matches);
  
      if (matches.length === 0) {
        console.warn("❌ 경기가 없습니다.");
        return;
      }

      //🔴 2. 현재 진행중인 matchId 가져오기
      const progressResponse = await axios.get(`${baseURL}/api/progress`);
      const currentMatchId = progressResponse.data?.matchId;

      if (!currentMatchId) {
        console.warn("❌ 현재 matchId 없음. 초기화 중단");
        return;
      }
  
       //🔴 3. matchId로 현재 경기 찾기
      const currentMatch = matches.find((m: any) => m.id === currentMatchId);
      if (!currentMatch) {
        console.warn("❌ matchId에 해당하는 match 없음");
        return;
      }
  
      //🔴 4. 해당 경기의 라운드 정보 가져오기
      const roundsResponse = await axios.get(`${baseURL}/api/rounds/match/${currentMatchId}`);
      const rounds = roundsResponse.data;
  
      setMatchInfo({
        ...currentMatch,
        rounds,
      });
  
      //🔴 5. 점수 가져오기 (내 점수만 추출)
      const scoresResponse = await axios.get(`${baseURL}/api/scores/by-match`, {
        params: { matchId: currentMatchId },
      });
      const roundScoresFromServer = scoresResponse.data;
      const myScores: MyScore[] = roundScoresFromServer.map((round: any) => {
        const myScore = round.judges.find((judge: any) => judge.judgeId === deviceId);
        return {
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
  
      setScores(scores);
      setSubmitted(submitted);
      setEditing(editing);
      setCurrentRoundIndex(0);
  
      console.log("✅ 심판 초기 데이터 복원 완료");
    } catch (error) {
      console.error("❌ 심판 초기 데이터 로딩 실패:", error);
    }
  };
  


  //✅ 비밀번호 검증 버튼
  const handleVerify = async() => {
    
    if(!inputPassword){
      alert("비밀번호를 입력해주세요.");
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
        const deviceId = localStorage.getItem("judgeDeviceId");
        if (!deviceId) {
          alert("❌ deviceId가 없습니다. QR을 다시 찍어주세요.");
          return;
        }

        const matchId = matchInfo?.id;
        if (!matchId) {
          alert("❌ matchId가 없습니다. 경기 정보를 다시 불러와주세요.");
          return;
        }

        let judgeResponse;
        try{
          judgeResponse = await axios.post(`${baseURL}/api/judges`, null, {
            params: {
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

        setVerified(true);
        setDeviceId(deviceId);
        setJudgeName(response.data.judgeName);

        localStorage.setItem("verified", "true");
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

    const deviceId = localStorage.getItem("judgeDeviceId");
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

    const deviceId = localStorage.getItem("judgeDeviceId");
    if (!deviceId) {
      alert("❌ deviceId가 없습니다. QR을 다시 찍어주세요.");
      return;
    }
    
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
    const confirmEnd = window.confirm("경기를 종료하시겠습니까?\n(점수 및 상태 초기화)");
    if (!confirmEnd) return;

    localStorage.removeItem("judge-info-storage");
    localStorage.removeItem("judgeDeviceId");
    localStorage.removeItem("verified");

    useJudgeStore.getState().reset?.();
    useJudgeScoreStore.getState().reset?.();
    useJudgeMatchStore.getState().reset?.();

    alert("✅ 데이터가 초기화되었습니다.");
    navigate("/judge-end");
  };
  

  if (!isHydrated) {
    return (
      <BackgroundLayout>
        <div className="text-xl text-center text-white">⏳ 로딩 중...</div>
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      <div className="relative w-[90vw] max-w-[1280px] aspect-[16/10] mx-auto">
        {!verified ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[5%] text-center text-white"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
            <h2 className="mb-4 font-bold" style={{ fontSize: "clamp(24px, 4vw, 40px)" }}>심판 입장</h2>
            <p className="mb-6 font-medium" style={{ fontSize: "clamp(16px, 3vw, 24px)" }}>
              본부에서 전달받은 4자리 비밀번호를 입력해주세요.
            </p>
            <input
              type="text"
              placeholder="비밀번호 입력 (숫자 4자리)"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              maxLength={4}
              className="block w-full max-w-xs px-4 py-3 mx-auto mb-4 text-lg text-black rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleVerify}
              className="block w-full max-w-xs px-6 py-3 mx-auto font-bold text-white text-lg transition-all rounded-full bg-gradient-to-r from-red-500 to-blue-500 shadow-[0_4px_10px_rgba(0,0,0,0.3)] active:scale-95"
            >
              입장하기
            </button>
          </div>
        ) : matchInfo ? (
          <div className="absolute inset-0 flex flex-col items-center px-[5%] py-[3%] overflow-y-auto">
            <div className="mb-6 text-center">
              <span className="font-sans font-bold text-white"
                style={{ fontSize: "clamp(28px, 5vw, 60px)", textShadow: `-1px 0px rgba(0, 0, 0, 0.8), 1px 0px rgba(0, 0, 0, 0.8), 0px -1px rgba(0, 0, 0, 0.8), 0px 1px rgba(0, 0, 0, 0.8)` }}>
                {matchInfo.matchNumber}경기&nbsp;&nbsp;{matchInfo.division}
              </span>
            </div>
            <div className="w-full overflow-hidden rounded shadow-md">
              <div className="grid grid-cols-[0.6fr_1fr_1fr_0.9fr] font-bold text-white text-center">
                <div />
                <div className="flex items-center justify-center bg-red-600 border border-gray-300"
                  style={{ fontSize: "clamp(16px, 3vw, 24px)", height: "min(10vh, 70px)" }}>
                  {matchInfo.redName}({matchInfo.redGym})
                </div>
                <div className="flex items-center justify-center bg-blue-600 border border-gray-300"
                  style={{ fontSize: "clamp(16px, 3vw, 24px)", height: "min(10vh, 70px)" }}>
                  {matchInfo.blueName}({matchInfo.blueGym})
                </div>
                <div />
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "min(37vh, 400px)", scrollbarWidth: "none" }}>
                {Array.from({ length: matchInfo.roundCount }, (_, i) => (
                  <div key={i} className="grid grid-cols-[0.6fr_1fr_1fr_0.9fr] text-center border border-gray-300">
                    <div className="flex items-center justify-center font-bold bg-gray-100 border"
                      style={{ fontSize: "clamp(16px, 3vw, 24px)", height: "min(12vh, 70px)" }}>
                      {i + 1}R
                    </div>
                    <div className="flex items-center justify-center bg-white border">
                      <input type="text" inputMode="numeric" pattern="\d*" placeholder="점수"
                        value={scores[i]?.red ?? ""}
                        onChange={(e) => handleScoreChange(i, "red", e.target.value)}
                        disabled={!editing[i]}
                        className="w-full h-full font-semibold text-center bg-transparent border-none outline-none"
                        style={{ fontSize: "clamp(16px, 3vw, 24px)" }} />
                    </div>
                    <div className="flex items-center justify-center bg-white border">
                      <input type="text" inputMode="numeric" pattern="\d*" placeholder="점수"
                        value={scores[i]?.blue ?? ""}
                        onChange={(e) => handleScoreChange(i, "blue", e.target.value)}
                        disabled={!editing[i]}
                        className="w-full h-full font-semibold text-center bg-transparent border-none outline-none"
                        style={{ fontSize: "clamp(16px, 3vw, 24px)" }} />
                    </div>
                    <div onClick={() => submitted[i] && !editing[i] ? handleEdit(i) : handleSubmit(i)}
                      className={`flex items-center justify-center font-bold text-white cursor-pointer border
                        ${submitted[i] && !editing[i] ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
                      style={{ fontSize: "clamp(16px, 3vw, 24px)", height: "min(12vh, 70px)" }}>
                      {submitted[i] && !editing[i] ? "수정" : submitted[i] ? "재전송" : "전송"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="fixed z-30 flex items-center space-x-4 top-7 right-6">
              <button onClick={handleOut}
                className="p-2 transition-all border rounded-full shadow-lg cursor-pointer bg-white/10 border-white/30 hover:bg-white/20 active:scale-90"
                title="경기 종료">
                <SquareX className="text-white w-14 h-14" />
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white">⏳ 경기 정보를 불러오는 중입니다...</div>
        )}
      </div>
    </BackgroundLayout>
    );
};

export default JudgePage;
