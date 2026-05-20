# DENN Products - local static dev server launcher
# Purpose: serve repo root over http://localhost to escape file:// origin's
#          shared 5MB localStorage pool that quota-blocks small (~100KB) writes.
# Runtime: prefers node (npx serve), falls back to python (http.server).
# Ports:   8000 -> 8080 -> 5500 (first free wins).
# Stop:    Ctrl+C
# Compat:  Windows PowerShell 5.1+ / PowerShell 7+. ASCII-only by design
#          to avoid PS5.1 default-codepage issues on non-BOM UTF-8 scripts.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

function Test-PortFree {
    param([int]$p)
    $listeners = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    return ($null -eq $listeners)
}

$ports = @(8000, 8080, 5500)
$port = $null
foreach ($p in $ports) {
    if (Test-PortFree -p $p) { $port = $p; break }
}
if ($null -eq $port) {
    Write-Host "[ERROR] Ports 8000/8080/5500 all in use." -ForegroundColor Red
    Write-Host "        Find occupier: netstat -ano | findstr :8000" -ForegroundColor Yellow
    Write-Host "        Then: Stop-Process -Id <PID> -Force" -ForegroundColor Yellow
    exit 1
}

$url = "http://localhost:$port"
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " DENN Products - local dev server" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host (" Root  : {0}" -f $root)
Write-Host (" Admin : {0}/denn-admin.html" -f $url)
Write-Host (" Mockup: {0}/denn-mockup-tool.html" -f $url)
Write-Host " Stop  : Ctrl+C"
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python3 -ErrorAction SilentlyContinue }
$node = Get-Command node -ErrorAction SilentlyContinue

# Python is preferred: starts in <1s, no package download.
# npx serve cold-start can take 30-60s on first run (downloads ~40MB),
# which blows past the launcher's wait window after a reboot.
if ($python) {
    Write-Host "[runtime] python found -> http.server (fast cold start)" -ForegroundColor Green
    & $python.Source -m http.server $port --directory $root
}
elseif ($node) {
    Write-Host "[runtime] node found -> npx --yes serve" -ForegroundColor Green
    Write-Host "[note]    first run may download 'serve' (~40MB)" -ForegroundColor Yellow
    & npx --yes serve $root -l $port
}
else {
    Write-Host "[ERROR] Neither python nor node is installed." -ForegroundColor Red
    Write-Host "        Python (fastest): Microsoft Store -> search 'Python 3.x'" -ForegroundColor Yellow
    Write-Host "        Node: https://nodejs.org -> LTS installer" -ForegroundColor Yellow
    exit 1
}
