import React, {useEffect, useState} from "react";
import axios from "axios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

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

    const baseURL = import.meta.env.VITE_API_BASE_URL;
    
    //✅ 전체 경기 정보 불러오기
    useEffect(() => {
        axios.get(`${baseURL}/api/matches`)
        .then((response) => {
            setMatches(response.data);
        })
        .catch((error) => {
            console.log("❌ 경기 목록 불러오기 실패:", error);
        });

        //✅ WebSocket 연결
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
            }
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

    //✅ 경기 불러오는 중일때...
    if(matches.length ===0){
        return  <p>⏳ 경기 정보를 불러오는 중입니다...</p>;
    }

    const current = matches[currentIndex];

    return(
        <div>
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
        </div>
    );
};

export default Adminpage;