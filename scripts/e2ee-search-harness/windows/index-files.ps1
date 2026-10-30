# Counts the files of the search index and of its key in the test profile
# and in the app data folder of the test product name. A path matches when
# it starts with e2ee-search in one of those folders.
#
#   index-files.ps1 -Root <dir> -AppName <name>
#
# Output:
#   DIR <path> exists=<True|False>   one per folder
#   FILE <path>                      one per file found
#   INDEXFILES <n>                   the number of files found

param(
  [Parameter(Mandatory = $true)][string]$Root,
  [Parameter(Mandatory = $true)][string]$AppName
)
. "$PSScriptRoot\common.ps1"

$files = @()
foreach ($dir in @("$Root\profile", "$env:APPDATA\$AppName")) {
  $exists = Test-Path $dir
  "DIR $dir exists=$exists"
  if (-not $exists) { continue }
  foreach ($item in @(Get-ChildItem -Force -Filter 'e2ee-search*' $dir -ErrorAction SilentlyContinue)) {
    if ($item.PSIsContainer) {
      $files += @(Get-ChildItem -Force -Recurse -File $item.FullName -ErrorAction SilentlyContinue)
    } else {
      $files += $item
    }
  }
}
$files | ForEach-Object { 'FILE ' + $_.FullName }
"INDEXFILES $($files.Count)"
