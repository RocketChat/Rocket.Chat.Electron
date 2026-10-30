# Reads main.log of the test app.
#
#   logs.ps1 -Root <dir> -AppName <name> [-From <line>] [-Copy]
#
# The first line is "LINES <n> <path>" (LINES 0 none when there is no log).
# Then it prints the lines about the index store after line -From. With
# -Copy, it also copies main.log to $Root\run\main.log, so the Mac can fetch
# it with scp.

param(
  [Parameter(Mandatory = $true)][string]$Root,
  [Parameter(Mandatory = $true)][string]$AppName,
  [int]$From = 0,
  [switch]$Copy
)
. "$PSScriptRoot\common.ps1"

$log = Get-MainLog $Root $AppName
if (-not $log) {
  'LINES 0 none'
  exit 0
}
$lines = @(Get-Content -Encoding UTF8 $log)
"LINES $($lines.Count) $log"
$lines | Select-Object -Skip $From |
  Where-Object { $_ -match 'index opened|file store did not open' } |
  ForEach-Object { $_.Substring(0, [Math]::Min(300, $_.Length)) }
if ($Copy) {
  New-Item -ItemType Directory -Force "$Root\run" | Out-Null
  Copy-Item -Force $log "$Root\run\main.log"
}
