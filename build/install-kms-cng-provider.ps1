param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# Configuration
$KMS_VERSION = "1.2.1"
$DOWNLOAD_URL = "https://github.com/GoogleCloudPlatform/kms-integrations/releases/download/cng-provider-v$KMS_VERSION/cng_provider_windows_amd64.zip"
$CacheDir = Join-Path $env:GITHUB_WORKSPACE "build\installers"
$CachedMsiPath = Join-Path $CacheDir "google-cloud-kms-cng-provider.msi"
$TempZipPath = Join-Path $env:TEMP "kms-cng-provider.zip"
$TempExtractDir = Join-Path $env:TEMP "kms-cng-extract"

Write-Host "Google Cloud KMS CNG Provider Installation Script"
Write-Host "=================================================="

# Create cache directory if needed
if (-not (Test-Path $CacheDir)) {
    Write-Host "Creating cache directory..."
    New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
}

# Check for cached MSI
if ((Test-Path $CachedMsiPath) -and -not $Force) {
    Write-Host "Using cached MSI file"
    $MsiPath = $CachedMsiPath
} else {
    Write-Host "Downloading KMS CNG provider..."

    # Clean up any existing temp files
    if (Test-Path $TempZipPath) {
        Remove-Item $TempZipPath -Force
    }
    if (Test-Path $TempExtractDir) {
        Remove-Item $TempExtractDir -Recurse -Force
    }

    # Download the ZIP file
    try {
        Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $TempZipPath -UseBasicParsing
        Write-Host "Download completed"
    } catch {
        Write-Error "Failed to download KMS CNG provider"
        exit 1
    }

    # Extract the ZIP file
    Write-Host "Extracting files..."
    Expand-Archive -Path $TempZipPath -DestinationPath $TempExtractDir -Force

    # Find the MSI file
    $ExtractedMsi = Get-ChildItem -Path $TempExtractDir -Filter "*.msi" -Recurse | Select-Object -First 1
    if (-not $ExtractedMsi) {
        Write-Error "MSI file not found in archive"
        exit 1
    }

    # Copy to cache
    Copy-Item -Path $ExtractedMsi.FullName -Destination $CachedMsiPath -Force
    Write-Host "MSI file cached"
    $MsiPath = $CachedMsiPath
}

# Install the MSI
Write-Host "Installing KMS CNG provider..."
$InstallArgs = @(
    "/i", "`"$MsiPath`"",
    "/quiet",
    "/norestart",
    "/l*v", "`"$env:TEMP\kms-cng-install.log`""
)

$Process = Start-Process -FilePath "msiexec.exe" -ArgumentList $InstallArgs -Wait -PassThru
if ($Process.ExitCode -eq 0) {
    Write-Host "Installation completed successfully"
} else {
    Write-Error "Installation failed with exit code: $($Process.ExitCode)"
    exit 1
}

# Cleanup
if (Test-Path $TempZipPath) {
    Remove-Item $TempZipPath -Force -ErrorAction SilentlyContinue
}
if (Test-Path $TempExtractDir) {
    Remove-Item $TempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Setup completed"