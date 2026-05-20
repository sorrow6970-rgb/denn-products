# _denn-detect-port.ps1 - detect DENN dev server by TCP connect probe.
# Called from DENN admin / start .bat files. ASCII-only by design (PS 5.1
# default codepage safe, mirrors start-dev.ps1 convention).
#
# Why TCP-connect probe instead of Get-NetTCPConnection?
#   Get-NetTCPConnection -State Listen was unreliable in the field (returned
#   empty even when python http.server was clearly bound). TcpClient mirrors
#   exactly what the browser will do when it loads the page.
#
# Outputs:
#   stderr: one diagnostic line per probe iteration + start/end banners
#   stdout: a single line "FOUND=<port>" on success, nothing on failure
# Exit code: 0 success, 1 timeout

param(
    [int]$TimeoutSec = 60,
    [int[]]$Ports = @(8000, 8080, 5500),
    [int]$IntervalMs = 700,
    [int]$ConnectTimeoutMs = 200,
    [switch]$Quick
)

if ($Quick) {
    $TimeoutSec = 2
    $IntervalMs = 200
}

$portList = ($Ports -join ',')
[Console]::Error.WriteLine("[detect] probing $portList every ${IntervalMs}ms for up to ${TimeoutSec}s (TcpClient connect to 127.0.0.1, timeout ${ConnectTimeoutMs}ms per port)")

$startTime = Get-Date
$deadline = $startTime.AddSeconds($TimeoutSec)
$iter = 0
$found = $null

while ((Get-Date) -lt $deadline) {
    $iter++
    $elapsed = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
    $line = "[probe $iter t=${elapsed}s]"
    foreach ($p in $Ports) {
        $up = $false
        $client = $null
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $task = $client.ConnectAsync('127.0.0.1', $p)
            if ($task.Wait($ConnectTimeoutMs) -and $client.Connected) {
                $up = $true
            }
        } catch {
            # any exception => down
        } finally {
            if ($client) { try { $client.Close() } catch { } }
        }
        if ($up) {
            $line += " ${p}:UP"
            if (-not $found) { $found = $p }
        } else {
            $line += " ${p}:-"
        }
    }
    [Console]::Error.WriteLine($line)
    if ($found) {
        [Console]::Error.WriteLine("[detect] OK server found on port $found after $iter probe(s)")
        Write-Output "FOUND=$found"
        exit 0
    }
    Start-Sleep -Milliseconds $IntervalMs
}

[Console]::Error.WriteLine("[detect] FAIL no server on $portList after $iter probe(s) (~${TimeoutSec}s)")
[Console]::Error.WriteLine("[detect] Hint: check 'DENN Dev Server' window for errors,")
[Console]::Error.WriteLine("[detect]       or run: netstat -ano | findstr LISTEN")
[Console]::Error.WriteLine("[detect]       to see what port the server actually bound to.")
exit 1
