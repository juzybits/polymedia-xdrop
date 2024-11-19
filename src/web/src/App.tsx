import "@mysten/dapp-kit/dist/index.css";
import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles/App.less";

export const PageHome: React.FC = () => {
    return <h1>GM</h1>;
};

export const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<PageHome />} />
            </Routes>
        </BrowserRouter>
    );
};
