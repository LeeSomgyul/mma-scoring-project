import React, {useEffect, useState} from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import * as XLSX from "xlsx";
import QRCode from "react-qr-code";

interface Match {
    id: number;
    matchNumber: number;
    division: string;
    roundCount: number;
    redName: string;
    redGym: string;
    blueName: string;
    blueGym: string;
    createdAt: string;
}

interface ScoreResult {
    roundId: number;
    roundNumber: number;
    red: number | null;
    blue: number | null;
}


const Adminpage: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFileUploaded, setIsFileUploaded] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showQRButton, setShowQRButton] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState<string>("");
    const [isPasswordSet, setIsPasswordSet] = useState(false);
    const [judgeCount, setJudgeCount] = useState<number | null>(null);
    const [qrGenerated, setQrGenerated] = useState(false);
    const [accessCode, setAccessCode] = useState("");
    const [scoreResults, setScoreResults] = useState<ScoreResult[]>([]);//여러 라운드 점수를 배열 형식으로 저장
    const [scoreStatus, setScoreStatus] = useState<string>("⏳ 점수 대기 중...");

    //✅ 전역으로 쓰이는 하드코딩
    const baseURL = import.meta.env.VITE_API_BASE_URL;

    //✅ 레드, 블루 총합 구하기
    const redTotal = scoreResults.reduce((acc, cur) => acc + (cur.red ?? 0), 0);
    const blueTotal = scoreResults.reduce((acc, cur) => acc + (cur.blue ?? 0), 0);

    useEffect(() => {
        if (qrGenerated && accessCode) {
          const qrUrl = `${window.location.origin}/judge?accessCode=${accessCode}`;
          console.log("✅ QR 코드에 들어갈 URL:", qrUrl);
        }
      }, [qrGenerated, accessCode]);

    //✅ 전체 경기 정보 불러오기
    const fetchMatches = () => {
        axios.get(`${baseURL}/api/matches`)
            .then((response) => {
                setMatches(response.data);
                setCurrentIndex(0);
            })
            .catch((error) => {
                console.log("❌ 경기 목록 불러오기 실패:", error);
            });
    };    

    //✅ 초기 라운드 수만큼 점수 미리 채워두기
    useEffect(() => {
        if(matches.length > 0){
            const currentMatch = matches[currentIndex];
            
            axios.get(`${baseURL}/api/rounds/match/${currentMatch.id}`)
                .then((res) => {
                    const roundList = res.data;
                    const initialScores: ScoreResult[] = roundList.map((round: any) => ({
                        roundId: round.id,
                        roundNumber: round.roundNumber,
                        red: null,
                        blue: null,
                    }));
                    setScoreResults(initialScores);
                })
        }
    }, [matches, currentIndex])

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
    const handleFileUpload = async() => {

        if(!file){
            alert("엑셀 파일을 선택해주세요!");
            return;
        }

        if(selectedSheet === null){
            alert("시트를 선택해주세요!");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("sheet", String(selectedSheet + 1));

        try{
            const response = await axios.post(`${baseURL}/api/matches/upload`, formData, {
                headers: {"Content-Type": "multipart/form-data"},
            });
            setIsFileUploaded(true);
            setShowQRButton(true);
            setIsModalOpen(false);
            fetchMatches();
        }catch(error){
            console.error("❌ 업로드 실패:", error);
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
    
    //✅ WebSocket 연결
    useEffect(() => {
        const socket = new SockJS("/ws");
        const stompClient = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                console.log("✅ 본부석 WebSocket 연결 완료");
                
                //🔴 서버에서 점수 받기
                stompClient.subscribe("/topic/messages", (message) => {
                    try{
                        const parsed = JSON.parse(message.body);
                        console.log("✅ 받은 점수 전체 메시지:", parsed);
                        
                        if(parsed.status === "WAITING"){
                            setScoreStatus("⏳ 점수 대기 중...");
                        }else if(parsed.status === "COMPLETE"){
                            setScoreResults((prev) =>
                                prev.map((item) =>
                                  item.roundId === parsed.roundId
                                    ? { ...item, red: parsed.totalRed, blue: parsed.totalBlue }
                                    : item
                                )
                              );
                            setScoreStatus("✅ 합산 완료!");
                            console.log("✅ 받은 점수:", parsed);
                        }
                    }catch(e){
                        console.error("❌ 메시지 json 변경 실패:", e);
                    }
                });
            },

            onStompError: (frame) => {
                console.error("❌ STOMP 에러:", frame.headers["message"]);
            },

            onWebSocketError: (event) => {
                console.error("❌ WebSocket 에러:", event);
            },
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, [matches[currentIndex]?.id]);

    //✅ 다음 경기로 전환
    const handleNext = async() => {
        try{
            const currentMatch = matches[currentIndex];

            const response = await axios.post(`${baseURL}/api/progress/next`, null, {
                params:{
                    currentMatchId: currentMatch.id,
                },
            });
        
            if(response.status === 200){
                alert("✅다음 경기로 이동합니다.");

                const nextMatchId = response.data?.nextMatchId;

                //🔴 새로운 경기 목록 가져오기기
                if(nextMatchId){
                    const response = await axios.get(`${baseURL}/api/matches`);
                    const allMatches = response.data;
                    setMatches(allMatches);

                    const nextIndex = allMatches.findIndex((m: Match) => m.id === nextMatchId);
                    if(nextIndex !== -1){
                        setCurrentIndex(nextIndex);
                    }

                    const roundResponse = await axios.get(`${baseURL}/api/rounds/match/${nextMatchId}`);
                    const roundList = roundResponse.data;
                    const initialScores: ScoreResult[] = roundList.map((round: any) => ({
                        roundId: round.id,
                        roundNumber: round.roundNumber,
                        red: null,
                        blue: null,
                    }));
                    setScoreResults(initialScores);
                    setScoreStatus("⏳ 점수 대기 중...");
                }
            }else{
                alert("❌ 다음 경기로 이동 실패");
            }
        }catch(error){
            console.error("❌ 다음 경기 전환 오류:", error);
            alert("서버 오류가 발생했습니다.");
        }
    };

    //✅ 관리자 비밀번호 지정 시 저장
    const handleSavePassword = async () => {
        if(!judgeCount || judgeCount < 1){
            alert("심판 수를 1명 이상 입력해주세요!");
            return;
        }

        if(password.length !== 4){
            alert("비밀번호는 숫자 4자리여야 합니다.");
            return;
        }

        try{
            //1️⃣ 심판 비밀번호 등록 요청청
            const response = await axios.post(`${baseURL}/api/judge-access/password`, { password });
            const accessCode = response.data.accessCode;
            setAccessCode(accessCode);

            //2️⃣ match_progress 테이블 생성 요청
            const currentMatch = matches[currentIndex];
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

    const current = matches[currentIndex];

    return(
        <div>
            <button onClick={handleModalOpen}>{isFileUploaded ? "📄 파일 수정" : "📥 파일 업로드"}</button>
            {isModalOpen && (
                <div style={{ border: "1px solid #aaa", padding: 20, marginTop: 20 }}>
                    <h3>📁엑셀 파일 업로드</h3>
                    <input type="file" accept=".xlsx, .xls" onChange={handleFileChange}/>
                    {sheetNames.length > 0 && (
                        <select onChange={(e) => setSelectedSheet(Number(e.target.value))}>
                            <option value="">시트를 선택하세요</option>
                            {sheetNames.map((name, idx) => (
                                <option key={name} value={idx}>{`${idx + 1}번 시트: ${name}`}</option>
                            ))}
                        </select>
                    )}    
                    <div>
                        <button onClick={handleFileUpload}>📤엑셀 업로드</button>
                        <button onClick={handleModalClose}>❌닫기</button>
                    </div>
                </div>
            )}
            
            {matches.length > 0 ? (
                <>
                    <div>
                        <span>{current.matchNumber}경기</span>
                        <span>{current.division}</span>
                    </div>
                    <div>{current.redName}({current.redGym}) | {current.blueName}({current.blueGym})</div>
                    {scoreResults.map((result) => (
                        <div key={result.roundId}>
                        {result.roundNumber}라운드:{" "}
                        {result.red !== null && result.blue !== null ? (
                            <div>
                                <span>{result.red}점</span>
                                <span>{result.blue}점</span>
                            </div>
                            
                        ) : (
                            <>⏳ 점수 대기 중...</>
                        )}
                        </div>
                    ))}
                    <div>
                        <span>합계: </span>
                        <span>{redTotal}점</span>
                        <span>{blueTotal}점</span>
                    </div>
                    <button onClick={handleNext}>다음 경기👉</button>
                </>
            ) : (
                <div>📂 아직 엑셀 파일을 불러오지 않았습니다. 경기 정보를 업로드해주세요!</div>
            )}

            {showQRButton && !isPasswordSet && (
                <div>
                    <button onClick={() => setShowPasswordModal(true)}>📱 심판용 QR 코드 생성</button>
                </div>
            )}

            {showPasswordModal && (
                <div>
                    <h3>🛡️ 심판 비밀번호 설정</h3>
                    <label>심판 수: </label>
                    <input
                        type="number"
                        value={judgeCount ?? ""}
                        onChange={(e) => {
                            const value = e.target.value;
                            setJudgeCount(value === "" ? null : Number(value));
                        }}
                        placeholder="심판 수 입력력"
                    />
                    <label>비밀번호: </label>
                    <input
                        type="text"
                        value={password}
                        onChange={(e) => {
                            const input = e.target.value;
                            if(/^\d{0,4}$/.test(input)){
                                setPassword(input);
                            }
                        }}
                        placeholder="숫자 4자리 입력력"
                        maxLength={4}
                    />
                    <button onClick={handleSavePassword}>비밀번호 등록 및 QR 생성</button>
                </div>
            )}

            {qrGenerated && (
                <div>
                    <QRCode value={`${window.location.origin}/judge?accessCode=${accessCode}`} size={180} />
                    <div>📷 심판이 QR을 스캔하면 입장할 수 있어요</div>
                    <button onClick={() => setQrGenerated(false)}>❌ QR 코드 닫기</button>
                </div>
            )}

            {!qrGenerated && isPasswordSet && (
            <button onClick={() => setQrGenerated(true)}>
                🔁 QR 코드 다시 보기
            </button>
            )}
        </div>
    );
};

export default Adminpage;