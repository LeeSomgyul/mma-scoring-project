import React, {useEffect, useState} from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import * as XLSX from "xlsx";

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


const Adminpage: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFileUploaded, setIsFileUploaded] = useState(false);
    
    const baseURL = import.meta.env.VITE_API_BASE_URL;

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
                        console.log("📩 본부석이 받은 점수 메시지:", parsed);
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
    }, []);

    //✅ 다음 경기로 전환
    const handleNext = () => {
        if(currentIndex < matches.length -1){
            setCurrentIndex((prev) => prev + 1);
        }else{
            alert("🚫 더 이상 다음 경기가 없습니다.");
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
                    <div>
                        {Array.from({length: current.roundCount}, (_, i) => (
                        <div key={i}>{i+1}라운드</div>
                        ))}
                    </div>
                    <button onClick={handleNext}>다음 경기👉</button>
                </>
            ) : (
                <div>📂 아직 엑셀 파일을 불러오지 않았습니다. 경기 정보를 업로드해주세요!</div>
            )}
        </div>
    );
};

export default Adminpage;