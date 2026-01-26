#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo -e "${BLUE}=== Rocket.Chat Linux .deb Testing Script ===${NC}\n"

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}Error: This script is designed for Linux only${NC}"
    exit 1
fi

# Check if we need sudo for install operations
# dpkg operations always require root, so use sudo unless we're already root
NEED_SUDO=false
if [ "$EUID" -ne 0 ]; then
    NEED_SUDO=true
fi

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

# Parse command line arguments
SKIP_BUILD=false
SKIP_INSTALL=false
SKIP_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --skip-run)
            SKIP_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build    Skip building the .deb package"
            echo "  --skip-install  Skip installing the .deb package"
            echo "  --skip-run      Skip running the installed app"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Step 1: Build the .deb package
if [ "$SKIP_BUILD" = false ]; then
    info "Building Linux .deb package..."
    
    # Ensure Volta is installed (provides node.js)
    if ! command -v node &> /dev/null && ! command -v yarn &> /dev/null; then
        info "Checking for Volta (JavaScript toolchain manager)..."
        if [ -f "$SCRIPT_DIR/install-volta.sh" ]; then
            # Source the install script to get its functions, or run it
            bash "$SCRIPT_DIR/install-volta.sh" --non-interactive || {
                warning "Volta installation skipped or failed"
                warning "You may need node.js/yarn installed manually"
            }
            # Ensure Volta is in PATH
            if [ -d "$HOME/.volta/bin" ]; then
                export PATH="$HOME/.volta/bin:$PATH"
            fi
        fi
    fi
    
    # Check for required build dependencies and install if missing
    MISSING_DEPS=()
    if ! command -v ar &> /dev/null; then
        MISSING_DEPS+=("binutils")
    fi
    
    if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
        warning "Missing required build dependencies: ${MISSING_DEPS[*]}"
        info "Attempting to install missing dependencies..."
        
        if [ "$NEED_SUDO" = true ]; then
            if ! sudo apt-get update || ! sudo apt-get install -y "${MISSING_DEPS[@]}"; then
                error "Failed to install dependencies: ${MISSING_DEPS[*]}"
                error "Please install them manually with: sudo apt-get install ${MISSING_DEPS[*]}"
                exit 1
            fi
        else
            if ! apt-get update || ! apt-get install -y "${MISSING_DEPS[@]}"; then
                error "Failed to install dependencies: ${MISSING_DEPS[*]}"
                error "Please install them manually with: sudo apt-get install ${MISSING_DEPS[*]}"
                exit 1
            fi
        fi
        
        success "Dependencies installed successfully!"
    fi
    
    # Find yarn command
    YARN_CMD=""
    if command -v yarn &> /dev/null; then
        YARN_CMD="yarn"
    elif [ -f "$PROJECT_DIR/.yarn/releases/yarn-4.6.0.cjs" ]; then
        # Use local yarn binary if available
        if command -v node &> /dev/null; then
            YARN_CMD="node $PROJECT_DIR/.yarn/releases/yarn-4.6.0.cjs"
        else
            error "Neither 'yarn' nor 'node' is available. Please install yarn or node."
            exit 1
        fi
    else
        error "yarn is not installed and local yarn binary not found."
        error "Please install yarn or ensure .yarn/releases/yarn-*.cjs exists."
        exit 1
    fi
    
    info "Using yarn: $YARN_CMD"
    
    # Build only .deb package to avoid issues with other Linux targets
    info "Building .deb package only..."
    if ! $YARN_CMD build; then
        error "Build failed!"
        exit 1
    fi
    if ! $YARN_CMD electron-builder --publish never --linux deb; then
        error "Build failed!"
        exit 1
    fi
    
    success "Build completed!"
else
    info "Skipping build (--skip-build flag set)"
fi

# Step 2: Find the .deb file
info "Looking for .deb package in dist/ directory..."

DEB_FILE=$(find dist -name "rocketchat-*-linux-*.deb" -type f | head -n 1)

if [ -z "$DEB_FILE" ]; then
    error "No .deb file found in dist/ directory"
    error "Expected pattern: dist/rocketchat-*-linux-*.deb"
    exit 1
fi

success "Found .deb package: $DEB_FILE"

# Step 3: Install the .deb package
if [ "$SKIP_INSTALL" = false ]; then
    info "Installing .deb package..."
    
    # Check if Rocket.Chat is already installed
    if dpkg -l | grep -q "rocketchat-desktop"; then
        warning "Rocket.Chat is already installed. Uninstalling previous version..."
        
        if [ "$NEED_SUDO" = true ]; then
            sudo dpkg -r rocketchat-desktop 2>/dev/null || true
            sudo apt-get purge -y rocketchat-desktop 2>/dev/null || true
        else
            dpkg -r rocketchat-desktop 2>/dev/null || true
            apt-get purge -y rocketchat-desktop 2>/dev/null || true
        fi
    fi
    
    # Install the new package
    if [ "$NEED_SUDO" = true ]; then
        set +e
        sudo dpkg -i "$DEB_FILE"
        dpkg_rc=$?
        set -e
        if [ $dpkg_rc -ne 0 ]; then
            warning "Installation had dependency issues, attempting to fix..."
            sudo apt-get install -f -y
        fi
    else
        set +e
        dpkg -i "$DEB_FILE"
        dpkg_rc=$?
        set -e
        if [ $dpkg_rc -ne 0 ]; then
            warning "Installation had dependency issues, attempting to fix..."
            apt-get install -f -y
        fi
    fi
    
    success "Package installed successfully!"
else
    info "Skipping install (--skip-install flag set)"
fi

# Step 4: Run the installed app
if [ "$SKIP_RUN" = false ]; then
    info "Launching Rocket.Chat..."
    
    # Kill any existing Rocket.Chat instances to ensure clean start
    EXISTING_PIDS=$(pgrep -f "rocketchat-desktop" 2>/dev/null || true)
    if [ -n "$EXISTING_PIDS" ]; then
        warning "Found existing Rocket.Chat processes, stopping them..."
        echo "$EXISTING_PIDS" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # Clear saved window state to ensure window appears
    # The app might have saved a "hidden" state
    ROCKET_CONFIG_DIR="$HOME/.config/Rocket.Chat"
    if [ -f "$ROCKET_CONFIG_DIR/rootWindowState.json" ]; then
        info "Clearing saved window state to ensure window appears..."
        rm -f "$ROCKET_CONFIG_DIR/rootWindowState.json"
    fi
    
    # Standard Electron app install path
    APP_PATH="/opt/Rocket.Chat/rocketchat-desktop"
    
    if [ ! -f "$APP_PATH" ]; then
        error "App not found at expected path: $APP_PATH"
        error "Trying alternative: rocketchat-desktop command"
        
        if command -v rocketchat-desktop &> /dev/null; then
            APP_PATH="rocketchat-desktop"
        else
            error "Could not find installed Rocket.Chat executable"
            exit 1
        fi
    fi
    
    success "Starting Rocket.Chat from: $APP_PATH"
    
    # Ensure DISPLAY is set for GUI apps
    if [ -z "$DISPLAY" ]; then
        export DISPLAY=:0
        info "Setting DISPLAY=$DISPLAY"
    fi
    
    # Launch the app directly (app handles X11 enforcement internally)
    nohup "$APP_PATH" > /tmp/rocketchat-desktop.log 2>&1 &
    
    # Get the PID
    sleep 1
    APP_PID=$(pgrep -f "rocketchat-desktop" | head -1)
    
    if [ -z "$APP_PID" ]; then
        error "Failed to start Rocket.Chat"
        if [ -f /tmp/rocketchat-desktop.log ]; then
            error "Last 10 lines of log:"
            tail -10 /tmp/rocketchat-desktop.log | sed 's/^/  /'
        fi
        exit 1
    fi
    
    # Wait for window to appear
    info "Waiting for window to appear..."
    sleep 5
    
    # Give the app a moment to start and show the window
    sleep 3
    
    # Check if the process is still running
    if ! kill -0 "$APP_PID" 2>/dev/null; then
        warning "App process exited quickly. Check logs: /tmp/rocketchat-desktop.log"
        if [ -f /tmp/rocketchat-desktop.log ]; then
            error "Last 10 lines of log:"
            tail -10 /tmp/rocketchat-desktop.log | sed 's/^/  /'
        fi
        warning "Testing completed with warnings - app exited early"
    else
        echo ""
        success "Rocket.Chat started! (PID: $APP_PID)"
        info "The app window should be visible now."
        info "Logs are available at: /tmp/rocketchat-desktop.log"
        info "To stop it, run: kill $APP_PID"
        echo ""
        success "All steps completed successfully!"
    fi
else
    info "Skipping run (--skip-run flag set)"
    success "All steps completed successfully!"
fi

