import React from "react";

interface Props {
  children: React.ReactNode;
}

const BackgroundLayout = ({ children }: Props) => {
  return (
    <div
      className="w-screen min-h-screen overflow-hidden bg-center bg-no-repeat bg-cover touch-none"
      style={{ backgroundImage: `url('/images/bg_main.jpg')` }}
    >
      {/* sub_logo 로고 항상 고정 */}
      <div className="absolute z-10 top-7 left-6">
        <img
          src="/images/sub_logo.svg"
          alt="서브 로고"
          className="w-40 h-auto"
        />
      </div>

      {/* 실제 페이지 콘텐츠 */}
      <div className="relative z-20">{children}</div>
    </div>
  );
};

export default BackgroundLayout;
