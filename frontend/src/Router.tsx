import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import JudgePage from "./pages/JudgePage";

const Router: React.FC = () => {
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage/>}/>
                <Route path="/judge" element={<JudgePage/>}/>
            </Routes>
        </BrowserRouter>
    );
};

export default Router;