import React from "react";
import QRCode from "react-qr-code";

const QRCodeGenerator: React.FC = () => {
    const qrValue = 'matchesId=1&role=judge';//🔴 첫번째 경기회차로 시작

    return(
        <div>
            <h2>📷 QR 코드 생성</h2>
            <QRCode value={qrValue}/>
        </div>
    );
};

export default QRCodeGenerator;