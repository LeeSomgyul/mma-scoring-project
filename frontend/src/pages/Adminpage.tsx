import React, {useEffect, useState, useRef} from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import * as XLSX from "xlsx";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";

//✅ zustand store import
import { useMatchStore } from "../stores/useMatchStore";
import { useScoreStore } from "../stores/useScoreStore";
import { useQRStore } from "../stores/useQRStore";
import type { RoundScore, JudgeScore } from "../stores/useScoreStore";
import type { Match } from "../stores/useMatchStore";

//✅ 아이콘
import { ChevronDown } from "lucide-react";


const Adminpage: React.FC = () => {
    
    //✅ zustand 상태 적용
    const { matches, setMatches, currentIndex, setCurrentIndex } = useMatchStore();
    const { roundScores, setRoundScores, currentRoundIndex, setCurrentRoundIndex, scoreStatus, setScoreStatus } = useScoreStore();
    const { showQRButton, setShowQRButton, qrGenerated, setQrGenerated, isPasswordSet, setIsPasswordSet, accessCode, setAccessCode,  isFileUploaded, setIsFileUploaded } = useQRStore();
    
    //✅ 일반
    const [showQR, setShowQR] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState<string>("");
    const [judgeCount, setJudgeCount] = useState<number | null>(null);
    const [judgeName, setJudgeName] = useState<string[]>([]);
    const [judgeQRList, setJudgeQRList] = useState<{ name: string; deviceId: string }[]>([]);
    const [isReconnected, setIsReconnected] = useState(false);
    const initializedOnceRef = useRef(false);



    //✅ 전역으로 쓰이는 코드드
    const baseURL = import.meta.env.VITE_API_BASE_URL;
    const current = matches[currentIndex];
    const navigate = useNavigate();

    //✅ 레드, 블루 총합 구하기
    const redTotal = roundScores.reduce((sum, round) => {
        const allSubmitted = round.judges.length > 0 && round.judges.every(j => j.submitted);
        if (!allSubmitted) return sum;
        const redSum = round.judges.reduce((r, judge) => r + (judge.red ?? 0), 0);
        return sum + redSum;
      }, 0);
      
    const blueTotal = roundScores.reduce((sum, round) => {
        const allSubmitted = round.judges.length > 0 && round.judges.every(j => j.submitted);
        if (!allSubmitted) return sum;
        const blueSum = round.judges.reduce((b, judge) => b + (judge.blue ?? 0), 0);
        return sum + blueSum;
    }, 0);

            
    //✅ fetchInitialData 함수 자동 실행
    useEffect(() => {
        fetchInitialData();
    }, []);

    //✅ QR 정보를 서버에서 가져오기(진행중인 경기, 심판, deviceId 등)
    useEffect(() => {
        const currentMatchId = matches[currentIndex]?.id;

        // 🔴 매치 없으면 요청 안함
        if (!currentMatchId) return;
      
        axios.get(`${baseURL}/api/progress/${currentMatchId}/qr-generated`)
          .then((res) => {
            console.log("✅ QR 상태 복원:", res.data);
            if (res.data.qrGenerated) {
              setQrGenerated(true);
              setShowQRButton(true);
              setIsPasswordSet(res.data.isPasswordSet);
              if (res.data.accessCode) {
                setAccessCode(res.data.accessCode);
              }
            }
          })
          .catch((error) => {
            console.error("❌ QR 상태 가져오기 실패:", error);
          });
      }, [matches, currentIndex]); 

    //✅ WebSocket 연결
    useEffect(() => {
        let stompClient: Client;

        const runWebSocket = () => {
            const socket = new SockJS(`${baseURL}/ws`);
            stompClient = new Client({
                webSocketFactory: () => socket,
                reconnectDelay: 5000,
                onConnect: () => {
                    console.log("✅ 본부석 WebSocket 연결 완료");
                    setIsReconnected(true);
    
                    //🔴 서버에서 점수 받기
                    stompClient.subscribe("/topic/messages", (message) => {
                        try{
                            const parsed = JSON.parse(message.body);
                            console.log("✅ 받은 점수 전체 메시지:", parsed);
                            
                            //🔴 심판이 점수 '수정중' 상태라면
                            if (parsed.status === "MODIFIED") {
                                const roundId = Number(parsed.roundId);
                                const judgeName = parsed.judgeName?.trim(); 
                            
                                setRoundScores(prev =>
                                    prev.map(round => {
                                        if (round.roundId !== roundId) return round;
                                        const updatedJudges = round.judges.map(j =>
                                            j.judgeName.trim() === judgeName
                                                ? { ...j, red: null, blue: null, submitted: false, isConnected: j.isConnected}
                                                : j
                                        );
                                    return { ...round, judges: updatedJudges };
                                    })
                                );
                            }
    
                            if (parsed.status === "JOINED" && parsed.judgeName) {
                                const judgeName = parsed.judgeName.trim();
                            
                                setRoundScores(prev =>
                                    prev.map(round => ({
                                        ...round,
                                        judges: round.judges.map(j =>
                                            j.judgeName.trim() === judgeName
                                                ? { ...j, isConnected: true }
                                                : j
                                        )
                                    }))
                                );
                            }
    
                            //🔴 심판 전원은 미제출 했지만 소수만 제출한 상황 
                            if (parsed.status === "WAITING") {
                                const roundId = Number(parsed.roundId);
                                const submittedJudges: { name: string; red: number; blue: number }[] = parsed.submittedJudges ?? [];
                            
                                setRoundScores(prev =>
                                    prev.map(round => {
                                        if (round.roundId !== roundId) return round;
                                        const updatedJudges = round.judges.map(j => {
                                            const found = submittedJudges.find(s => s.name.trim() === j.judgeName.trim());
                                            return found
                                            ? { ...j, submitted: true, red: found.red, blue: found.blue, isConnected: j.isConnected }
                                            : {...j, isConnected: j.isConnected};
                                        });
                                        return { ...round, judges: updatedJudges };
                                    })
                                );
                            }
                            
                            if (parsed.status === "COMPLETE") {
                                const roundId = Number(parsed.roundId);
                                const submittedJudges: { name: string; red: number; blue: number }[] = parsed.submittedJudges ?? [];
                            
                                setRoundScores(prev =>
                                    prev.map(round => {
                                        if (round.roundId !== roundId) return round;
    
                                        const updatedJudges = round.judges.map(j => {
                                            const match = submittedJudges.find(s => s.name.trim() === j.judgeName.trim());
                                            return match
                                            ? { ...j, submitted: true, red: match.red, blue: match.blue, isConnected: j.isConnected }
                                            : { ...j, isConnected: j.isConnected };
                                        });
                                        return { ...round, judges: updatedJudges };
                                    })
                                );
                            
                                setScoreStatus("✅ 합산 완료!");
                            }
    
                        }catch(e){
                            console.error("❌ 메시지 json 변경 실패:", e);
                        }
                    });
                },
    
                onStompError: (frame) => console.error("❌ STOMP 에러:", frame.headers["message"]),
                onWebSocketError: (event) => console.error("❌ WebSocket 에러:", event)
            });
    
            stompClient.activate();
        };
        runWebSocket();

        return () => {
            if (stompClient) stompClient.deactivate();
          };
    }, []);



    //✅ 초기 라운드 수만큼 점수 미리 채워두기
    useEffect(() => {
        if (
          matches.length > 0 &&
          roundScores.length === 0 &&
          !initializedOnceRef.current
        ) {
          const currentMatch = matches[currentIndex];
      
          axios.get(`${baseURL}/api/rounds/match/${currentMatch.id}`)
            .then((res) => {
              const roundList = res.data;
              const initialRoundScores: RoundScore[] = roundList.map((round: any) => ({
                roundId: round.id,
                roundNumber: round.roundNumber,
                judges: [],
              }));
              setRoundScores(initialRoundScores);
              initializedOnceRef.current = true;
            });
        }
      }, [matches, currentIndex, roundScores.length]);


    //✅ 새로고침 시 경기목록+점수+선수정보 가져오기
    const fetchInitialData = async() => {
        try{
            //🔴 전체 경기 목록 가져오기
            const matchesResponse = await axios.get(`${baseURL}/api/matches`);
            const matches = matchesResponse.data;
            setMatches(matches);

            if(matches.length === 0){
                console.warn("❌ 경기가 없습니다.");
                return;
            }

            //🔴 첫 번째 경기로 currentIndex 0 설정
            const firstMatchId = matches[0].id;
            setCurrentIndex(0);

            //🔴 현재 matchId로 점수 가져오기(경기에 맞는 점수)
            const scoresResponse = await axios.get(`${baseURL}/api/scores/by-match`,{
                params: {matchId: firstMatchId},
            });
            const roundScoresFromServer = scoresResponse.data;

            //🔴 현재 matchId로 심판 목록 가져오기(경기에 맞는 심판)
            const judgesResponse = await axios.get(`${baseURL}/api/judges/current`, {
                params: {matchId: firstMatchId},
            });
            const judgeList = judgesResponse.data;

            console.log("✅ 초기 로딩: matches:", matches);
            console.log("✅ 초기 로딩: roundScores:", roundScoresFromServer);
            console.log("✅ 초기 로딩: judgeList:", judgeList);

            const mergedRoundScores = roundScoresFromServer.map((round: any) => ({
                roundId: round.roundId,
                roundNumber: round.roundNumber,
                judges: judgeList.map((judge: any) => ({
                  judgeName: judge.name,
                  red: null,
                  blue: null,
                  submitted: false,
                  isConnected: judge.connected,
                })),
              }));
          
              setRoundScores(mergedRoundScores);
              setScoreStatus("⏳ 점수 대기 중...");
        } catch (error) {
            console.error("❌ 초기 데이터 로딩 실패:", error);
        }
    };



    //✅ input 엑셀 선택 기능
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files.length > 0){
            const selectedFile = e.target.files[0];
            setFile(selectedFile);

            //🔴 시트 이름 가져오기(사용자가 엑셀 시트 선택 가능)
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook =  XLSX.read(data, { type: "array" });
                const sheetNames = workbook.SheetNames;
                setSheetNames(sheetNames);
            };
            reader.readAsArrayBuffer(selectedFile);
        }
    };

    //✅ 액셀 업로드 버튼
    const handleFileUpload = async () => {

        if (!file) {
            alert("엑셀 파일을 선택해주세요!");
            return;
        }
    
        if (selectedSheet === null) {
            alert("시트를 선택해주세요!");
            return;
        }
    
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sheet", String(selectedSheet + 1));
        
    
        try {
            await axios.post(`${baseURL}/api/matches/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            alert("✅ 파일 업로드 성공!");

            await fetchInitialData();

            setIsFileUploaded(true);
            setShowQRButton(true);
            setIsModalOpen(false);

        }catch(error:any){
            console.error("❌ 업로드 실패:", error);
            console.error("📥 서버 응답:", error.response?.data);
        }
    };

    //✅ 팝업창 열기 버튼
    const handleModalOpen = () => {
        if(isFileUploaded){
            const confirmModify = confirm("정말 파일을 수정하시겠습니까?");
            if (!confirmModify) return;
        }
        setIsModalOpen(true);
    };

    //✅ 팝압창 닫기 버튼
    const handleModalClose = () => {
        setIsModalOpen(false);
    };
    
    
    //✅ 다음 경기로 전환
    const handleNext = async () => {
        const isLastMatch = currentIndex === matches.length -1;

        if(isLastMatch){
            alert("⚠️ 현재 경기가 마지막 경기입니다.");
            return;
        }
        
        const confirmNext = window.confirm("⚠️ 다음 경기로 이동하시겠습니까?");
        if (!confirmNext) return;

        try {
            const currentMatch = matches[currentIndex];
            const response = await axios.post(`${baseURL}/api/progress/next`, null, {
                params: { currentMatchId: currentMatch.id },
            });
        
            if (response.status === 200) {
                const nextMatchId = response.data?.nextMatchId;
      
            if (nextMatchId) {
              const [matchesRes, roundsRes, judgesRes] = await Promise.all([
                axios.get(`${baseURL}/api/matches`),
                axios.get(`${baseURL}/api/rounds/match/${nextMatchId}`),
                axios.get(`${baseURL}/api/judges/current`, {
                    params:{matchId: nextMatchId},
                }),
              ]);
      
              const allMatches = matchesRes.data;
              const roundList = roundsRes.data;
              const judgeList = judgesRes.data;

              console.log("handlenext에서의 judgelist: ", judgeList);
      
              const nextIndex = allMatches.findIndex((m: Match) => m.id === nextMatchId);
              if (nextIndex === -1) {
                alert("❌ 다음 경기 ID를 찾을 수 없습니다.");
                return;
              }
      
              const roundScoresWithJudges: RoundScore[] = roundList.map((round: any) => ({
                roundId: round.id,
                roundNumber: round.roundNumber,
                judges: judgeList.length > 0
                        ? judgeList.map((judge: any) => ({
                            judgeName: judge.name,
                            red: null,
                            blue: null,
                            submitted: false,
                        }))
                        : [],
                }));

      
              setRoundScores(roundScoresWithJudges);

              setMatches(allMatches);
              setCurrentIndex(nextIndex);
      
              setCurrentRoundIndex(0);
              setScoreStatus("⏳ 점수 대기 중...");
              setIsReconnected(true);
            }
          } else {
            alert("❌ 다음 경기로 이동 실패");
          }
        } catch (error) {
          console.error("❌ 다음 경기 전환 오류:", error);
          alert("서버 오류가 발생했습니다.");
        }
      };
      

    //✅ 모든 라운드 점수를 받아야지만 '다음 경기' 버튼 클릭 가능
    const isAllScoresSubmitted = () => {
        return roundScores.every(round =>
            round.judges.length > 0 && round.judges.every(judge => judge.submitted)
        );
    };

    //✅ 심판 입장 비밀번호 지정 및 qr 생성성
    const handleSavePasswordAndGenerateQRs = async () => {
        if(!judgeCount || judgeCount < 1){
            alert("심판 수를 1명 이상 입력해주세요!");
            return;
        }

        if(!judgeName.every(name => name.trim() !== "")){
            alert("모든 심판 이름을 입력해주세요!");
            return;
        }

        if(password.length !== 4){
            alert("비밀번호는 숫자 4자리여야 합니다.");
            return;
        }

        try{
            const currentMatch = matches[currentIndex];

            //🔴 서버에 심판 이름 + 비밀번호 + matchId 보내기
            const response = await axios.post(`${baseURL}/api/judge-access/generate-qr`, {
                matchId: currentMatch.id,
                password,
                judgeNames: judgeName,
            });

            const { accessCode, judgeQRList } = response.data;
            setAccessCode(accessCode);
            setJudgeQRList(judgeQRList);

            console.log("✅ 생성된 심판별 QR 리스트:", judgeQRList);

            //🔴 match_progress 테이블 생성 요청
            await axios.post(`${baseURL}/api/progress/start`, null, {
                params: {
                    matchId: currentMatch.id,
                    judgeCount: judgeCount
                }
            });

            setShowQR(true);
            setShowPasswordModal(false);
            setQrGenerated(true);
            setIsPasswordSet(true);

            alert("✅ 비밀번호 등록 완료!");
        }catch(error){
            console.error("❌ 비밀번호 등록 실패:", error);
            alert("❌ 비밀번호 등록 중 오류 발생");
        }
    };

    //✅ DB 및 localStorage 초기화 버튼
    const  handleEnd = async () => {
        const confirmEnd = window.confirm("⚠️ 정말 경기 데이터를 모두 초기화하시겠습니까?");
        if(!confirmEnd) return;

        try{
            //🔴 서버에 초기화 요청
            const response = await axios.post(`${baseURL}/api/progress/end`);

            if(response.status === 200){
                localStorage.removeItem("match-storage");
                localStorage.removeItem("qr-storage");
                localStorage.removeItem("score-storage");
                alert("✅ 모든 경기 정보가 초기화되었습니다.");
                navigate("/");
                window.location.reload();
            }
        }catch(error:any){
            if(error.response?.status === 400){
                alert("❌ 아직 시작된 경기가 없습니다.");
            } else {
                alert("❌ 서버 오류 발생. 관리자에게 문의하세요.");
            }
            console.error("❌ 경기 종료 실패:", error);
        }
    };
 

    const renderFileUploadSection = () => (
        <>
            <button
                onClick={handleModalOpen}
                className="bg-white text-black px-[65px] py-[20px] text-[30px] font-bold font-sans rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.25)] active:bg-gray-200 active:scale-95 transition-all"
            >
                {isFileUploaded ? "파일 수정" : "파일 업로드"}
            </button>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white p-8 rounded-2xl shadow-2xl w-[90%] max-w-md text-center"
                        >    
                        
                            {/* 상단 팝업 이름 */}
                            <div className="mb-6 text-2xl font-bold">파일 업로드</div>
                            
                            {/* 파일 업로드 */}
                            <div className="mb-4">
                                <input 
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>

                            {/* 시트 선택 */}
                            {sheetNames.length > 0 && (
                                <div className="relative w-full mb-4">
                                    <select
                                        onChange={(e) => setSelectedSheet(Number(e.target.value))}
                                        className="w-full p-2.5 pr-10 border border-gray-300 rounded-lg text-gray-700 appearance-none"
                                    >
                                        <option value="">시트를 선택하세요</option>
                                        {sheetNames.map((name, idx) => (
                                            <option key={name} value={idx}>{`${idx + 1}번 시트: ${name}`}</option>
                                        ))}
                                    </select>

                                    {/* 커스텀 화살표 추가 */}
                                    <div className="absolute inset-y-0 flex items-center pointer-events-none right-3">
                                        <ChevronDown size={20} className="text-gray-400" />
                                    </div>
                                </div>
                            )}    
                            
                            {/* 하단 버튼 */}
                            <div className="flex justify-center mt-6 space-x-4">
                                <button
                                    onClick={handleFileUpload}
                                    className="px-6 py-2 font-bold text-white transition-all bg-blue-500 rounded-full hover:bg-blue-600"
                                >
                                    업로드
                                </button>
                                <button
                                    onClick={handleModalClose}
                                    className="px-6 py-2 font-bold text-gray-700 transition-all bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                                >
                                    취소
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
    //✅ 엑셀 등록하기 전이라 경기 정보가 없을 때
    if(matches.length === 0){
        return(
            <div 
                className="relative flex flex-col items-center justify-center w-screen h-screen overflow-hidden bg-center bg-no-repeat bg-cover touch-none"
                style={{backgroundImage: `url('/images/bg_main.jpg')`}}
            >
                {/* 로고 */}
                <div className='absolute top-7 left-6'>
                    <img
                        src='/images/sub_logo.svg'
                        alt='메인 로고'
                        className='w-40 h-auto'
                    />
                </div>

                {/* 중앙 글자 */}
                <div
                    className="px-4 mb-6 text-[25px] font-sans font-bold text-center text-white"
                    style={{
                        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)"
                    }}    
                >
                    아직 엑셀 파일을 불러오지 않았습니다.<br/>
                    경기 정보를 업로드해주세요!
                </div>
                    {renderFileUploadSection()}
                </div>
                );
            }
            return(
                <div>
                    <div>
                        {isFileUploaded && currentIndex === 0 && (
                            <span>{renderFileUploadSection()}</span>
                        )}
                    </div>
                    <div>
                        <span>{current.matchNumber}경기</span>
                        <span>{current.division}</span>
                    </div>
                    <div>
                        {current.redName}({current.redGym}) | {current.blueName}({current.blueGym})
                        </div>
            {roundScores.map((round, index) => {
                const redSum = round.judges
                .filter(j => j.submitted)
                .reduce((acc, j) => acc + (j.red ?? 0), 0);
            
                const blueSum = round.judges
                    .filter(j => j.submitted)
                    .reduce((acc, j) => acc + (j.blue ?? 0), 0);

                const allSubmitted = round.judges.length > 0 && round.judges.every(j => j.submitted);      

                return(
                    <div key={round.roundId}>
                        <div>
                            {round.roundNumber}라운드: {" "}
                            {allSubmitted ? `${redSum}점 : ${blueSum}점` : "-점 : -점"}
                        </div>
                        <div>
                            {round.judges.length > 0 ? (
                                round.judges.map((judge, idx) => (
                                    <span key={idx}>
                                        {judge.isConnected
                                            ? `${judge.judgeName} ${judge.submitted ? "✅" : "⌛"}`
                                            : "🙋 미입장"
                                        }
                                    </span>
                                ))
                            ) : (
                                    <div>🏃입장 대기중...</div>
                            )}
                             </div>
                    </div>
                );
            })}
            <div>
                <span>합계: </span>
                <span>{redTotal}점</span>
                <span>{blueTotal}점</span>
            </div>
            <button onClick={() => {
                if(!isAllScoresSubmitted()){
                    const proceed = confirm("⚠️ 아직 모든 점수가 입력되지 않았습니다. KO 등 경기 종료로 다음 경기로 이동하시겠습니까?");
                    if(!proceed) return;
                }
                handleNext();
            }}>
                다음 경기👉
            </button>
            <button onClick={handleEnd}>
                경기 종료
            </button>

            {/* 아직 QR 생성 안했을 때 */}
            {showQRButton && !isPasswordSet && (
                <div>
                    <button onClick={() => setShowPasswordModal(true)}>📱 심판용 QR 코드 생성</button>   
                    </div>
            )} 
            
            {showPasswordModal && (
                <div>
                    <div>심판 비밀번호 설정</div>

                    {/* 심판 수 입력 */}
                    <label>심판 수: </label>
                    <input
                        type="number"
                        value={judgeCount ?? ""}
                        onChange={(e) => {
                            const count = Number(e.target.value);
                            setJudgeCount(count);
                            setJudgeName(Array(count).fill(""));
                        }}
                        placeholder="심판 수 입력"
                    />

                    {/* 심판 이름 입력 */}
                    {judgeName.length > 0 && (
                        <div>
                            {judgeName.map((name, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        const newNames = [...judgeName];
                                        newNames[index] = e.target.value;
                                        setJudgeName(newNames);
                                    }}
                                    placeholder="심판 이름을 입력해 주세요."
                                />
                            ))}
                        </div>
                    )}

                    {/* 공통 비밀번호 입력 */}
                    <label>비밀번호(4자리 숫자): </label>
                    <input
                        type="text"
                        value={password}
                        onChange={(e) => {
                            const input = e.target.value;
                            if(/^\d{0,4}$/.test(input)){
                                setPassword(input);
                            }
                        }}
                        placeholder="숫자 4자리 입력"
                        maxLength={4}
                    />

                    {/* 저장 버튼 */}
                    <button onClick={handleSavePasswordAndGenerateQRs}>비밀번호 등록 및 QR 생성</button>
                    </div>
            )}

            {/*QR 생성해서 보여주고 있을 때 */}
            {qrGenerated && (
                <div>
                    {judgeQRList.map((judge, index) => {
                    const qrUrl = `${window.location.origin}/judge?accessCode=${accessCode}&deviceId=${judge.deviceId}`;
                    
                    console.log(`✅ [${judge.name}] QR URL: ${qrUrl}`);
                
                    return (
                        <div key={index}>
                        <div>{judge.name}</div>
                        <QRCode 
                            value={qrUrl}
                            size={180}
                        />
                        </div>
                    );
                    })}
                <button onClick={() => setQrGenerated(false)}>❌ QR 코드 닫기</button>
              </div>
            )}

            {/* QR 닫았지만 생성된 상태라면 '다시 보기' */}
            {!qrGenerated && isPasswordSet && (
            <button onClick={() => setQrGenerated(true)}>
                🔁 QR 코드 다시 보기
            </button>
            )}
            </div>
    );
};

export default Adminpage;
