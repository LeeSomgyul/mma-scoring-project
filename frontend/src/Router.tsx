import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import JudgePage from "./pages/JudgePage";
import Adminpage from "./pages/Adminpage";
import JudgeEndPage from "./pages/JudgeEndPage";

const Router: React.FC = () => {
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage/>}/>
                <Route path="/judge" element={<JudgePage/>}/>
                <Route path="/admin" element={<Adminpage/>}/>
                <Route path="/judge-end" element={<JudgeEndPage/>}/>
            </Routes>
        </BrowserRouter>
    );
};

export default Router;