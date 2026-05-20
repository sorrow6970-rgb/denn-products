@echo off
REM DENN PRODUCTS - one-click launcher (v4 - verbose probe + decoupled browser)
REM 1. Quick-detect existing dev server on port 8000/8080/5500 (TCP connect probe).
REM 2. If none, launch start-dev.ps1 in a NEW PowerShell window titled "DENN Dev Server".
REM 3. Poll for the server with verbose per-iteration diagnostics on screen.
REM 4. Open the browser to http://localhost:<port>/denn-admin.html.
REM    CHANGED v4: browser open is attempted even on polling failure (best-effort,
REM    falls back to port 8000). Symptom report 2026-05-20: polling timed out but
REM    server window looked normal => detection method (Get-NetTCPConnection) was
REM    likely the failure point. Replaced with TcpClient probe in _denn-detect-port.ps1.
REM
REM ASCII-only by design (Korean Windows CP949 safe). Korean docs in docs/local-dev.md.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "DENN_PORT="
set "DENN_PORT_GUESSED="

REM ===== Pass 1: quick-probe for an already-running server (~2s) =====
echo [pass1] Quick-checking for existing DENN dev server...
if not exist "_denn-detect-port.ps1" (
  echo [ERROR] _denn-detect-port.ps1 not found in %CD%
  echo Make sure you ran this from the repo root and the file is restored.
  pause
  exit /b 1
)
for /f "tokens=1,* delims==" %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_denn-detect-port.ps1" -Quick') do (
  if /i "%%a"=="FOUND" set "DENN_PORT=%%b"
)

if defined DENN_PORT (
  echo [pass1] Detected existing server on port !DENN_PORT!.
  goto :open_browser
)
echo [pass1] No existing server detected.

REM ===== Pass 2: no server - start one =====
if not exist "start-dev.ps1" (
  echo [ERROR] start-dev.ps1 not found in %CD%
  echo Make sure you ran this from the repo root.
  pause
  exit /b 1
)

set "DENN_HAS_PY="
set "DENN_HAS_NODE="
where python >nul 2>nul && set "DENN_HAS_PY=1"
if not defined DENN_HAS_PY where python3 >nul 2>nul && set "DENN_HAS_PY=1"
where node >nul 2>nul && set "DENN_HAS_NODE=1"

if not defined DENN_HAS_PY if not defined DENN_HAS_NODE (
  echo.
  echo [ERROR] Neither python nor node is installed ^(or not on PATH^).
  echo   Python ^(fastest^): open Microsoft Store, search "Python 3.x", install.
  echo   Node:             https://nodejs.org -^> download LTS, install.
  pause
  exit /b 1
)

echo [pass2] Starting DENN dev server in a new window...
start "DENN Dev Server" powershell -NoExit -ExecutionPolicy Bypass -Command "$Host.UI.RawUI.WindowTitle='DENN Dev Server'; & '%~dp0start-dev.ps1'"

echo [pass2] Polling for server (up to 60s). One line per probe on screen below:
echo --------------------------------------------------------------------
for /f "tokens=1,* delims==" %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_denn-detect-port.ps1" -TimeoutSec 60 -IntervalMs 700') do (
  if /i "%%a"=="FOUND" set "DENN_PORT=%%b"
)
echo --------------------------------------------------------------------

if not defined DENN_PORT (
  echo.
  echo [WARN] Polling timed out - no server detected on 8000/8080/5500.
  if defined DENN_HAS_PY (
    echo        Runtime: python ^(should bind in ^<1s^). Most likely the
    echo        "DENN Dev Server" window has an error message - check it.
  ) else (
    echo        Runtime: node only ^(npx serve may still be downloading ~40MB^).
  )
  echo        BEST-EFFORT: trying browser open on port 8000 anyway.
  echo        If the page fails to load, see the "DENN Dev Server" window.
  set "DENN_PORT=8000"
  set "DENN_PORT_GUESSED=1"
)

:open_browser
echo.
if defined DENN_PORT_GUESSED (
  echo [browser] Best-effort open ^(polling failed^): http://localhost:!DENN_PORT!/denn-admin.html
) else (
  echo [browser] Opening: http://localhost:!DENN_PORT!/denn-admin.html
)

REM Locate Chrome explicitly. start "" "http://..." (default-handler route)
REM sometimes fails to cold-start Chrome on Win11; calling chrome.exe directly
REM is reliable whether Chrome is already running or not.
set "DENN_CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "DENN_CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined DENN_CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "DENN_CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined DENN_CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "DENN_CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined DENN_CHROME (
  start "" "!DENN_CHROME!" "http://localhost:!DENN_PORT!/denn-admin.html"
) else (
  start "" "http://localhost:!DENN_PORT!/denn-admin.html"
)

if defined DENN_PORT_GUESSED (
  echo.
  echo [HINT] Polling failed. If the page didn't load:
  echo        1^) check the "DENN Dev Server" PowerShell window for errors
  echo        2^) confirm actual port: netstat -ano ^| findstr LISTEN
  echo        3^) manually browse: http://localhost:^<PORT^>/denn-admin.html
  pause
)
exit /b 0
