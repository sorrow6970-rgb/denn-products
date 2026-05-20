@echo off
chcp 65001 >nul
title DENN PRODUCTS 풀세트

echo.
echo ==============================================
echo  DENN PRODUCTS 풀세트 시작
echo ==============================================
echo  1. DENN어드민.bat   (dev 서버 + 브라우저)
echo  2. DENN작업시작.bat (GitHub Desktop + Claude Code)
echo ==============================================
echo.

cd /d "%~dp0"

REM 1) DENN어드민.bat을 별도 cmd 창에서 시작 (백그라운드)
if exist "DENN어드민.bat" (
  echo [1/2] DENN어드민.bat 시작 ^(별도 창^)...
  start "" "DENN어드민.bat"
) else (
  echo [WARN] DENN어드민.bat 없음 - 어드민 단계 스킵
)

REM 2) 어드민 셋업 시간 대기 (서버 + 브라우저)
echo [wait] 어드민 셋업 대기 3초...
timeout /t 3 /nobreak >nul

REM 3) DENN작업시작.bat을 현재 창에서 호출 (Claude Code interactive 보장)
if exist "DENN작업시작.bat" (
  echo [2/2] DENN작업시작.bat 시작 ^(이 창에서 실행^)...
  call "DENN작업시작.bat"
) else (
  echo.
  echo [ERROR] DENN작업시작.bat 없음
  echo 이 파일은 repo 루트에 직접 만들어야 합니다.
  echo ^(GitHub Desktop + Claude Code 시작 스크립트^)
  pause
  exit /b 1
)
