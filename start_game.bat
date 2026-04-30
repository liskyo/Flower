@echo off
chcp 65001 > nul
title Ghibli Flower Garden - Launcher

echo [1/3] Checking environment...
if not exist "node_modules\" (
    echo [ERROR] node_modules not found. Running npm install...
    call npm install
)

echo [2/2] Starting Game Server and Opening Browser...
echo Game URL will be automatically opened when ready!

:: Run Vite dev server and auto-open browser
call npm run dev -- --open

pause
