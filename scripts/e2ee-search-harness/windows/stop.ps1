# Ends every process of the packaged test app at once.
#
#   stop.ps1 -Root <dir>
#
# Stop-Process -Force ends each process with no quit handler, as a SIGKILL
# does on macOS. Only processes under $Root\dist are touched.

param([Parameter(Mandatory = $true)][string]$Root)
. "$PSScriptRoot\common.ps1"

$processes = Get-TestProcesses $Root
"stopping $($processes.Count) processes"
$processes | Stop-Process -Force -ErrorAction SilentlyContinue
$left = @()
for ($i = 0; $i -lt 10; $i++) {
  $left = Get-TestProcesses $Root
  if ($left.Count -eq 0) { break }
  Start-Sleep -Seconds 1
}
"left $($left.Count)"
