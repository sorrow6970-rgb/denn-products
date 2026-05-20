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

echo Starting DENN dev server in a new window...
start "DENN Dev Server" powershell -NoExit -ExecutionPolicy Bypass -Command "$Host.UI.RawUI.WindowTitle='DENN Dev Server'; & '%~dp0start-dev.ps1'"

echo Waiting for server to come up (up to 5 seconds)...
for /l %%i in (1,1,5) do (
  timeout /t 1 /nobreak >nul
  if not defined DENN_PORT (
    for /f "tokens=*" %%p in ('powershell -NoProfile -Command "@(8000,8080,5500) ^| Where-Object { Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue } ^| Select-Object -First 1" 2^>nul') do set "DENN_PORT=%%p"
  )
)

if not defined DENN_PORT (
  echo.
  echo [ERROR] Server did not come up within 5 seconds.
  echo Check the "DENN Dev Server" PowerShell window for error messages.
  echo If neither node nor python is installed:
  echo   Python ^(fastest^): open Microsoft Store, search "Python 3.x", install.
  echo   Node:             https://nodejs.org -^> download LTS, install.
  pause
  exit /b 1
)

:open_browser
echo.
echo Opening browser: http://localhost:!DENN_PORT!/denn-admin.html
start "" "http://localhost:!DENN_PORT!/denn-admin.html"
exit /b 0
