@echo off
chcp 65001 > nul
title DENN 작업 시작

echo.
echo ====================================
echo   DENN PRODUCTS 작업 시작
echo ====================================
echo.

REM GitHub Desktop 실행 (이미 실행 중이면 무시됨)
echo [1/3] GitHub Desktop 실행 중...
start "" "%LOCALAPPDATA%\GitHubDesktop\GitHubDesktop.exe"

REM GitHub Desktop이 Fetch 할 시간 주기
echo [2/3] 동기화 대기 중 (10초)...
timeout /t 10 /nobreak > nul

REM 작업 폴더로 이동 + Claude Code 실행
echo [3/3] Claude Code 실행...
echo.
cd /d C:\repo\denn-products
claude