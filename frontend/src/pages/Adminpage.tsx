import React, {useEffect, useState, useRef} from "react";
import { useNavigate } from 'react-router-dom';
import getAxiosInstance from "../api/axiosInstance";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import * as XLSX from "xlsx";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundLayout from "../components/BackgroundLayout";

//✅ zustand store import
import { useMatchStore } from "../stores/useMatchStore";
import { useScoreStore } from "../stores/useScoreStore";
import { useQRStore } from "../stores/useQRStore";
import type { RoundScore, JudgeScore } from "../stores/useScoreStore";
import type { Match } from "../stores/useMatchStore";

//✅ 아이콘
import { ChevronDown,  QrCode, FolderPen, SquareX, ChevronRight } from "lucide-react";


const Adminpage: React.FC = () => {
    
    //✅ zustand 상태 적용
    const { matches, setMatches, currentIndex, setCurrentIndex, isHydrated } = useMatchStore();
    const { roundScores, setRoundScores, currentRoundIndex, setCurrentRoundIndex, scoreStatus, setScoreStatus } = useScoreStore();
    const { judgeQRList, setJudgeQRList,showQRButton, setShowQRButton, qrGenerated, setQrGenerated, isPasswordSet, setIsPasswordSet, accessCode, setAccessCode,  isFileUploaded, setIsFileUploaded } = useQRStore();

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
    const [isReconnected, setIsReconnected] = useState(false);
    const initializedOnceRef = useRef(false);
    const stompClientRef = useRef<Client | null>(null);

    //✅ 전역으로 쓰이는 코드
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

    if(!isHydrated) return null;

            
    //✅ fetchInitialData 함수 자동 실행
    useEffect(() => {
        fetchInitialData();
    }, []);

    //✅ QR 정보를 서버에서 가져오기(진행중인 경기, 심판, deviceId 등)
    useEffect(() => {
        const currentMatchId = matches[currentIndex]?.id;

        // 🔴 매치 없으면 요청 안함
        if (!currentMatchId) return;
      
        getAxiosInstance().get(`/api/progress/${currentMatchId}/qr-generated`)
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
            if(error.response?.status === 404){
                console.warn(`QR 정보 없음 (match_progress 미생성 상태) → matchId: ${currentMatchId}`);
            }else{
                console.error("❌ QR 상태 가져오기 실패:", error);
            }
          });
      }, [matches, currentIndex]); 

    //✅ WebSocket 연결
    useEffect(() => {
        const runWebSocket = () => {
            const socket = new SockJS(`/ws`);
            const client = new Client({
                webSocketFactory: () => socket,
                reconnectDelay: 5000,
                onConnect: () => {
                    console.log("✅ 본부석 WebSocket 연결 완료");
                    setIsReconnected(true);
    
                    //🔴 서버에서 점수 받기
                    client.subscribe("/topic/messages", (message) => {
                        try{
                            const parsed = JSON.parse(message.body);
                            console.log("✅ 받은 점수 전체 메시지:", parsed);
                            
                            //🔴 심판이 점수를 취소하면
                            if(parsed.status === "CANCELLED"){
                                const roundId = Number(parsed.roundId);
                                const judgeName = parsed.judgeName?.trim(); 
                                const submittedJudges = parsed.submittedJudges ?? [];

                                setRoundScores(prev =>
                                    prev.map(round => {
                                        if (round.roundId !== roundId) return round;
                                        
                                        const updatedJudges = round.judges.map(j => {
                                            if (j.judgeName?.trim() === judgeName) {
                                                return { 
                                                    ...j, 
                                                    red: null, 
                                                    blue: null, 
                                                    submitted: false, 
                                                    isConnected: j.isConnected 
                                                };
                                            }
                                        
                                            const found = submittedJudges.find((s: { name: string; red: number; blue: number }) => s.name.trim() === j.judgeName?.trim());
                                            return found 
                                                ? { ...j, submitted: true, red: found.red, blue: found.blue, isConnected: j.isConnected }
                                                : { ...j, isConnected: j.isConnected };
                                        });
                                        
                                        return { ...round, judges: updatedJudges };
                                    })
                                );
                            
                            setScoreStatus("⏳ 점수 대기 중...");
                            return;
                            }

                            //🔴 심판이 점수 '수정중' 상태라면
                            if (parsed.status === "MODIFIED") {
                                const roundId = Number(parsed.roundId);
                                const judgeName = parsed.judgeName?.trim(); 
                            
                                setRoundScores(prev =>
                                    prev.map(round => {
                                        if (round.roundId !== roundId) return round;
                                        const updatedJudges = round.judges.map(j =>
                                            j.judgeName?.trim() === judgeName
                                                ? { ...j, red: null, blue: null, submitted: false, isConnected: j.isConnected}
                                                : j
                                        );
                                    return { ...round, judges: updatedJudges };
                                    })
                                );
                            }
    
                            if (parsed.status === "JOINED" && parsed.judgeName) {
                                const judgeName = parsed.judgeName.trim().toLowerCase();
                            
                                setRoundScores(prev => {
                                    const newScores = prev.map(round => {
                                        const judgeExists = round.judges.some(j => j.judgeName?.trim().toLowerCase() === judgeName);
                                        let updatedJudges = round.judges.map(j =>
                                            j.judgeName?.trim().toLowerCase() === judgeName
                                                ? { ...j, isConnected: true }
                                                : j
                                        );
                                        if (!judgeExists) {
                                            updatedJudges.push({
                                                judgeName: parsed.judgeName,
                                                red: null,
                                                blue: null,
                                                submitted: false,
                                                isConnected: true,
                                            });
                                        }
                                        return { ...round, judges: updatedJudges };
                                    });
                                    return newScores;
                            });
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
    
            stompClientRef.current = client;
            client.activate();
        };
        runWebSocket();

        return () => {
            stompClientRef.current?.deactivate();
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
          //❤️1. 라운드 정보 가져오기
          getAxiosInstance().get(`/api/rounds/match/${currentMatch.id}`)
            .then((roundRes) => {
              const roundList = roundRes.data;
              //❤️2. 심판 목록 가져오기
              getAxiosInstance().get(`/api/judges/current`, {
                params: { matchId: currentMatch.id },
              }).then((judgeRes) => {
                const judgeList = judgeRes.data;
                //❤️3. 라운드별 상태 초기화 (심판 목록 포함)
                const initialRoundScores: RoundScore[] = roundList.map((round: any) => ({
                  roundId: round.id,
                  roundNumber: round.roundNumber,
                  judges: judgeList.map((judge: any) => ({
                    judgeName: judge.name,
                    red: null,
                    blue: null,
                    submitted: false,
                    isConnected: judge.connected ?? false,
                  })),
                }));
                setRoundScores(initialRoundScores);
                initializedOnceRef.current = true;
              })
              .catch((error) => {
                console.error("데이터 가져오기 실패:", error);
                alert("데이터를 가져오는 데 실패했습니다.");
              });
            });
        }
      }, [matches, currentIndex, roundScores.length]);


    //✅ 새로고침 시 경기목록+점수+선수정보 가져오기
    const fetchInitialData = async() => {
        console.log("🔥 fetchInitialData(새로고침) 시작됨");

        try{
            //❤️ 전체 경기 목록 가져오기
            const matchesResponse = await getAxiosInstance().get(`/api/matches`);
            const matches = matchesResponse.data;

            setMatches(matches);
            
            if(matches.length === 0){
                console.warn("❌ 경기가 없습니다.");
                return;
            }

            //❤️ 현재 진행중인 matchId를 서버로부터 가져오기
            const progressResponse = await getAxiosInstance().get(`/api/progress`);
            const currentMatchId = progressResponse.data?.matchId;

            if (!currentMatchId) {
                console.warn("❌ 서버에 저장된 현재 matchId가 없습니다.");
                setCurrentIndex(0);
                return;
            }

            //❤️ matchId로 currentIndex(현재경기) 적용
            const index = matches.findIndex((m: Match) => m.id === currentMatchId);
            if (index === -1) {
            console.warn("❌ matchId에 해당하는 경기 없음. index fallback 0.");
            setCurrentIndex(0);
            return;
            }

            setCurrentIndex(index);

            //❤️ 해당 matchId로 점수 및 심판 불러오기
            const scoresResponse = await getAxiosInstance().get(`/api/scores/by-match`, {
                params: { matchId: currentMatchId },
              });
            const roundScoresFromServer = scoresResponse.data;

            //❤️ 현재 matchId로 심판 목록 가져오기(경기에 맞는 심판)
            const judgesResponse = await getAxiosInstance().get(`/api/judges/current`, {
                params: {matchId: currentMatchId},
            });
            const judgeList = judgesResponse.data;
            console.log("✅ 초기 로딩: judgeList:", judgeList);
          
            setRoundScores(roundScoresFromServer);
            setScoreStatus("⏳ 점수 대기 중...");
        } catch (error) {
            console.error("❌ fetchInitialData 실패", error);
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
            await getAxiosInstance().post(`/api/matches/upload`, formData, {
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
            alert("❌ 업로드 실패하였습니다. 파일을 다시 확인해주세요.");
        }
    };

    //✅ 팝업창 열기 버튼
    const handleModalOpen = () => {
        setIsModalOpen(true);
    };

    //✅ 팝압창 닫기 버튼
    const handleModalClose = () => {
        setIsModalOpen(false);
    };
    
    
    //✅ 다음 경기로 전환
    const handleNext = async () => {

        //🔴 마지막 경기에서 버튼 누르면 
        const isLastMatch = currentIndex === matches.length -1;
        if(isLastMatch){
            alert("⚠️ 현재 경기가 마지막 경기입니다.");
            return;
        }

        //🔴 심판이 전원 입장하지 않고 버튼 누르면 
        const allJudgesPresent = roundScores.every(round =>
            round.judges.length > 0 && round.judges.every(judge => judge.isConnected)
        );
        
        if (!allJudgesPresent) {
            alert("⚠️ 아직 입장하지 않은 심판이 있습니다. 모든 심판이 입장한 후 진행해주세요.");
            return;
        }

        const confirmNext = window.confirm("⚠️ 다음 경기로 이동하시겠습니까?");
        if (!confirmNext) return;

        try {
            const currentMatch = matches[currentIndex];
            const response = await getAxiosInstance().post(`/api/progress/next`, null, {
                params: { currentMatchId: currentMatch.id },
            });
        
            if (response.status === 200) {
                const nextMatchId = response.data?.nextMatchId;
      
            if (nextMatchId) {
              const [matchesRes, roundsRes, judgesRes] = await Promise.all([
                getAxiosInstance().get(`/api/matches`),
                getAxiosInstance().get(`/api/rounds/match/${nextMatchId}`),
                getAxiosInstance().get(`/api/judges/current`, {
                    params:{matchId: nextMatchId},
                }),
              ]);
      
              const allMatches = matchesRes.data;
              const roundList = roundsRes.data;
              const judgeList = judgesRes.data;

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
                            red: judge.red ?? null,
                            blue: judge.blue ?? null,
                            submitted: judge.submitted ?? false,
                            isConnected: judge.connected ?? false,
                        }))
                        : [],
                }));

              setRoundScores(roundScoresWithJudges);
              setMatches(allMatches);
              setCurrentIndex(nextIndex);
              setCurrentRoundIndex(0);
              setScoreStatus("⏳ 점수 대기 중...");
              setIsReconnected(true);

              //🔴 심판에게 다음 경기 정보 전송
              const stompClient = stompClientRef.current;
              if(stompClient?.connected){
                const nextMatch = allMatches[nextIndex];
                stompClient.publish({
                    destination: "/topic/next-match",
                    body: JSON.stringify(nextMatch),
                })
              }
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
            const response = await getAxiosInstance().post(`/api/judge-access/generate-qr`, {
                matchId: currentMatch.id,
                password,
                judgeNames: judgeName,
            });

            const { accessCode, judgeQRList } = response.data;
            setAccessCode(accessCode);
            setJudgeQRList(judgeQRList);

            console.log("✅ 생성된 심판별 QR 리스트:", judgeQRList);

            //🔴 match_progress 테이블 생성 요청
            await getAxiosInstance().post(`/api/progress/start`, null, {
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
        const confirmEnd = window.confirm("⚠️ 경기를 종료하시겠습니까?\n종료 시 모든 데이터가 초기화됩니다.");
        if(!confirmEnd) return;

        try{
            //🔴 서버에 초기화 요청
            await getAxiosInstance().post(`/api/progress/end`);

                localStorage.removeItem("match-storage");
                localStorage.removeItem("qr-store");

                alert("✅ 모든 경기 정보가 초기화되었습니다.");
                navigate("/");
                window.location.reload();
        }catch(error){
            console.error("❌ 경기 종료 실패:", error);
            alert("❌ 서버 오류 발생. 관리자에게 문의하세요.");
        }
    };
 

    const renderFileUploadSection = () => (
        <>
            {/* 버튼 영역: 파일 업로드 & 양식 다운로드 */}
            <div className="flex flex-col items-center space-y-4">
                {/* 파일 업로드 버튼 */}
                <button
                    onClick={handleModalOpen}
                    className="bg-white text-black w-[300px] py-[20px] text-[30px] font-bold font-sans rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.25)] active:bg-gray-200 active:scale-95 transition-all"
                >
                    파일 업로드
                </button>

                {/* 양식 다운로드 버튼 */}
                <a
                    href="/template/mma-template.xlsx"
                    download
                    className="bg-white text-black w-[300px] py-[20px] text-[30px] font-bold font-sans rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.25)] active:bg-gray-200 active:scale-95 transition-all text-center flex items-center justify-center"
                >
                    양식 다운로드
                </a>
            </div>

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
    //✅ 엑셀 업로드 전 화면 
    if(matches.length === 0){
        return(
           <BackgroundLayout>
                <div className="flex flex-col items-center justify-center w-full h-full text-center">
                    <div className="text-white text-[30px] font-bold px-4" style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
                        아직 엑셀 파일을 불러오지 않았습니다.<br />
                        경기 정보를 업로드해주세요!
                    </div>
                    <div className="mt-6">
                        {renderFileUploadSection()}
                    </div>
                </div>
            </BackgroundLayout>
        );
    }

    return(
        <BackgroundLayout>
            {/* 상단 여백 추가 */}
  <div className="mt-[5vh]">
    {/* 중앙 상단 경기 정보 */}
    <div className="mb-5 text-center">
      <span
        className="font-sans font-bold text-white"
        style={{
          fontSize: `min(8vw, 60px)`,
          textShadow: `
            -1px 0px rgba(0, 0, 0, 0.8),
            1px 0px rgba(0, 0, 0, 0.8),
            0px -1px rgba(0, 0, 0, 0.8),
            0px 1px rgba(0, 0, 0, 0.8)
          `,
        }}
      >
        {current.matchNumber}경기 {current.division}
      </span>
    </div>

    <div className="w-full max-w-[90vw] mx-auto overflow-hidden text-base rounded shadow-md">
      {/* 헤더 */}
      <div className="grid grid-cols-[0.6fr_1fr_1fr_0.9fr] text-center font-bold text-white">
        <div className="col-span-1 bg-transparent"></div>
        <div
          className="flex items-center justify-center bg-red-600 border border-gray-300"
          style={{ fontSize: `min(3vw, 20px)`, height: `min(10vh, 70px)` }} // 높이 증가
        >
          {current.redName} ({current.redGym})
        </div>
        <div
          className="flex items-center justify-center bg-blue-600 border border-gray-300"
          style={{ fontSize: `min(3vw, 20px)`, height: `min(10vh, 70px)` }} // 높이 증가
        >
          {current.blueName} ({current.blueGym})
        </div>
        <div className="col-span-1 bg-transparent"></div>
      </div>

      {/* 라운드 별 점수 */}
      <div
        className="w-full max-w-[90vw] mx-auto mt-0 overflow-y-auto text-base rounded shadow-md"
        style={{ maxHeight: "min(37vh, 400px)", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {roundScores.map((round, index) => {
          const redSum = round.judges.filter(j => j.submitted).reduce((acc, j) => acc + (j.red ?? 0), 0);
          const blueSum = round.judges.filter(j => j.submitted).reduce((acc, j) => acc + (j.blue ?? 0), 0);

          return (
            <div key={round.roundId} className="grid grid-cols-[0.6fr_1fr_1fr_0.9fr] text-center border border-gray-300">
              <div
                className="flex items-center justify-center font-bold bg-gray-100 border border-gray-300"
                style={{ fontSize: `clamp(20px, 3vw, 28px)`, height: `min(12vh, 70px)` }}
              >
                {round.roundNumber}R
              </div>
              <div
                className={`flex items-center justify-center bg-white border border-gray-300 ${
                  redSum > blueSum ? 'font-bold' : 'font-normal'
                }`}
                style={{ fontSize: `clamp(20px, 3vw, 28px)`, height: `min(12vh, 70px)` }}
              >
                {redSum || "-"}
              </div>
              <div
                className={`flex items-center justify-center bg-white border border-gray-300 ${
                  blueSum > redSum ? 'font-bold' : 'font-normal'
                }`}
                style={{ fontSize: `clamp(20px, 3vw, 28px)`, height: `min(12vh, 70px)` }}
              >
                {blueSum || "-"}
              </div>
              <div
                className="flex items-center justify-center px-2 py-2 text-sm bg-gray-100 border border-gray-300"
                style={{ height: `min(12vh, 70px)` }}
              >
                {round.judges.length > 0 ? (
                  <div className="flex gap-2">
                    {round.judges.map((judge, idx) => {
                      const isEntered = judge.isConnected;
                      const isSubmitted = judge.submitted;
                      const circleClass = isEntered
                        ? isSubmitted
                          ? "bg-green-500 text-white"
                          : "bg-white text-black"
                        : "bg-gray-300 text-gray-400";

                      return (
                        <div
                          key={idx}
                          className={`rounded-full flex items-center justify-center shadow-md ${circleClass}`}
                          title={judge.judgeName}
                          style={{
                            width: "clamp(32px, 5vw, 50px)",
                            height: "clamp(32px, 5vw, 50px)",
                            fontSize: "clamp(10px, 2vw, 14px)",
                            fontWeight: 600,
                          }}
                        >
                          {judge.judgeName.length > 3 ? judge.judgeName.slice(0, 3) : judge.judgeName}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[min(3vw, 16px)] font-semibold text-center text-gray-600">
                    입장 대기중...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 합계 */}
      <div className="grid grid-cols-[0.6fr_1fr_1fr_0.9fr] text-center font-bold border border-gray-300">
        <div
          className="flex items-center justify-center border border-gray-300 bg-lime-300"
          style={{ fontSize: `clamp(20px, 3vw, 28px)`, height: `min(12vh, 70px)` }}
        >
          합계
        </div>
        <div
          className={`flex items-center justify-center text-lg bg-white border border-gray-300 ${
            redTotal > blueTotal ? 'border-8 border-red-500' : ''
          }`}
          style={{ fontSize: `clamp(20px, 3vw, 28px)`, height: `min(12vh, 70px)` }}
        >
          {redTotal}
        </div>
        <div
          className={`flex items-center justify-center text-lg bg-white border border-gray-300 ${
            blueTotal > redTotal ? 'border-8 border-red-500' : ''
          }`}
          style={{ fontSize: `clamp(20px, 3vw, 28px)`, height: `min(12vh, 70px)` }}
        >
          {blueTotal}
        </div>
        <div className="bg-gray-100 border border-gray-300"></div>
      </div>
    </div>
  </div>
            

            {/* 다음경기 버튼 */}  
            <div className="fixed z-30 bottom-6 right-6">
                <button
                    onClick={() => {
                        if(!isAllScoresSubmitted()){
                            const proceed = confirm("⚠️ 아직 모든 점수가 입력되지 않았습니다. KO 등 경기 종료로 다음 경기로 이동하시겠습니까?");
                            if(!proceed) return;
                        }
                        handleNext();
                    }}
                    className="flex items-center justify-center px-6 py-0 font-bold text-white transition-all bg-transparent border-none rounded-full outline-none appearance-none active:scale-95"
                    style={{ fontSize: `${30}px` }}
                    title="다음 경기"
                >
                    다음 경기
                    <ChevronRight size={45} className="ml-2 relative top-[3px]"/>
                </button>
            </div>
            
            <div className="fixed z-30 flex items-center space-x-4 top-7 right-6">
                {/* 아직 QR 생성 안했을 때 */}
                {showQRButton && !isPasswordSet && (
                    <button 
                        onClick={() => setShowPasswordModal(true)}
                        className="p-2 transition-all border rounded-full shadow-lg cursor-pointer bg-white/10 border-white/30 hover:bg-white/20 active:scale-90"
                        title="QR 코드 생성"    
                    >
                        <QrCode className="text-white w-14 h-14" />
                    </button>   
                )} 

                {/* QR 닫았지만 생성된 상태라면 '다시 보기' */}
                {!qrGenerated && isPasswordSet && (
                <button
                    onClick={() => setQrGenerated(true)}
                    className="p-2 transition-all border rounded-full shadow-lg cursor-pointer bg-white/10 border-white/30 hover:bg-white/20 active:scale-90"
                    title="QR 코드 다시 보기"
                >
                    <QrCode className="text-white w-14 h-14" />
                </button>
                )}

                {/* 경기 종료 */}
                <button
                    onClick={handleEnd}
                    className="p-2 transition-all border rounded-full shadow-lg cursor-pointer bg-white/10 border-white/30 hover:bg-white/20 active:scale-90"
                    title="경기 종료"
                >
                    <SquareX className="text-white w-14 h-14" />
                </button>
            </div>
            
        
            <AnimatePresence>
                {showPasswordModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white p-8 rounded-2xl shadow-2xl w-[90%] max-w-md text-center"
                        >
                            {/* 상단 타이틀 */}
                            <div className="mb-6 text-2xl font-bold">심판 비밀번호 설정</div>

                            {/* 심판 수 입력 */}
                            <div className="mb-4 text-left">
                                <label className="block mb-1 text-sm font-medium">심판 수 (최대 3명):</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={judgeCount ?? ""}
                                    onChange={(e) => {
                                        const val = e.target.value;

                                        // 입력 비우면 초기화
                                        if (val === "") {
                                            setJudgeCount(null);
                                            setJudgeName([]);
                                            return;
                                        }

                                        const count = Number(val);

                                        // 숫자가 아니거나 음수일 때 무시
                                        if (isNaN(count) || count < 0) return;

                                        // 3명 초과 시 알림
                                        if (count > 3) {
                                            alert("심판 수는 최대 3명까지 가능합니다.");
                                            return;
                                        }

                                        // 유효한 경우만 반영
                                        setJudgeCount(count);
                                        setJudgeName(Array(count).fill(""));
                                        }}
                                    placeholder="심판 수 입력"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>

                            {/* 심판 이름 입력 */}
                            {judgeName.length > 0 && (
                                <div className="mb-4 space-y-2 text-left">
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
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* 공통 비밀번호 입력 */}
                            <div className="mb-4 text-left">
                                <label className="block mb-1 text-sm font-medium">비밀번호(4자리 숫자): </label>
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
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                />
                            </div>

                            {/* 저장 버튼 */}
                            <div className="flex justify-center mt-6 space-x-4">
                                <button 
                                    onClick={handleSavePasswordAndGenerateQRs}
                                        className="px-6 py-2 font-bold text-white transition-all bg-blue-500 rounded-full hover:bg-blue-600"
                                >
                                    QR 생성
                                </button>
                                <button
                                    onClick={() => setShowPasswordModal(false)}
                                    className="px-6 py-2 font-bold text-gray-700 transition-all bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                                >
                                    취소
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/*QR 생성해서 보여주고 있을 때 */}
            <AnimatePresence>
                {qrGenerated && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white p-8 rounded-2xl shadow-2xl w-[90%] max-w-[780px] text-center overflow-y-auto max-h-[90vh]"
                        >
                            {/* 상단 타이틀 */}
                            <div className="mb-6 text-2xl font-bold">심판용 QR 코드</div>
                        
                            {/* QR 코드 목록 */}
                            <div className="flex flex-wrap justify-center mx-auto gap-x-20 gap-y-8">
                                {judgeQRList.map((judge, index) => {
                                    const qrUrl = `${window.location.origin}/judge?accessCode=${accessCode}&deviceId=${judge.deviceId}`;
                                
                                    console.log(`✅ [${judge.name}] QR URL: ${qrUrl}`);

                                    return (
                                        <div key={index} className="flex flex-col items-center space-y-2 w-[160px]">
                                        <div className="text-lg font-medium">{judge.name}</div>
                                        <QRCode value={qrUrl} size={180}/>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 닫기 버튼 */}
                            <div className="mt-6">
                                <button
                                    onClick={() => setQrGenerated(false)}
                                    className="px-6 py-2 font-bold text-gray-700 transition-all bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                                >
                                    ❌ QR 코드 닫기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </BackgroundLayout>
    );
};

export default Adminpage;
