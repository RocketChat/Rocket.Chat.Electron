#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Downloads and installs Google Cloud KMS CNG Provider for Windows code signing.

.DESCRIPTION
    This script handles the complete process of downloading, extracting, caching, and installing
    the Google Cloud KMS CNG Provider. It uses GitHub Actions caching when available and falls
    back to downloading from the official Google repository.

.PARAMETER CacheDir
    Directory to cache the MSI file (default: build/installers)

.PARAMETER Force
    Force download even if cached file exists

.EXAMPLE
    .\install-kms-cng-provider.ps1
    
.EXAMPLE
    .\install-kms-cng-provider.ps1 -CacheDir "C:\temp\kms" -Force
#>

param(
    [string]$CacheDir = "build/installers",
    [switch]$Force
)

# Configuration
$KMS_VERSION = "cng-v1.2"
$ZIP_FILENAME = "kmscng-1.2-windows-amd64.zip"
$MSI_FILENAME = "google-cloud-kms-cng-provider.msi"
$DOWNLOAD_URL = "https://github.com/GoogleCloudPlatform/kms-integrations/releases/download/$KMS_VERSION/$ZIP_FILENAME"

# Paths
$WorkspaceDir = if ($env:GITHUB_WORKSPACE) { $env:GITHUB_WORKSPACE } else { $PWD }
$CacheDir = Join-Path $WorkspaceDir $CacheDir
$CachedMsiPath = Join-Path $CacheDir $MSI_FILENAME
$TempDir = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }
$TempZipPath = Join-Path $TempDir "kmscng.zip"
$TempExtractDir = Join-Path $TempDir "kmscng"

Write-Host "🚀 Google Cloud KMS CNG Provider Installer" -ForegroundColor Cyan
Write-Host "Version: $KMS_VERSION" -ForegroundColor Gray
Write-Host "Cache Directory: $CacheDir" -ForegroundColor Gray

# Create cache directory if it doesn't exist
if (-not (Test-Path $CacheDir)) {
    Write-Host "📁 Creating cache directory: $CacheDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
}

# Check if MSI is already cached (unless Force is specified)
if ((Test-Path $CachedMsiPath) -and -not $Force) {
    Write-Host "✅ Using cached MSI: $CachedMsiPath" -ForegroundColor Green
    $MsiPath = $CachedMsiPath
} else {
    if ($Force) {
        Write-Host "🔄 Force download requested, ignoring cache" -ForegroundColor Yellow
    } else {
        Write-Host "📥 MSI not found in cache, downloading..." -ForegroundColor Yellow
    }
    
    # Download and extract
    $MaxRetries = 3
    $Downloaded = $false
    
    for ($RetryCount = 1; $RetryCount -le $MaxRetries -and -not $Downloaded; $RetryCount++) {
        try {
            Write-Host "🌐 Download attempt $RetryCount of $MaxRetries" -ForegroundColor Cyan
            Write-Host "   URL: $DOWNLOAD_URL" -ForegroundColor Gray
            
            # Download ZIP file
            Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $TempZipPath -UserAgent "Mozilla/5.0" -TimeoutSec 300
            
            # Verify download
            if ((Get-Item $TempZipPath).Length -gt 1MB) {
                Write-Host "✅ ZIP downloaded successfully ($('{0:N2}' -f ((Get-Item $TempZipPath).Length / 1MB)) MB)" -ForegroundColor Green
                
                # Extract MSI from ZIP
                Write-Host "📦 Extracting MSI from ZIP..." -ForegroundColor Cyan
                if (Test-Path $TempExtractDir) {
                    Remove-Item -Path $TempExtractDir -Recurse -Force
                }
                Expand-Archive -Path $TempZipPath -DestinationPath $TempExtractDir -Force
                
                # Find MSI file
                $ExtractedMsi = Get-ChildItem -Path $TempExtractDir -Filter "*.msi" -Recurse | Select-Object -First 1
                
                if ($ExtractedMsi) {
                    # Copy to cache location
                    Copy-Item -Path $ExtractedMsi.FullName -Destination $CachedMsiPath -Force
                    Write-Host "✅ MSI extracted and cached: $($ExtractedMsi.Name)" -ForegroundColor Green
                    $MsiPath = $CachedMsiPath
                    $Downloaded = $true
                } else {
                    throw "No MSI file found in ZIP archive"
                }
            } else {
                throw "Downloaded file is too small ($('{0:N2}' -f ((Get-Item $TempZipPath).Length / 1KB)) KB)"
            }
        } catch {
            Write-Host "❌ Download attempt $RetryCount failed: $_" -ForegroundColor Red
            
            if ($RetryCount -lt $MaxRetries) {
                Write-Host "⏳ Waiting 5 seconds before retry..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            }
        }
    }
    
    if (-not $Downloaded) {
        throw "❌ Failed to download KMS CNG provider after $MaxRetries attempts"
    }
}

# Install MSI
Write-Host "🔧 Installing Google Cloud KMS CNG Provider..." -ForegroundColor Cyan
$LogPath = Join-Path $TempDir "kms-install.log"
$InstallArgs = @(
    "/i", "`"$MsiPath`"",
    "/qn",
    "/norestart",
    "/l*v", "`"$LogPath`""
)

Write-Host "   Command: msiexec.exe $($InstallArgs -join ' ')" -ForegroundColor Gray

$Process = Start-Process -FilePath "msiexec.exe" -ArgumentList $InstallArgs -Wait -PassThru -NoNewWindow

if ($Process.ExitCode -eq 0) {
    Write-Host "✅ Google Cloud KMS CNG Provider installed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Installation failed with exit code: $($Process.ExitCode)" -ForegroundColor Red
    
    # Show installation log if available
    if (Test-Path $LogPath) {
        Write-Host "📋 Installation log (last 20 lines):" -ForegroundColor Yellow
        Get-Content $LogPath | Select-Object -Last 20 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    }
    
    throw "MSI installation failed"
}

# Cleanup temporary files
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Cyan
@($TempZipPath, $TempExtractDir) | ForEach-Object {
    if (Test-Path $_) {
        Remove-Item -Path $_ -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "🎉 KMS CNG Provider setup completed successfully!" -ForegroundColor Green
