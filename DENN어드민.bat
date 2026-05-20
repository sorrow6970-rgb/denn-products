@echo off
REM DENN PRODUCTS - one-click launcher
REM 1. Detect existing dev server on port 8000/8080/5500
REM 2. If none, launch start-dev.ps1 in a NEW PowerShell window titled "DENN Dev Server"
REM 3. Wait up to 5 seconds for the server to come up
REM 4. Open the default browser to http://localhost:<port>/denn-admin.html
REM
REM ASCII-only by design (Korean Windows CP949 safe). Korean docs in docs/local-dev.md.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "DENN_PORT="

REM ===== Pass 1: detect already-running server =====
for /f "tokens=*" %%p in ('powershell -NoProfile -Command "@(8000,8080,5500) ^| Where-Object { Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue } ^| Select-Object -First 1" 2^>nul') do set "DENN_PORT=%%p"
if defined DENN_PORT (
  echo Existing DENN dev server detected on port !DENN_PORT!.
  goto :open_browser
)

REM ===== Pass 2: no server - start one =====
if not exist "start-dev.ps1" (
  echo [ERROR] start-dev.ps1 not found in %CD%
  echo Make sure you ran this from the repo root.
  pause
  exit /b 1
)

REM Check runtime availability up-front so we can distinguish
REM "no runtime installed" from "runtime present but slow to start"
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

echo Starting DENN dev server in a new window...
start "DENN Dev Server" powershell -NoExit -ExecutionPolicy Bypass -Command "$Host.UI.RawUI.WindowTitle='DENN Dev Server'; & '%~dp0start-dev.ps1'"

REM Wait up to 30 seconds. python http.server binds in <1s; npx serve
REM cold-start (first reboot after install) can take 20-30s downloading.
echo Waiting for server to come up (up to 30 seconds)...
<nul set /p "=  "
for /l %%i in (1,1,30) do (
  timeout /t 1 /nobreak >nul
  if not defined DENN_PORT (
    <nul set /p "=."
    for /f "tokens=*" %%p in ('powershell -NoProfile -Command "@(8000,8080,5500) ^| Where-Object { Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue } ^| Select-Object -First 1" 2^>nul') do set "DENN_PORT=%%p"
  )
)
echo.

if not defined DENN_PORT (
  echo.
  echo [ERROR] Server did not come up within 30 seconds.
  echo Check the "DENN Dev Server" PowerShell window for error messages.
  if defined DENN_HAS_PY (
    echo Runtime detected: python ^(should have been instant - look for crash/error in that window^)
  ) else (
    echo Runtime detected: node only ^(npx serve may still be downloading - try again in 1 min,
    echo                   or install Python from Microsoft Store for instant startup^)
  )
  pause
  exit /b 1
)

:open_browser
echo.
echo Opening browser: http://localhost:!DENN_PORT!/denn-admin.html
start "" "http://localhost:!DENN_PORT!/denn-admin.html"
exit /b 0
