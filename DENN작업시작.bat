@echo off
chcp 65001 >nul
title DENN 작업 시작
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo ==============================================
echo  DENN 작업 시작
echo ==============================================
echo  1. mockup-tool 브라우저 (어드민 서버 공유)
echo  2. GitHub Desktop
echo  3. Claude Code (이 창에서 interactive)
echo ==============================================
echo.

REM ===== 1) mockup-tool 브라우저 =====
REM DENN어드민.bat이 띄운 dev 서버 포트를 TCP 프로브로 감지 (최대 15초).
REM v4: _denn-detect-port.ps1 호출해서 iteration 단위 진단 출력.
REM      못 찾으면 8000 포트로 폴백해서라도 브라우저 시도 (서버 실패해도 GHD/Claude는 계속).
set "DENN_PORT="
set "DENN_PORT_GUESSED="
echo [1/3] dev 서버 감지 중 (최대 15초). 한 줄당 한 probe:
echo --------------------------------------------------------------------
if exist "_denn-detect-port.ps1" (
  for /f "tokens=1,* delims==" %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_denn-detect-port.ps1" -TimeoutSec 15 -IntervalMs 500') do (
    if /i "%%a"=="FOUND" set "DENN_PORT=%%b"
  )
) else (
  echo [WARN] _denn-detect-port.ps1 미발견 - 인라인 폴백 ^(진단 출력 없음^)
  for /f "tokens=*" %%p in ('powershell -NoProfile -Command "$dl=(Get-Date).AddSeconds(15);$p=$null;while((Get-Date) -lt $dl){foreach($q in 8000,8080,5500){try{$c=New-Object System.Net.Sockets.TcpClient;$t=$c.ConnectAsync('127.0.0.1',$q);if($t.Wait(200) -and $c.Connected){$c.Close();$p=$q;break}else{$c.Close()}}catch{}};if($p){break};Start-Sleep -Milliseconds 500};if($p){Write-Output $p}"') do set "DENN_PORT=%%p"
)
echo --------------------------------------------------------------------

if not defined DENN_PORT (
  echo       [WARN] dev 서버 미감지 - 8000 포트로 폴백해서 mockup 브라우저 시도
  echo              ^(서버가 진짜 미기동이면 페이지 로드 실패. 그래도 GHD/Claude는 계속 진행^)
  set "DENN_PORT=8000"
  set "DENN_PORT_GUESSED=1"
)

set "DENN_CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "DENN_CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined DENN_CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "DENN_CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined DENN_CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "DENN_CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined DENN_PORT_GUESSED (
  echo       mockup-tool 브라우저 시도 ^(localhost:!DENN_PORT! - 서버 미감지지만 best-effort^)
) else (
  echo       mockup-tool 브라우저 열기 ^(localhost:!DENN_PORT!^)
)
if defined DENN_CHROME (
  start "" "!DENN_CHROME!" "http://localhost:!DENN_PORT!/denn-mockup-tool.html"
) else (
  start "" "http://localhost:!DENN_PORT!/denn-mockup-tool.html"
)

REM ===== 2) GitHub Desktop =====
echo [2/3] GitHub Desktop 시작...
set "GHD=%LocalAppData%\GitHubDesktop\GitHubDesktop.exe"
if exist "%GHD%" (
  start "" "%GHD%"
) else (
  echo [SKIP] GitHub Desktop 표준 위치에 없음:
  echo        %GHD%
  echo        ^(다른 위치에 설치했으면 이 .bat의 GHD 변수만 직접 수정^)
)

REM ===== 3) Claude Code (이 창에서 interactive) =====
echo [3/3] Claude Code 시작...
echo.
where claude >nul 2>nul
if %errorlevel% == 0 (
  claude
) else (
  echo [ERROR] 'claude' 명령어를 PATH에서 찾을 수 없음
  echo Claude Code CLI 설치 안내: https://docs.claude.com/claude-code
  pause
  exit /b 1
)
