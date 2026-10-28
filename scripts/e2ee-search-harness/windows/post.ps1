# Checks after a run, when the test app does not run: the wrap of key.bin,
# and a canary scan of the profile and the app data folder for each word.
#
#   post.ps1 -Root <dir> -AppName <name> -Words <w1,w2,...> -Control <token> [-NodeDir <dir>]
#
# The scan uses canary-scan.mjs of the built source in $Root\src. Output:
#   KEYFILES <n>                    key.bin files in the search index folder
#   KEY <json>                      the result of keycheck.mjs, one per key.bin
#   INDEXFILES <n>                  files in the search index folder
#   SCAN <word> exit=<n> <folder>   one per word and folder: 0 no hit, 1 hit, 2 error
#   HIT <word> <encoding> offset=<n> <path>   one per hit, with / in the path
#   CONTROL exit=<n> hits=<n>       the scan of the profile for the control token

param(
  [Parameter(Mandatory = $true)][string]$Root,
  [Parameter(Mandatory = $true)][string]$AppName,
  [Parameter(Mandatory = $true)][string]$Words,
  [Parameter(Mandatory = $true)][string]$Control,
  [string]$NodeDir = ''
)
. "$PSScriptRoot\common.ps1"
Use-Node $NodeDir

if ((Get-TestProcesses $Root).Count -gt 0) {
  'the test app still runs: run stop.ps1 first'
  exit 2
}

$ProfileDir = "$Root\profile"
$IndexDir = "$ProfileDir\e2ee-search"
$Scan = "$Root\src\scripts\e2ee-search-harness\canary-scan.mjs"

$keys = @(Get-ChildItem -Recurse -File -Filter 'key.bin' $IndexDir -ErrorAction SilentlyContinue)
"KEYFILES $($keys.Count)"
foreach ($key in $keys) {
  'KEY ' + (node "$PSScriptRoot\keycheck.mjs" $ProfileDir $key.FullName)
}
"INDEXFILES $(@(Get-ChildItem -Recurse -File $IndexDir -ErrorAction SilentlyContinue).Count)"

$dirs = @($ProfileDir)
if (Test-Path "$env:APPDATA\$AppName") { $dirs += "$env:APPDATA\$AppName" }
foreach ($word in $Words.Split(',')) {
  foreach ($dir in $dirs) {
    $out = @(node $Scan --dir $dir --token $word 2>$null)
    "SCAN $word exit=$LASTEXITCODE $dir"
    foreach ($line in $out) {
      if ("$line" -like 'HIT *') { "HIT $word " + "$line".Substring(4).Replace('\', '/') }
    }
  }
}

$out = @(node $Scan --dir $ProfileDir --token $Control 2>$null)
$code = $LASTEXITCODE
"CONTROL exit=$code hits=$(@($out | Where-Object { "$_" -like 'HIT *' }).Count)"
