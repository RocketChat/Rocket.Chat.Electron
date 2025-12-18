#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Volta is already installed
check_volta_installed() {
    if command -v volta &> /dev/null; then
        return 0
    fi
    
    # Also check if VOLTA_HOME is set and points to a valid installation
    if [ -n "$VOLTA_HOME" ] && [ -f "$VOLTA_HOME/bin/volta" ]; then
        return 0
    fi
    
    # Check common installation location
    if [ -f "$HOME/.volta/bin/volta" ]; then
        return 0
    fi
    
    return 1
}

# Install Volta
install_volta() {
    info "Installing Volta..."
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        error "curl is required to install Volta"
        error "Please install curl first: sudo apt-get install curl"
        return 1
    fi
    
    # Install Volta using the official installer
    curl https://get.volta.sh | bash
    
    if [ $? -ne 0 ]; then
        error "Failed to install Volta"
        return 1
    fi
    
    # Source Volta in current shell
    export VOLTA_HOME="$HOME/.volta"
    export PATH="$VOLTA_HOME/bin:$PATH"
    
    # Verify installation
    if command -v volta &> /dev/null; then
        success "Volta installed successfully!"
        volta --version
        return 0
    else
        error "Volta installation completed but 'volta' command not found"
        error "You may need to restart your shell or run: source ~/.bashrc"
        return 1
    fi
}

# Main function
main() {
    # Check if running in non-interactive mode
    NON_INTERACTIVE=false
    if [ "$1" = "--non-interactive" ] || [ -n "$CI" ]; then
        NON_INTERACTIVE=true
    fi
    
    # Check if Volta is already installed
    if check_volta_installed; then
        VOLTA_VERSION=$(volta --version 2>/dev/null || echo "installed")
        success "Volta is already installed ($VOLTA_VERSION)"
        
        # Ensure Volta is in PATH
        if [ -d "$HOME/.volta/bin" ] && [[ "$PATH" != *".volta"* ]]; then
            export VOLTA_HOME="$HOME/.volta"
            export PATH="$VOLTA_HOME/bin:$PATH"
            info "Added Volta to PATH"
        fi
        
        return 0
    fi
    
    # Volta not installed, ask user or install automatically
    if [ "$NON_INTERACTIVE" = false ]; then
        echo ""
        warning "Volta is not installed."
        echo "Volta is a JavaScript toolchain manager that provides node.js and npm."
        echo ""
        read -p "Do you want to install Volta now? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Skipping Volta installation"
            return 1
        fi
    else
        info "Volta not found, installing automatically..."
    fi
    
    # Install Volta
    if install_volta; then
        # Ensure it's in PATH for subsequent commands
        export VOLTA_HOME="$HOME/.volta"
        export PATH="$VOLTA_HOME/bin:$PATH"
        
        # Add to shell profile if not already there
        if [ -f "$HOME/.bashrc" ] && ! grep -q "VOLTA_HOME" "$HOME/.bashrc"; then
            info "Adding Volta to ~/.bashrc for future sessions..."
            echo '' >> "$HOME/.bashrc"
            echo '# Volta' >> "$HOME/.bashrc"
            echo 'export VOLTA_HOME="$HOME/.volta"' >> "$HOME/.bashrc"
            echo 'export PATH="$VOLTA_HOME/bin:$PATH"' >> "$HOME/.bashrc"
        fi
        
        return 0
    else
        return 1
    fi
}

# If script is executed directly (not sourced), run main
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
    exit $?
fi

# If sourced, export functions for use in other scripts
export -f check_volta_installed
export -f install_volta

