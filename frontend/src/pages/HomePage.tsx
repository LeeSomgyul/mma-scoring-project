import React from 'react';
import { useNavigate } from "react-router-dom";

const HomePage: React.FC = () => {

    const navigate = useNavigate();

    return(
        <div
            className='relative flex flex-col justify-end w-screen h-screen overflow-hidden bg-center bg-no-repeat bg-cover touch-none'
            style={{backgroundImage: `url('/images/bg_home.jpg')`}}
        >
            {/* 로고 */}
            <div className='absolute transform -translate-x-1/2 top-20 left-1/2'>
                <img
                    src='/images/main_logo.svg'
                    alt='메인 로고'
                    className='h-auto w-100'
                />
            </div>

            {/* 본부석 입장 버튼튼 */}
            <div className='flex justify-center mb-28'>
                <button 
                    onClick={() => navigate("/admin")}
                    className='px-[65px] py-[20px] text-[35px] font-bold font-sans text-gray-800 transition-all bg-white border border-gray-300 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.25)] active:bg-gray-200 active:scale-95'
                >
                    관리자 입장
                </button>
            </div>
        </div>
    );
};

export default HomePage;