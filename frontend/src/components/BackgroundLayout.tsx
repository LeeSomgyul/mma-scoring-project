import React from "react";

interface Props {
  children: React.ReactNode;
}

const BackgroundLayout = ({ children }: Props) => {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-center bg-no-repeat bg-cover touch-none"
      style={{ backgroundImage: `url('/images/bg_main.jpg')` }}
    >
      {/* 고정된 로고 */}
      <div className="absolute z-10 top-7 left-6">
        <img
          src="/images/sub_logo.svg"
          alt="서브 로고"
          className="w-40 h-auto"
        />
      </div>

      {/* 16:10 기준 콘텐츠, 상단 배치, 5:3은 여백으로 처리 */}
      <div className="absolute top-0 left-0 flex items-start justify-center w-full h-full">
        <div className="relative w-[90vw] max-w-[1280px]" style={{ aspectRatio: '16/10' }}>
          <div className="relative w-full h-full overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundLayout;
