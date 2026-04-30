@echo off
chcp 65001 > nul
title Ghibli Flower Garden - Launcher

echo [1/3] Checking environment...
if not exist "node_modules\" (
    echo [ERROR] node_modules not found. Running npm install...
    call npm install
)

echo [2/3] Starting Game Server...
echo Game URL: http://localhost:5173/

echo [3/3] Opening browser...
start http://localhost:5173/

:: Run Vite dev server
call npm run dev

pause
