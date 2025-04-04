import React from 'react';
import QRCodeGenerator from '../components/QRCodeGenerator';

const HomePage: React.FC = () => {
    return(
        <div>
            <h1>MMA 채점 시스템</h1>
            <QRCodeGenerator />
        </div>
    );
};

export default HomePage;