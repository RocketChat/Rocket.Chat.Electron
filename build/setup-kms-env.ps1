#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Set up environment variables for Google Cloud KMS code signing.

.DESCRIPTION
    This script helps set up the required environment variables for KMS signing.
    You'll need to provide your specific values for the KMS key and certificate.

.EXAMPLE
    .\setup-kms-env.ps1
#>

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Google Cloud KMS Environment Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Function to prompt for value with optional default
function Read-Value {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [bool]$Secure = $false
    )
    
    $promptText = if ($Default) { "$Prompt [$Default]" } else { $Prompt }
    
    if ($Secure) {
        $secureValue = Read-Host -Prompt $promptText -AsSecureString
        if ($secureValue.Length -eq 0 -and $Default) {
            return $Default
        }
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue))
    } else {
        $value = Read-Host -Prompt $promptText
        if ([string]::IsNullOrWhiteSpace($value) -and $Default) {
            return $Default
        }
        return $value
    }
}

Write-Host "This script will help you set up the environment variables needed for KMS signing." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel at any time." -ForegroundColor Yellow
Write-Host ""

# 1. Google Cloud Credentials
Write-Host "Step 1: Google Cloud Authentication" -ForegroundColor Cyan
Write-Host "You need a service account JSON key file with access to your KMS key." -ForegroundColor Gray
Write-Host ""

$currentCreds = $env:GOOGLE_APPLICATION_CREDENTIALS
if ($currentCreds) {
    Write-Host "Current value: $currentCreds" -ForegroundColor Gray
}

$credsPath = Read-Value -Prompt "Path to Google Cloud credentials JSON file" -Default $currentCreds

if ($credsPath) {
    if (Test-Path $credsPath) {
        $env:GOOGLE_APPLICATION_CREDENTIALS = $credsPath
        Write-Host "✓ Set GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Green
        
        # Try to read project ID from credentials
        try {
            $credContent = Get-Content $credsPath -Raw | ConvertFrom-Json
            if ($credContent.project_id) {
                Write-Host "  Project: $($credContent.project_id)" -ForegroundColor Gray
            }
        } catch {}
    } else {
        Write-Host "✗ File not found: $credsPath" -ForegroundColor Red
    }
}

Write-Host ""

# 2. KMS Key Resource
Write-Host "Step 2: KMS Key Resource" -ForegroundColor Cyan
Write-Host "Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION" -ForegroundColor Gray
Write-Host "Example: projects/my-project/locations/global/keyRings/my-ring/cryptoKeys/my-key/cryptoKeyVersions/1" -ForegroundColor Gray
Write-Host ""

$currentKey = $env:WIN_KMS_KEY_RESOURCE
if ($currentKey) {
    Write-Host "Current value: [MASKED]" -ForegroundColor Gray
}

$kmsKey = Read-Value -Prompt "KMS Key Resource" -Default $currentKey

if ($kmsKey) {
    $env:WIN_KMS_KEY_RESOURCE = $kmsKey
    Write-Host "✓ Set WIN_KMS_KEY_RESOURCE" -ForegroundColor Green
}

Write-Host ""

# 3. Certificate Thumbprint
Write-Host "Step 3: Certificate Thumbprint" -ForegroundColor Cyan
Write-Host "The SHA1 thumbprint of your code signing certificate in the Windows certificate store." -ForegroundColor Gray
Write-Host ""

# Try to list certificates in the store
Write-Host "Certificates in CurrentUser\My store:" -ForegroundColor Gray
$certs = Get-ChildItem -Path "Cert:\CurrentUser\My" -ErrorAction SilentlyContinue | 
         Where-Object { $_.Subject -match "CN=" }

if ($certs) {
    $index = 0
    $certs | ForEach-Object {
        $index++
        Write-Host "  [$index] $($_.Thumbprint): $($_.Subject)" -ForegroundColor Gray
    }
    Write-Host ""
    
    $selection = Read-Host "Select certificate by number (or enter thumbprint manually)"
    
    if ($selection -match '^\d+$' -and [int]$selection -le $certs.Count) {
        $selectedCert = $certs[[int]$selection - 1]
        $thumbprint = $selectedCert.Thumbprint
    } else {
        $thumbprint = $selection
    }
} else {
    Write-Host "  No certificates found" -ForegroundColor Yellow
    $currentThumb = $env:WIN_KMS_CERT_SHA1
    if ($currentThumb) {
        Write-Host "Current value: $currentThumb" -ForegroundColor Gray
    }
    $thumbprint = Read-Value -Prompt "Certificate SHA1 thumbprint" -Default $currentThumb
}

if ($thumbprint) {
    # Remove any spaces from thumbprint
    $thumbprint = $thumbprint -replace '\s', ''
    $env:WIN_KMS_CERT_SHA1 = $thumbprint
    Write-Host "✓ Set WIN_KMS_CERT_SHA1" -ForegroundColor Green
}

Write-Host ""

# 4. CSP Name
Write-Host "Step 4: Cryptographic Service Provider" -ForegroundColor Cyan
$currentCSP = if ($env:WIN_KMS_CSP) { $env:WIN_KMS_CSP } else { "Google Cloud KMS Provider" }
Write-Host "Current value: $currentCSP" -ForegroundColor Gray
Write-Host ""

$cspName = Read-Value -Prompt "CSP Name" -Default $currentCSP
if ($cspName) {
    $env:WIN_KMS_CSP = $cspName
    Write-Host "✓ Set WIN_KMS_CSP" -ForegroundColor Green
}

Write-Host ""

# 5. Certificate Store
Write-Host "Step 5: Certificate Store" -ForegroundColor Cyan
$currentStore = if ($env:WIN_KMS_CERT_STORE) { $env:WIN_KMS_CERT_STORE } else { "MY" }
Write-Host "Current value: $currentStore" -ForegroundColor Gray
Write-Host "Common values: MY (Personal), ROOT (Trusted Root), CA (Intermediate)" -ForegroundColor Gray
Write-Host ""

$certStore = Read-Value -Prompt "Certificate Store" -Default $currentStore
if ($certStore) {
    $env:WIN_KMS_CERT_STORE = $certStore
    Write-Host "✓ Set WIN_KMS_CERT_STORE" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Environment Setup Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Display summary
Write-Host "Current configuration:" -ForegroundColor Green
Write-Host "  GOOGLE_APPLICATION_CREDENTIALS = $env:GOOGLE_APPLICATION_CREDENTIALS"
Write-Host "  WIN_KMS_KEY_RESOURCE = [MASKED]"
Write-Host "  WIN_KMS_CERT_SHA1 = $env:WIN_KMS_CERT_SHA1"
Write-Host "  WIN_KMS_CSP = $env:WIN_KMS_CSP"
Write-Host "  WIN_KMS_CERT_STORE = $env:WIN_KMS_CERT_STORE"

Write-Host ""
Write-Host "To make these permanent, add them to your system environment variables" -ForegroundColor Yellow
Write-Host "or save this configuration to a file:" -ForegroundColor Yellow
Write-Host ""
Write-Host '  $env:GOOGLE_APPLICATION_CREDENTIALS = "' + $env:GOOGLE_APPLICATION_CREDENTIALS + '"' -ForegroundColor Gray
Write-Host '  $env:WIN_KMS_KEY_RESOURCE = "' + $env:WIN_KMS_KEY_RESOURCE + '"' -ForegroundColor Gray
Write-Host '  $env:WIN_KMS_CERT_SHA1 = "' + $env:WIN_KMS_CERT_SHA1 + '"' -ForegroundColor Gray
Write-Host '  $env:WIN_KMS_CSP = "' + $env:WIN_KMS_CSP + '"' -ForegroundColor Gray
Write-Host '  $env:WIN_KMS_CERT_STORE = "' + $env:WIN_KMS_CERT_STORE + '"' -ForegroundColor Gray

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run .\debug-kms-signing.ps1 to test the configuration" -ForegroundColor Yellow
Write-Host "  2. If signing works, run: yarn electron-builder --win" -ForegroundColor Yellow