#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$UserProfile = $env:USERPROFILE
$MsiPath     = Join-Path $UserProfile 'Downloads\rocketchat-test.msi'
$InstallDir  = 'C:\Program Files\Rocket.Chat'
$UpdateJson  = "$InstallDir\resources\update.json"
$ResultFile  = Join-Path $UserProfile 'test-results.json'
$PsExecPath  = 'C:\Tools\PsExec.exe'
$LogBase     = $UserProfile

$results = @()

# ---------------------------------------------------------------------------
function Uninstall-RocketChat {
    $pkg = Get-Package -Name "Rocket.Chat*" -ErrorAction SilentlyContinue
    if ($pkg) {
        Write-Host "  Uninstalling existing Rocket.Chat ($($pkg.Name)) ..."
        $uninstallStr = (Get-ItemProperty `
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" `
            -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -like "Rocket.Chat*" } |
            Select-Object -First 1).UninstallString
        if ($uninstallStr) {
            $guid = [regex]::Match($uninstallStr, '\{[^}]+\}').Value
            if ($guid) {
                Start-Process msiexec -ArgumentList "/x $guid /qn" -Wait -NoNewWindow
            }
        }
        # fallback: direct msiexec on the known MSI
        if (Test-Path $MsiPath) {
            Start-Process msiexec -ArgumentList "/x `"$MsiPath`" /qn" -Wait -NoNewWindow
        }
    }
    # wait for files to release
    Start-Sleep -Seconds 3
    if (Test-Path $InstallDir) {
        Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Read-InstallLog($logPath) {
    if (Test-Path $logPath) {
        return (Get-Content $logPath -Raw)
    }
    return ""
}

function Assert-NoInstallError($logContent) {
    if ($logContent -match "Return value 3" -or $logContent -match "installation failed") {
        throw "Install log contains failure indicator."
    }
}

# ---------------------------------------------------------------------------
# SCENARIO A — baseline install (no DISABLE_AUTO_UPDATES)
# ---------------------------------------------------------------------------
Write-Host "`n=== Scenario A: baseline install ==="
$scenarioA = [ordered]@{ scenario = "A"; description = "baseline (no DISABLE_AUTO_UPDATES)"; result = "FAIL"; details = ""; log = "" }
try {
    Uninstall-RocketChat
    $logA = "$LogBase\install-a.log"
    Write-Host "  Installing (no property) ..."
    $proc = Start-Process msiexec -ArgumentList "/i `"$MsiPath`" /qn /l*v `"$logA`"" -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -ne 0) { throw "msiexec exited $($proc.ExitCode)" }

    $logContent = Read-InstallLog $logA
    Assert-NoInstallError $logContent

    if (-not (Test-Path "$InstallDir\Rocket.Chat.exe")) { throw "Rocket.Chat.exe not found after install." }
    if (Test-Path $UpdateJson) { throw "update.json exists but should NOT exist for baseline install." }

    Write-Host "  PASS"
    $scenarioA.result  = "PASS"
    $scenarioA.details = "Rocket.Chat.exe present; update.json correctly absent."
    $scenarioA.log     = $logContent
} catch {
    Write-Host "  FAIL: $_"
    $scenarioA.details = $_.ToString()
    $scenarioA.log     = Read-InstallLog "$LogBase\install-a.log"
} finally {
    Uninstall-RocketChat
}
$results += $scenarioA

# ---------------------------------------------------------------------------
# SCENARIO B — DISABLE_AUTO_UPDATES=1 interactive context
# ---------------------------------------------------------------------------
Write-Host "`n=== Scenario B: DISABLE_AUTO_UPDATES=1 (interactive) ==="
$scenarioB = [ordered]@{ scenario = "B"; description = "DISABLE_AUTO_UPDATES=1 interactive"; result = "FAIL"; details = ""; log = "" }
try {
    Uninstall-RocketChat
    $logB = "$LogBase\install-b.log"
    Write-Host "  Installing with DISABLE_AUTO_UPDATES=1 ..."
    $proc = Start-Process msiexec -ArgumentList "/i `"$MsiPath`" DISABLE_AUTO_UPDATES=1 /qn /l*v `"$logB`"" -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -ne 0) { throw "msiexec exited $($proc.ExitCode)" }

    $logContent = Read-InstallLog $logB
    Assert-NoInstallError $logContent

    if (-not (Test-Path $UpdateJson)) { throw "update.json not found at $UpdateJson" }

    $json = Get-Content $UpdateJson -Raw | ConvertFrom-Json
    if ($json.canUpdate  -ne $false) { throw "canUpdate is not false (got: $($json.canUpdate))" }
    if ($json.autoUpdate -ne $false) { throw "autoUpdate is not false (got: $($json.autoUpdate))" }

    $logRepairB = "$LogBase\repair-b.log"
    Write-Host "  Repairing without DISABLE_AUTO_UPDATES to verify update.json is preserved ..."
    $repair = Start-Process msiexec -ArgumentList "/fa `"$MsiPath`" /qn /l*v `"$logRepairB`"" -Wait -PassThru -NoNewWindow
    if ($repair.ExitCode -ne 0) { throw "repair msiexec exited $($repair.ExitCode)" }

    if (-not (Test-Path $UpdateJson)) { throw "update.json missing after repair at $UpdateJson" }
    $json = Get-Content $UpdateJson -Raw | ConvertFrom-Json
    if ($json.canUpdate  -ne $false) { throw "canUpdate changed after repair (got: $($json.canUpdate))" }
    if ($json.autoUpdate -ne $false) { throw "autoUpdate changed after repair (got: $($json.autoUpdate))" }

    Write-Host "  PASS"
    $scenarioB.result  = "PASS"
    $scenarioB.details = "update.json present with canUpdate=false, autoUpdate=false; preserved after repair."
    $scenarioB.log     = $logContent
} catch {
    Write-Host "  FAIL: $_"
    $scenarioB.details = $_.ToString()
    $scenarioB.log     = Read-InstallLog "$LogBase\install-b.log"
} finally {
    Uninstall-RocketChat
}
$results += $scenarioB

# ---------------------------------------------------------------------------
# SCENARIO C — DISABLE_AUTO_UPDATES=1 via SYSTEM context (SCCM simulation)
# ---------------------------------------------------------------------------
Write-Host "`n=== Scenario C: DISABLE_AUTO_UPDATES=1 via PsExec SYSTEM ==="
$scenarioC = [ordered]@{ scenario = "C"; description = "DISABLE_AUTO_UPDATES=1 SYSTEM (SCCM sim)"; result = "FAIL"; details = ""; log = "" }
try {
    # Ensure PsExec is available
    if (-not (Test-Path $PsExecPath)) {
        Write-Host "  Downloading PsExec ..."
        $zipPath = "C:\Tools\PSTools.zip"
        New-Item -ItemType Directory -Path "C:\Tools" -Force | Out-Null
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile("https://download.sysinternals.com/files/PSTools.zip", $zipPath)
        Expand-Archive -Path $zipPath -DestinationPath "C:\Tools" -Force
        Remove-Item $zipPath -Force
    }
    if (-not (Test-Path $PsExecPath)) { throw "PsExec.exe not found at $PsExecPath after download." }

    $sig = Get-AuthenticodeSignature $PsExecPath
    if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Microsoft') {
        throw "Downloaded PsExec.exe failed Authenticode signature validation. Status=$($sig.Status), Subject=$($sig.SignerCertificate.Subject)"
    }

    Uninstall-RocketChat
    $logC = Join-Path $UserProfile 'install-c.log'
    Write-Host "  Installing as SYSTEM with DISABLE_AUTO_UPDATES=1 ..."

    # PsExec -s runs the process as SYSTEM; -accepteula suppresses the EULA dialog.
    # ALLUSERS=1 ensures a per-machine install when running as SYSTEM.
    $psexecArgs = "-s -accepteula msiexec /i `"$MsiPath`" DISABLE_AUTO_UPDATES=1 ALLUSERS=1 /qn /l*v `"$logC`""
    $proc = Start-Process $PsExecPath -ArgumentList $psexecArgs -Wait -PassThru -NoNewWindow
    # PsExec forwards the exit code of the child process.
    if ($proc.ExitCode -ne 0) { throw "PsExec/msiexec exited $($proc.ExitCode)" }

    $logContent = Read-InstallLog $logC
    Assert-NoInstallError $logContent

    if (-not (Test-Path $UpdateJson)) { throw "update.json not found at $UpdateJson" }

    $json = Get-Content $UpdateJson -Raw | ConvertFrom-Json
    if ($json.canUpdate  -ne $false) { throw "canUpdate is not false (got: $($json.canUpdate))" }
    if ($json.autoUpdate -ne $false) { throw "autoUpdate is not false (got: $($json.autoUpdate))" }

    Write-Host "  PASS"
    $scenarioC.result  = "PASS"
    $scenarioC.details = "update.json present with canUpdate=false, autoUpdate=false (SYSTEM context)."
    $scenarioC.log     = $logContent
} catch {
    Write-Host "  FAIL: $_"
    $scenarioC.details = $_.ToString()
    $scenarioC.log     = Read-InstallLog (Join-Path $UserProfile 'install-c.log')
} finally {
    Uninstall-RocketChat
}
$results += $scenarioC

# ---------------------------------------------------------------------------
# Write results JSON
# ---------------------------------------------------------------------------
$results | ConvertTo-Json -Depth 5 | Set-Content $ResultFile -Encoding UTF8
Write-Host "`nResults written to $ResultFile"

# Exit non-zero if any scenario failed
$failed = $results | Where-Object { $_.result -eq "FAIL" }
if ($failed) {
    Write-Host "`nFAILED scenarios: $(($failed | ForEach-Object { $_.scenario }) -join ', ')"
    exit 1
}
Write-Host "`nAll scenarios PASSED."
exit 0
