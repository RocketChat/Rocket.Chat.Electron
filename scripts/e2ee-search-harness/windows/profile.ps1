# Makes a new, empty test profile for one run.
#
#   profile.ps1 -Root <dir> -AppName <name> -Url <server url>
#
# It deletes $Root\profile, $Root\run and the app data folder of $AppName,
# and writes servers.json with the server URL. Then it checks that this host
# reaches the server (through the SSH tunnel of the Mac) and prints
# "server reachable: <HTTP status or error>".

param(
  [Parameter(Mandatory = $true)][string]$Root,
  [Parameter(Mandatory = $true)][string]$AppName,
  [Parameter(Mandatory = $true)][string]$Url
)
. "$PSScriptRoot\common.ps1"

if ($AppName -eq 'Rocket.Chat') {
  'AppName must not be Rocket.Chat: that is the production name'
  exit 2
}
if ((Get-TestProcesses $Root).Count -gt 0) {
  'the test app still runs: run stop.ps1 first'
  exit 2
}

$ProfileDir = "$Root\profile"
foreach ($dir in @($ProfileDir, "$Root\run", "$env:APPDATA\$AppName")) {
  if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
}
New-Item -ItemType Directory -Force $ProfileDir, "$Root\run" | Out-Null
'{"Server":"' + $Url + '"}' | Set-Content -Encoding ascii "$ProfileDir\servers.json"
"profile ready at $ProfileDir"

try {
  $status = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 "$Url/api/info").StatusCode
} catch {
  $status = $_.Exception.Message
}
"server reachable: $status"
