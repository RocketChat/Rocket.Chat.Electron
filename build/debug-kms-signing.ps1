#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Debug script for testing Google Cloud KMS code signing configuration on Windows.

.DESCRIPTION
    This script helps diagnose issues with KMS-based code signing by testing the
    certificate installation, KMS provider setup, and signing configuration.

.PARAMETER TestFile
    Path to a file to test signing (optional, will use notepad.exe by default)

.EXAMPLE
    .\debug-kms-signing.ps1
    
.EXAMPLE
    .\debug-kms-signing.ps1 -TestFile "C:\path\to\test.exe"
#>

param(
    [string]$TestFile = ""
)

# Color output functions
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Debug { Write-Host $args -ForegroundColor Gray }

Write-Info "========================================="
Write-Info "Google Cloud KMS Signing Debug Script"
Write-Info "========================================="
Write-Host ""

# Check if running as administrator (might be needed for some operations)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if ($isAdmin) {
    Write-Success "✓ Running as Administrator"
} else {
    Write-Warning "⚠ Not running as Administrator (some operations might fail)"
}

Write-Host ""
Write-Info "=== Step 1: Check Google Cloud KMS Provider Installation ==="
try {
    $cspList = @(certutil -csplist 2>&1 | Select-String "Provider Name")
    $kmsProvider = $cspList | Where-Object { $_ -match "Google Cloud KMS Provider" }
    
    if ($kmsProvider) {
        Write-Success "✓ Google Cloud KMS Provider is installed"
        Write-Debug "  $kmsProvider"
    } else {
        Write-Error "✗ Google Cloud KMS Provider NOT found"
        Write-Warning "Available CSPs:"
        $cspList | ForEach-Object { Write-Debug "  $_" }
        Write-Host ""
        Write-Warning "To install the KMS provider, run:"
        Write-Host "  .\install-kms-cng-provider.ps1" -ForegroundColor Yellow
    }
} catch {
    Write-Error "✗ Failed to check CSP list: $_"
}

Write-Host ""
Write-Info "=== Step 2: Check Google Cloud Authentication ==="
$gcpCredsFile = $env:GOOGLE_APPLICATION_CREDENTIALS
if ($gcpCredsFile) {
    Write-Success "✓ GOOGLE_APPLICATION_CREDENTIALS is set"
    Write-Debug "  Path: $gcpCredsFile"
    
    if (Test-Path $gcpCredsFile) {
        Write-Success "✓ Credentials file exists"
        
        # Try to read and validate JSON structure
        try {
            $credContent = Get-Content $gcpCredsFile -Raw | ConvertFrom-Json
            if ($credContent.type -and $credContent.project_id) {
                Write-Success "✓ Credentials file appears valid"
                Write-Debug "  Type: $($credContent.type)"
                Write-Debug "  Project: $($credContent.project_id)"
            }
        } catch {
            Write-Warning "⚠ Could not parse credentials file as JSON"
        }
    } else {
        Write-Error "✗ Credentials file does not exist at: $gcpCredsFile"
    }
} else {
    Write-Error "✗ GOOGLE_APPLICATION_CREDENTIALS not set"
    Write-Warning "Set it with:"
    Write-Host '  $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\credentials.json"' -ForegroundColor Yellow
}

Write-Host ""
Write-Info "=== Step 3: Check Environment Variables ==="
$kmsVars = @{
    "WIN_KMS_KEY_RESOURCE" = $env:WIN_KMS_KEY_RESOURCE
    "WIN_KMS_CERT_SHA1" = $env:WIN_KMS_CERT_SHA1
    "WIN_KMS_CSP" = $env:WIN_KMS_CSP
    "WIN_KMS_CERT_STORE" = $env:WIN_KMS_CERT_STORE
}

$allVarsSet = $true
foreach ($var in $kmsVars.GetEnumerator()) {
    if ($var.Value) {
        Write-Success "✓ $($var.Key) is set"
        if ($var.Key -eq "WIN_KMS_KEY_RESOURCE") {
            Write-Debug "  Value: [MASKED]"
        } else {
            Write-Debug "  Value: $($var.Value)"
        }
    } else {
        Write-Error "✗ $($var.Key) is not set"
        $allVarsSet = $false
    }
}

if (-not $allVarsSet) {
    Write-Host ""
    Write-Warning "Example values to set:"
    Write-Host '  $env:WIN_KMS_KEY_RESOURCE = "projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/1"' -ForegroundColor Yellow
    Write-Host '  $env:WIN_KMS_CERT_SHA1 = "CERTIFICATE_THUMBPRINT"' -ForegroundColor Yellow
    Write-Host '  $env:WIN_KMS_CSP = "Google Cloud KMS Provider"' -ForegroundColor Yellow
    Write-Host '  $env:WIN_KMS_CERT_STORE = "MY"' -ForegroundColor Yellow
}

Write-Host ""
Write-Info "=== Step 4: Check Certificate in Store ==="
if ($env:WIN_KMS_CERT_SHA1) {
    $certStore = if ($env:WIN_KMS_CERT_STORE) { $env:WIN_KMS_CERT_STORE } else { "MY" }
    $storePath = "Cert:\CurrentUser\$certStore"
    
    Write-Debug "Searching in store: $storePath"
    $cert = Get-ChildItem -Path $storePath -ErrorAction SilentlyContinue | 
            Where-Object { $_.Thumbprint -eq $env:WIN_KMS_CERT_SHA1 }
    
    if ($cert) {
        Write-Success "✓ Certificate found in store"
        Write-Debug "  Subject: $($cert.Subject)"
        Write-Debug "  Issuer: $($cert.Issuer)"
        Write-Debug "  NotBefore: $($cert.NotBefore)"
        Write-Debug "  NotAfter: $($cert.NotAfter)"
        Write-Debug "  Thumbprint: $($cert.Thumbprint)"
        
        if ($cert.HasPrivateKey) {
            Write-Success "✓ Certificate reports having a private key"
        } else {
            Write-Warning "⚠ Certificate does NOT report having a private key"
            Write-Warning "  This is expected for KMS-based certificates where the private key is in the cloud"
        }
        
        # Get more details about the certificate
        Write-Host ""
        Write-Info "Certificate Details from certutil:"
        $certDetails = certutil -user -store $certStore $env:WIN_KMS_CERT_SHA1 2>&1
        $keyProviderInfo = $certDetails | Select-String "Provider|Container|Key Spec"
        if ($keyProviderInfo) {
            $keyProviderInfo | ForEach-Object { Write-Debug "  $_" }
        } else {
            Write-Warning "  No key provider information found"
        }
        
    } else {
        Write-Error "✗ Certificate not found in $storePath"
        Write-Warning "Available certificates in store:"
        Get-ChildItem -Path $storePath -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Debug "  $($_.Thumbprint): $($_.Subject)"
        }
    }
} else {
    Write-Warning "⚠ WIN_KMS_CERT_SHA1 not set, skipping certificate check"
}

Write-Host ""
Write-Info "=== Step 5: Find signtool.exe ==="
$signtoolCmd = Get-Command signtool -ErrorAction SilentlyContinue
if ($signtoolCmd) {
    Write-Success "✓ signtool found in PATH"
    Write-Debug "  Path: $($signtoolCmd.Source)"
    $signtoolPath = $signtoolCmd.Source
} else {
    Write-Warning "⚠ signtool not in PATH, searching Windows SDK..."
    
    $sdkPath = "${env:ProgramFiles(x86)}\Windows Kits\10\bin"
    if (Test-Path $sdkPath) {
        $signtoolExe = Get-ChildItem -Path $sdkPath -Include "signtool.exe" -Recurse -ErrorAction SilentlyContinue |
                       Sort-Object { $_.Directory.Name } -Descending |
                       Select-Object -First 1
        
        if ($signtoolExe) {
            Write-Success "✓ Found signtool in Windows SDK"
            Write-Debug "  Path: $($signtoolExe.FullName)"
            $signtoolPath = $signtoolExe.FullName
        } else {
            Write-Error "✗ signtool.exe not found in Windows SDK"
            $signtoolPath = $null
        }
    } else {
        Write-Error "✗ Windows SDK not found"
        $signtoolPath = $null
    }
}

Write-Host ""
Write-Info "=== Step 6: Test Signing ==="
if ($signtoolPath -and $env:WIN_KMS_KEY_RESOURCE -and $env:WIN_KMS_CERT_SHA1) {
    # Prepare test file
    if (-not $TestFile) {
        $TestFile = "$env:TEMP\kms-test-sign.exe"
        Write-Info "Creating test file..."
        Copy-Item "$env:WINDIR\System32\notepad.exe" -Destination $TestFile -Force
        Write-Debug "  Test file: $TestFile"
    } elseif (-not (Test-Path $TestFile)) {
        Write-Error "✗ Test file not found: $TestFile"
        $TestFile = $null
    }
    
    if ($TestFile) {
        Write-Info "Attempting to sign test file..."
        
        $signArgs = @(
            "sign",
            "/fd", "SHA256",
            "/tr", "http://timestamp.digicert.com",
            "/td", "SHA256",
            "/csp", ($env:WIN_KMS_CSP ?? "Google Cloud KMS Provider"),
            "/kc", $env:WIN_KMS_KEY_RESOURCE,
            "/sha1", $env:WIN_KMS_CERT_SHA1,
            "/s", ($env:WIN_KMS_CERT_STORE ?? "MY"),
            "/v",      # Verbose
            "/debug",  # Debug output
            $TestFile
        )
        
        Write-Debug "Command: $signtoolPath $($signArgs -join ' ')"
        Write-Host ""
        
        # Execute signing
        $result = & $signtoolPath @signArgs 2>&1
        $exitCode = $LASTEXITCODE
        
        # Display output
        $result | ForEach-Object { 
            if ($_ -match "Error|error|ERROR") {
                Write-Error "  $_"
            } elseif ($_ -match "Warning|warning") {
                Write-Warning "  $_"
            } else {
                Write-Debug "  $_"
            }
        }
        
        Write-Host ""
        if ($exitCode -eq 0) {
            Write-Success "✓✓✓ SIGNING SUCCESSFUL! ✓✓✓"
            Write-Success "The configuration is working correctly."
            
            # Verify signature
            Write-Host ""
            Write-Info "Verifying signature..."
            & $signtoolPath verify /pa /v $TestFile 2>&1 | Select-Object -First 10 | ForEach-Object { Write-Debug "  $_" }
        } else {
            Write-Error "✗✗✗ SIGNING FAILED with exit code: $exitCode ✗✗✗"
            Write-Host ""
            Write-Warning "Common issues and solutions:"
            Write-Warning "1. 'No private key is available'"
            Write-Host "   - The certificate was not created with KMS association" -ForegroundColor Gray
            Write-Host "   - The KMS key resource doesn't match the certificate" -ForegroundColor Gray
            Write-Host "   - The Google Cloud credentials don't have access to the KMS key" -ForegroundColor Gray
            Write-Warning "2. 'The specified provider name is invalid'"
            Write-Host "   - The Google Cloud KMS Provider is not installed" -ForegroundColor Gray
            Write-Host "   - The provider name is misspelled in WIN_KMS_CSP" -ForegroundColor Gray
            Write-Warning "3. 'Certificate not found'"
            Write-Host "   - The certificate thumbprint is incorrect" -ForegroundColor Gray
            Write-Host "   - The certificate is in a different store" -ForegroundColor Gray
        }
        
        # Clean up test file if we created it
        if ($TestFile -eq "$env:TEMP\kms-test-sign.exe") {
            Remove-Item $TestFile -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Warning "⚠ Skipping test signing due to missing prerequisites"
    if (-not $signtoolPath) { Write-Error "  - signtool.exe not found" }
    if (-not $env:WIN_KMS_KEY_RESOURCE) { Write-Error "  - WIN_KMS_KEY_RESOURCE not set" }
    if (-not $env:WIN_KMS_CERT_SHA1) { Write-Error "  - WIN_KMS_CERT_SHA1 not set" }
}

Write-Host ""
Write-Info "========================================="
Write-Info "Debug script complete"
Write-Info "========================================="

# Summary
Write-Host ""
Write-Info "Summary:"
$issues = 0

if (-not $kmsProvider) { 
    Write-Error "✗ KMS Provider not installed"
    $issues++
}
if (-not $gcpCredsFile -or -not (Test-Path $gcpCredsFile -ErrorAction SilentlyContinue)) {
    Write-Error "✗ Google Cloud credentials not configured"
    $issues++
}
if (-not $allVarsSet) {
    Write-Error "✗ Required environment variables not set"
    $issues++
}
if ($env:WIN_KMS_CERT_SHA1 -and -not $cert) {
    Write-Error "✗ Certificate not found in store"
    $issues++
}
if ($exitCode -ne 0) {
    Write-Error "✗ Test signing failed"
    $issues++
}

if ($issues -eq 0) {
    Write-Success "✓ All checks passed - KMS signing is properly configured!"
} else {
    Write-Warning "Found $issues issue(s) that need to be resolved"
}