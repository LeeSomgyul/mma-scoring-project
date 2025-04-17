import React from 'react';
import { useNavigate } from "react-router-dom";

import { resetAllStores } from "../utils/resetLocalStorage";

const HomePage: React.FC = () => {

    const navigate = useNavigate();

    return(
        <div>
            <h1>🥋 MMA 채점 시스템 🥋</h1>
            <h2>아래에서 역할을 선택해주세요.</h2>
            <div>
                <button onClick={() => navigate("/admin")}>👨‍💼 본부석 입장</button>
            </div>
            
            <button onClick={() => {
            resetAllStores();
            window.location.reload();
            }}>
            ⚠️ admin 상태 초기화
            </button>
        </div>
    );
};

export default HomePage;