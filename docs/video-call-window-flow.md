# Video Call Window Flow Documentation

## Overview

The Rocket.Chat Electron app includes a sophisticated video call window system that creates a separate browser window for video conferencing. This document outlines the complete flow from initiation to cleanup.

## Architecture Components

### Main Process Components
- **IPC Handler** (`src/videoCallWindow/ipc.ts`) - Manages window creation and IPC communication
- **Window Management** - Handles BrowserWindow lifecycle and configuration
- **Desktop Capturer** - Provides screen sharing capabilities with caching

### Renderer Process Components
- **Bootstrap Script** (`src/videoCallWindow/video-call-window.tsx`) - Initializes the React app
- **VideoCallWindow Component** (`src/videoCallWindow/videoCallWindow.tsx`) - Main React component
- **ScreenSharePicker** (`src/videoCallWindow/screenSharePicker.tsx`) - Screen sharing interface

### Webview Process
- **Preload Script** (`src/videoCallWindow/preload/index.ts`) - Exposes APIs to webview content
- **Jitsi Bridge** - Handles video call platform integration

## Complete Flow Diagram

```mermaid
flowchart TD
    %% Main Process Entry Point
    A[User Initiates Video Call] --> B[Main Process: video-call-window/open-window IPC]
    
    %% URL Validation
    B --> C{URL Valid?}
    C -->|Invalid| C1[Reject Request]
    C -->|Google URL| C2[Open External Browser]
    C -->|Valid| D[Check Existing Window]
    
    %% Window Management
    D --> E{Window Exists?}
    E -->|Yes| F[Close Existing Window]
    E -->|No| G[Create New BrowserWindow]
    F --> F1[Wait for Destruction] 
    F1 --> G
    
    %% Window Creation
    G --> H[Configure Window Properties]
    H --> I[Set Permissions & Handlers]
    I --> J[Load video-call-window.html]
    
    %% Renderer Process Initialization
    J --> K[DOM Ready Event]
    K --> L[Execute JavaScript Test]
    L --> M[video-call-window.tsx Starts]
    
    %% React App Bootstrap
    M --> N[Setup i18n]
    N --> O[Create React Root]
    O --> P[Render VideoCallWindow Component]
    
    %% IPC Handshake
    P --> Q[IPC Handshake Test]
    Q --> R{Handshake Success?}
    R -->|No| R1[Retry with Delay]
    R1 --> Q
    R -->|Yes| S[Signal Renderer Ready]
    
    %% URL Processing
    S --> T{Pending URL Available?}
    T -->|No| T1[Return Not Ready]
    T1 --> S
    T -->|Yes| U[Send URL to Renderer]
    
    %% Webview Creation
    U --> V[Component Receives URL]
    V --> W[Create Webview Element]
    W --> X[Setup Webview Event Handlers]
    
    %% Webview Loading States
    X --> Y[did-start-loading]
    Y --> Z[Set Loading State]
    Z --> AA[Start Loading Timeout]
    
    %% Success Path
    AA --> BB[did-finish-load]
    BB --> CC[Clear Loading State]
    CC --> DD[Video Call Active]
    
    %% Error Handling
    AA --> EE[did-fail-load]
    EE --> FF[Show Error State]
    FF --> GG{Auto Recovery?}
    GG -->|Attempt 1| HH[Webview Reload]
    GG -->|Attempt 2| II[URL Refresh]
    GG -->|Attempt 3| JJ[Full Reinitialize]
    GG -->|Max Attempts| KK[Show Manual Reload Button]
    
    %% Screen Sharing Flow
    DD --> LL[User Requests Screen Share]
    LL --> MM[Webview Calls requestScreenSharing]
    MM --> NN[Preload Script IPC Call]
    NN --> OO[Main Process Opens Screen Picker]
    OO --> PP[ScreenSharePicker Component]
    PP --> QQ[Fetch Available Sources]
    QQ --> RR[User Selects Source]
    RR --> SS[Validate Source]
    SS --> TT[Return Source ID]
    TT --> UU[Webview Gets Stream Access]
    
    %% Window Lifecycle
    DD --> VV[Window Events]
    VV --> WW[Move/Resize/Focus Events]
    WW --> XX[Update Redux State]
    
    %% Cleanup
    DD --> YY[User Closes Window]
    YY --> ZZ[Cleanup Resources]
    ZZ --> AAA[Clear Desktop Capturer Cache]
    AAA --> BBB[Remove Event Listeners]
    BBB --> CCC[Window Destroyed]
    
    %% Recovery Flows
    HH --> Y
    II --> W
    JJ --> M
    
    %% Manual Recovery
    KK --> CCC1[User Clicks Reload]
    CCC1 --> Y
    
    %% Styling
    classDef mainProcess fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef renderer fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef webview fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef success fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    
    class A,B,C,D,E,F,G,H,I,J,OO,ZZ,AAA,BBB mainProcess
    class K,L,M,N,O,P,Q,S,V,PP,XX renderer
    class W,X,Y,Z,AA,BB,CC,DD,LL,MM,NN,UU webview
    class EE,FF,GG,HH,II,JJ,KK error
    class CC,DD,TT success
```

## Detailed Flow Breakdown

### 1. Initiation Phase
- User triggers video call from main Rocket.Chat window
- Main process receives `video-call-window/open-window` IPC call with URL
- URL validation ensures only HTTP/HTTPS protocols are allowed
- Google URLs are redirected to external browser to prevent conflicts

### 2. Window Management
- Checks if existing video call window exists
- If exists, properly closes and waits for destruction to complete
- Creates new BrowserWindow with optimized settings for video calls
- Configures security settings and permission handlers

### 3. Renderer Initialization
- Loads `video-call-window.html` template
- Executes JavaScript initialization test
- Sets up i18n for localization
- Creates React root and renders main component

### 4. IPC Handshake
- Performs handshake test to ensure IPC communication works
- Retries with exponential backoff if handshake fails
- Signals renderer ready state to main process
- Main process sends pending URL when ready

### 5. Webview Creation
- Creates webview element with video call URL
- Sets up comprehensive event handlers for loading states
- Configures preload script for API exposure
- Implements loading timeout with auto-recovery

### 6. Error Handling & Recovery
The system includes a sophisticated multi-tier recovery system:

#### Automatic Recovery Strategies
1. **Webview Reload** (1s delay) - Simple webview refresh
2. **URL Refresh** (2s delay) - Clears webview and reloads URL
3. **Full Reinitialize** (3s delay) - Reloads entire window

#### Fallback Mechanisms
- Loading timeout (15 seconds) triggers auto-recovery
- Maximum 3 automatic recovery attempts
- Manual reload button if auto-recovery fails
- Silent auto-recovery attempts with increasing delays

### 7. Screen Sharing Integration
- Webview content requests screen sharing via exposed API
- Preload script handles IPC communication
- Main process opens ScreenSharePicker component
- User selects from available windows/screens
- Desktop capturer validates source availability
- Source ID returned to webview for stream access

### 8. Performance Optimizations
- **Desktop Capturer Caching** - 3-second TTL for source lists
- **Source Validation Caching** - 30-second TTL for source validity
- **Lazy Cache Cleanup** - 60-second delay after window close
- **Background Throttling** - Enabled for better performance
- **V8 Cache Optimization** - Bypass heat check for faster startup

### 9. Window Lifecycle Management
- State persistence for window position/size
- Event handlers for focus, resize, move events
- Redux state updates for UI synchronization
- Proper cleanup of resources on window close

## Key Features

### Robust Error Handling
- Multiple recovery strategies for different failure modes
- Comprehensive logging for debugging
- Graceful degradation when resources unavailable

### Security Measures
- URL validation and protocol restrictions
- Permission request handling for media access
- Context isolation for webview content
- SMB protocol blocking for security

### Low-Spec Machine Support
- Optimized for performance on limited hardware
- Background throttling and memory management
- Efficient caching strategies
- Fallback recovery mechanisms

## File Structure

```
src/videoCallWindow/
├── ipc.ts                    # Main process IPC handlers
├── video-call-window.tsx     # Renderer bootstrap script
├── videoCallWindow.tsx       # Main React component
├── screenSharePicker.tsx     # Screen sharing UI
└── preload/
    ├── index.ts             # Webview preload script
    └── jitsiBridge.ts       # Video platform integration
```

## How to Display on GitHub

This diagram will be automatically rendered on GitHub when viewing this markdown file. GitHub natively supports Mermaid diagrams in markdown files using the ```mermaid code block syntax.

### Best Practices for GitHub Visibility:

1. **Place in docs/ folder** - This ensures the documentation is easily discoverable
2. **Link from README.md** - Add a reference to this flow documentation
3. **Use descriptive filename** - `video-call-window-flow.md` clearly indicates the content
4. **Include in PR descriptions** - Reference this diagram when making video call related changes

### Alternative Display Options:

1. **GitHub Issues/PRs** - Copy the mermaid code block directly
2. **GitHub Wiki** - Create a dedicated wiki page for architecture docs
3. **README sections** - Include simplified version in main README
4. **GitHub Pages** - Host as part of project documentation site

## Troubleshooting

### Common Issues
- **IPC Handshake Failures** - Usually resolved by retry mechanism
- **Webview Loading Timeouts** - Auto-recovery handles most cases
- **Screen Sharing Permission Denied** - System-level permissions required
- **Window Creation Failures** - Check available memory and screen bounds

### Debug Tools
- **Console Logs** - Comprehensive logging throughout the flow
- **Developer Tools** - Auto-open available for debugging
- **State Inspection** - Redux state shows window status
- **Performance Monitoring** - Built-in stats and metrics 