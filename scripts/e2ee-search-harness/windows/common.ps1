# Shared helpers for the Windows side of the E2EE search harness. The other
# scripts dot-source this file. Do not run it.
#
# The scripts run in Windows PowerShell 5.1, so they use no PowerShell 7
# syntax. Every path is under -Root, except the app data folder of the test
# product name ($env:APPDATA\<AppName>).

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

# Puts $NodeDir first in PATH when it is set, and stops when no node is found.
function Use-Node([string]$NodeDir) {
  if ($NodeDir) { $env:Path = "$NodeDir;$env:Path" }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    'node not found: install Node.js 22.18 or later, or pass -NodeDir'
    exit 2
  }
}

# The processes of the packaged test app. Only executables under $Root\dist
# match, so another Rocket.Chat app on the host is never touched.
function Get-TestProcess([string]$Root) {
  $prefix = "$Root\dist\"
  @(Get-Process -Name 'Rocket.Chat' -ErrorAction SilentlyContinue |
      Where-Object { $_.Path -and $_.Path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) })
}

# The main.log of the test app: in the logs folder of the profile, or in the
# app data folder of the test product name.
function Get-MainLog([string]$Root, [string]$AppName) {
  foreach ($candidate in @("$Root\profile\logs\main.log", "$env:APPDATA\$AppName\logs\main.log")) {
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
}

# The machine type in the PE header of an executable or a native module.
function Get-PeMachine([string]$Path) {
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $pe = [BitConverter]::ToInt32($bytes, 0x3c)
  switch ([BitConverter]::ToUInt16($bytes, $pe + 4)) {
    0x8664 { 'x64' }
    0x14c { 'ia32' }
    0xaa64 { 'arm64' }
    default { 'unknown' }
  }
}
