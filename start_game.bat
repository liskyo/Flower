@echo off
chcp 65001 > nul
title Ghibli Flower Garden - Launcher
setlocal

set "GAME_URL=http://localhost:5173/"
set "MOBILE_WIDTH=932"
set "MOBILE_HEIGHT=430"
set "NODE_EXE="
set "NPM_CLI="

if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE (
    where node >nul 2>&1
    if not errorlevel 1 set "NODE_EXE=node"
)

if exist "%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js" set "NPM_CLI=%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js"
if not defined NPM_CLI if exist "%ProgramFiles(x86)%\nodejs\node_modules\npm\bin\npm-cli.js" set "NPM_CLI=%ProgramFiles(x86)%\nodejs\node_modules\npm\bin\npm-cli.js"

if not defined NODE_EXE (
    echo [ERROR] node.exe not found. Please install Node.js LTS and reopen terminal.
    echo         Download: https://nodejs.org/
    pause
    exit /b 1
)

if not defined NPM_CLI (
    echo [ERROR] npm-cli.js not found in Node.js installation.
    echo         Your Node.js/npm installation may be broken.
    echo         Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Checking environment...
if not exist "node_modules\" (
    echo [ERROR] node_modules not found. Running npm install...
    call "%NODE_EXE%" "%NPM_CLI%" install
)

echo [2/3] Starting Game Server...
start "Flower Dev Server" cmd /k ""%NODE_EXE%" "%NPM_CLI%" run dev -- --host 0.0.0.0 --port 5173 --strictPort"

echo [3/3] Opening mobile test window...
echo Waiting for %GAME_URL%
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='%GAME_URL%'; for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"
if errorlevel 1 (
    echo [ERROR] Game server did not start in time.
    pause
    exit /b 1
)

call :open_mobile_browser
echo Mobile test window opened: %GAME_URL%

pause
exit /b 0

:open_mobile_browser
set "BROWSER_ARGS=--new-window --app=%GAME_URL% --window-size=%MOBILE_WIDTH%,%MOBILE_HEIGHT% --window-position=100,50"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %BROWSER_ARGS%
    exit /b 0
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" %BROWSER_ARGS%
    exit /b 0
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" %BROWSER_ARGS%
    exit /b 0
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" %BROWSER_ARGS%
    exit /b 0
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" %BROWSER_ARGS%
    exit /b 0
)

echo [WARN] Chrome/Edge not found. Opening default browser instead.
start "" "%GAME_URL%"
exit /b 0
