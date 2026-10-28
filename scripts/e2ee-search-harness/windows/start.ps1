# Starts the packaged test app and holds the SSH session until the app exits.
#
#   start.ps1 -Root <dir> -Port <CDP port> -Tag <name>
#
# The app gets the profile $Root\profile and a remote debugging port on
# 127.0.0.1. Its stdout and stderr go to $Root\run\app-<Tag>.out and .err.
# The first line is "STARTED pid=<n>". The last line is
# "EXITED code=<n> left=<n>", where left counts the processes of the app
# that still ran 30 s after the main process exited.

param(
  [Parameter(Mandatory = $true)][string]$Root,
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $true)][string]$Tag
)
. "$PSScriptRoot\common.ps1"

$Exe = "$Root\dist\win-unpacked\Rocket.Chat.exe"
if (-not (Test-Path $Exe)) {
  "no build at $Exe (run windows-packaged.sh --build)"
  exit 2
}
New-Item -ItemType Directory -Force "$Root\run" | Out-Null
$proc = Start-Process -FilePath $Exe -PassThru `
  -RedirectStandardOutput "$Root\run\app-$Tag.out" `
  -RedirectStandardError "$Root\run\app-$Tag.err" `
  -ArgumentList @("--remote-debugging-port=$Port", "--user-data-dir=$Root\profile")
# Without a read of the handle, ExitCode stays empty after the exit.
$null = $proc.Handle
"STARTED pid=$($proc.Id) at $((Get-Date).ToString('o'))"
$proc.WaitForExit()
$code = $proc.ExitCode
$left = @()
for ($i = 0; $i -lt 30; $i++) {
  $left = Get-TestProcesses $Root
  if ($left.Count -eq 0) { break }
  Start-Sleep -Seconds 1
}
"EXITED code=$code left=$($left.Count) at $((Get-Date).ToString('o'))"
