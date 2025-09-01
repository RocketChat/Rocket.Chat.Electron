#!/bin/bash

# Setup script for Linux-based Windows code signing with Google Cloud KMS
# This installs osslsigncode and Google Cloud KMS PKCS#11 library

set -e

echo "========================================="
echo "Setting up Linux environment for Windows code signing"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Running as root - this is OK for CI environments"
else
   echo "ℹ️  Running as regular user - you may need to enter sudo password"
fi

# Install required packages
echo "📦 Installing required packages..."
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y \
        osslsigncode \
        libengine-pkcs11-openssl \
        opensc \
        wget \
        tar
elif command -v yum &> /dev/null; then
    # RHEL/CentOS
    sudo yum install -y \
        osslsigncode \
        opensc \
        wget \
        tar
else
    echo "❌ Unsupported Linux distribution"
    echo "Please manually install: osslsigncode, opensc, libengine-pkcs11-openssl"
    exit 1
fi

# Download and install Google Cloud KMS PKCS#11 library
LIBKMSP11_VERSION="1.7"
LIBKMSP11_URL="https://github.com/GoogleCloudPlatform/kms-integrations/releases/download/pkcs11-v${LIBKMSP11_VERSION}/libkmsp11-${LIBKMSP11_VERSION}-linux-amd64.tar.gz"
INSTALL_DIR="/opt/libkmsp11"

echo ""
echo "📥 Downloading Google Cloud KMS PKCS#11 library v${LIBKMSP11_VERSION}..."
wget -q -O /tmp/libkmsp11.tar.gz "$LIBKMSP11_URL"

echo "📂 Installing to ${INSTALL_DIR}..."
sudo mkdir -p "$INSTALL_DIR"
sudo tar -xzf /tmp/libkmsp11.tar.gz -C "$INSTALL_DIR" --strip-components=1
sudo chmod 755 "$INSTALL_DIR/libkmsp11.so"

# Clean up
rm /tmp/libkmsp11.tar.gz

# Verify installation
echo ""
echo "✅ Verifying installations..."

if command -v osslsigncode &> /dev/null; then
    echo "  ✓ osslsigncode version: $(osslsigncode -v 2>&1 | head -1)"
else
    echo "  ✗ osslsigncode not found"
    exit 1
fi

if [ -f "$INSTALL_DIR/libkmsp11.so" ]; then
    echo "  ✓ libkmsp11.so installed at: $INSTALL_DIR/libkmsp11.so"
else
    echo "  ✗ libkmsp11.so not found"
    exit 1
fi

# Check for PKCS#11 engine
PKCS11_ENGINE="/usr/lib/x86_64-linux-gnu/engines-1.1/pkcs11.so"
if [ -f "$PKCS11_ENGINE" ]; then
    echo "  ✓ PKCS#11 engine found at: $PKCS11_ENGINE"
else
    # Try alternative location
    PKCS11_ENGINE="/usr/lib/x86_64-linux-gnu/engines-3/pkcs11.so"
    if [ -f "$PKCS11_ENGINE" ]; then
        echo "  ✓ PKCS#11 engine found at: $PKCS11_ENGINE"
    else
        echo "  ⚠️  PKCS#11 engine not found at expected locations"
        echo "     You may need to install libengine-pkcs11-openssl"
    fi
fi

echo ""
echo "📋 Required environment variables for signing:"
echo ""
echo "export PKCS11_MODULE_PATH=\"$INSTALL_DIR/libkmsp11.so\""
echo "export WIN_KMS_KEY_RESOURCE=\"projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION\""
echo "export WIN_CERT_FILE=\"/path/to/certificate.crt\""
echo "export GOOGLE_APPLICATION_CREDENTIALS=\"/path/to/gcp-credentials.json\""
echo "export KMS_PKCS11_CONFIG=\"/path/to/kms_pkcs11_config.yaml\""
echo ""
echo "🎉 Setup complete!"
echo ""
echo "To test the setup, create a test executable and run:"
echo "  osslsigncode sign -pkcs11engine $PKCS11_ENGINE -pkcs11module $INSTALL_DIR/libkmsp11.so \\"
echo "    -key \"pkcs11:object=YOUR_KEY_NAME\" -certs /path/to/cert.crt \\"
echo "    -t http://timestamp.digicert.com -h sha256 \\"
echo "    -in test.exe -out test-signed.exe"