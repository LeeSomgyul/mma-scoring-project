import BackgroundLayout from "../components/BackgroundLayout";

const JudgeEndPage = () => {
    return(
        <BackgroundLayout>
            <div className="flex flex-col items-center justify-center w-full h-screen text-center">
                <p
                    className="mb-4 font-bold text-white"
                    style={{
                        fontSize: `${40}px`,
                        textShadow: "0 4px 6px rgba(0, 0, 0, 0.6)"
                    }}
                >경기가 종료되었습니다.<br/> QR 코드로 다시 입장해주세요.</p>
            </div>
        </BackgroundLayout>
    );
};

export default JudgeEndPage;