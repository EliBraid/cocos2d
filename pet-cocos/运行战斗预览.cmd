@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] Cocos Creator build ... (about 1-3 min)
powershell -NoProfile -ExecutionPolicy Bypass -File tools\build.ps1 > build-logs\preview-build.txt 2>&1
if errorlevel 1 (type build-logs\preview-build.txt & echo BUILD FAILED & pause & exit /b 1)
type build-logs\preview-build.txt
echo [2/2] start server http://127.0.0.1:8395/
start "" http://127.0.0.1:8395/
powershell -NoProfile -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8395
