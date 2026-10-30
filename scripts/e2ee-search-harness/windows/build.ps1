# Builds the packaged x64 app of the E2EE search harness on this host.
#
#   build.ps1 -Root <dir> -AppName <name> [-NodeDir <dir>]
#
# It unpacks $Root\src.tar into a new $Root\src, runs yarn install and the
# production build, and packages $Root\dist\win-unpacked with
# electron-builder (no installer, no signature). The executable stays
# Rocket.Chat.exe, but the app gets the product name $AppName, so its app
# data folder is not the folder of the production app. The full logs go to
# $Root\logs.
#
# Exit codes: 3 unpack or install, 4 build, 5 package, 6 no x64 executable.

param(
  [Parameter(Mandatory = $true)][string]$Root,
  [Parameter(Mandatory = $true)][string]$AppName,
  [string]$NodeDir = ''
)
. "$PSScriptRoot\common.ps1"
Use-Node $NodeDir

if ($AppName -eq 'Rocket.Chat') {
  'AppName must not be Rocket.Chat: that is the production name'
  exit 2
}

# The postinstall of puppeteer downloads a browser that only the seed on the
# Mac uses.
$env:PUPPETEER_SKIP_DOWNLOAD = '1'
$Src = "$Root\src"
$Dist = "$Root\dist"
$Logs = "$Root\logs"
foreach ($dir in @($Src, $Dist)) {
  if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
}
New-Item -ItemType Directory -Force $Src, $Logs | Out-Null
Set-Location $Src
tar -xf "$Root\src.tar"
if ($LASTEXITCODE -ne 0) { "tar exit=$LASTEXITCODE"; exit 3 }

$yarnPath = (Select-String -Path "$Src\.yarnrc.yml" -Pattern '^yarnPath:\s*(.+)$').Matches[0].Groups[1].Value.Trim()
$Yarn = Join-Path $Src $yarnPath
"node $(node -v), yarn $yarnPath"

$started = Get-Date
node $Yarn install --immutable *> "$Logs\install.log"
"install exit=$LASTEXITCODE in $([int]((Get-Date) - $started).TotalSeconds) s"
if ($LASTEXITCODE -ne 0) { Get-Content "$Logs\install.log" -Tail 40; exit 3 }

$started = Get-Date
$env:NODE_ENV = 'production'
node $Yarn build *> "$Logs\build.log"
$code = $LASTEXITCODE
Remove-Item Env:NODE_ENV
"build exit=$code in $([int]((Get-Date) - $started).TotalSeconds) s"
if ($code -ne 0) { Get-Content "$Logs\build.log" -Tail 40; exit 4 }

# Windows PowerShell splits an unquoted argument such as -c.a=b at the dot,
# so every -c argument is quoted.
$started = Get-Date
node $Yarn electron-builder --win dir --x64 --publish never `
  '-c.productName=Rocket.Chat' `
  "-c.extraMetadata.productName=$AppName" `
  "-c.directories.output=$Dist" *> "$Logs\package.log"
"package exit=$LASTEXITCODE in $([int]((Get-Date) - $started).TotalSeconds) s"
if ($LASTEXITCODE -ne 0) { Get-Content "$Logs\package.log" -Tail 40; exit 5 }

$Exe = "$Dist\win-unpacked\Rocket.Chat.exe"
if (-not (Test-Path $Exe)) { "no executable at $Exe"; exit 6 }
$machine = Get-PeMachine $Exe
"executable $Exe, version $((Get-Item $Exe).VersionInfo.ProductVersion), machine $machine"
Get-ChildItem -Recurse -File -Filter 'win32-*.node' "$Dist\win-unpacked\resources\app.asar.unpacked" -ErrorAction SilentlyContinue |
  ForEach-Object { 'native ' + $_.FullName.Substring($Dist.Length) + ', machine ' + (Get-PeMachine $_.FullName) }
if ($machine -ne 'x64') { exit 6 }
exit 0
