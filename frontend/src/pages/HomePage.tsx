import React from 'react';
import { useNavigate } from "react-router-dom";

const HomePage: React.FC = () => {

    const navigate = useNavigate();

    return(
      <div className="relative w-screen h-screen overflow-hidden">
        {/* 배경 이미지 */}
        <img
          src="/images/bg_home.jpg"
          alt="배경"
          className="absolute top-0 left-0 z-0 object-cover w-full h-full"
        />

        {/* 16:10 비율 박스 (padding-hack 방식) */}
        <div className="relative w-[90vw] max-w-[1280px] mx-auto before:content-[''] before:block before:pb-[62.5%]">
          {/* 콘텐츠 */}
          <div className="absolute inset-0 flex flex-col justify-between items-center p-[5%] z-10">
            {/* 로고 */}
            <img
              src="/images/main_logo.svg"
              alt="메인 로고"
              className="w-[60%] max-w-[500px] min-w-[220px] h-auto"
            />

          {/* 버튼 */}
          <button
            onClick={() => navigate("/admin")}
            className="px-[65px] py-[20px] text-[30px] md:text-[35px] font-bold font-sans text-gray-800 transition-all bg-white border border-gray-300 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.25)] active:bg-gray-200 active:scale-95"
          >
            관리자 입장
          </button>
        </div>
      </div>
    </div>
    );
};

export default HomePage;