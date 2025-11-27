# Video Call Window Documentation

## Overview

The video call window system in Rocket.Chat Electron provides a dedicated, high-performance environment for video conferencing with providers like Jitsi and Pexip.

## Architecture

The system uses a **vanilla JavaScript bootstrap** with **deferred React loading**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Video Call Window                         │
├─────────────────────────────────────────────────────────────┤
│  video-call-window.ts (Vanilla JS)                          │
│  ├── i18n initialization                                    │
│  ├── Webview lifecycle management                           │
│  ├── Loading/error overlays (DOM)                           │
│  └── IPC communication                                      │
├─────────────────────────────────────────────────────────────┤
│  screenSharePickerMount.tsx (React - Lazy Loaded)           │
│  └── ScreenSharePicker component                            │
├─────────────────────────────────────────────────────────────┤
│  Desktop Capturer Cache (Stale-While-Revalidate)            │
│  ├── Pre-warmed on webview load                             │
│  ├── Instant response, background refresh                   │
│  └── Persists across calls                                  │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Vanilla JS for critical path (faster load, simpler recovery)
- React only for ScreenSharePicker (complex UI component)
- Stale-while-revalidate caching (instant UX, fresh data)
- Cache pre-warming (no loading state on first screen share)

## Documentation Files

### [Window Management Flow](./video-call-window-management.md)

**What it covers:** Complete lifecycle from click to active video call.

This document explains the vanilla JS architecture that manages the video call window. It shows how the app creates a separate window, initializes without React overhead, handles loading states through direct DOM manipulation, and provides automatic error recovery.

**You'll learn about:**
- Vanilla JS bootstrap architecture
- Why React is deferred (performance benefits)
- Webview creation and attribute ordering
- Loading and error overlay management
- Smart loading system (no flicker, no interruption)
- Progressive error recovery strategies
- Window cleanup and resource management

**Architecture highlights:**
- No React in critical path
- Direct DOM manipulation for overlays
- Deferred React import for screen sharing
- Cache pre-warming on load completion

### [Screen Sharing Flow](./video-call-screen-sharing.md)

**What it covers:** Screen sharing with stale-while-revalidate caching.

This document explains the caching architecture that makes screen sharing feel instant. It shows how the cache is pre-warmed when the video call loads, how stale data is returned immediately while fresh data is fetched in the background, and why the cache persists indefinitely.

**You'll learn about:**
- Stale-while-revalidate pattern
- Cache pre-warming strategy
- Why cache never expires
- Background refresh mechanics
- Deferred React loading for picker
- Source validation and filtering
- Memory usage characteristics

**Cache characteristics:**
- Always returns data immediately
- Background refresh when stale (>3s)
- Persists until app quit or error

### [WGC Limitations](./video-call-window-wgc-limitations.md)

**What it covers:** Windows Graphics Capture limitations and workarounds.

This document explains why screen sharing fails in Remote Desktop (RDP) sessions and how the app handles this through automatic detection and fallback mechanisms.

## How They Work Together

### The Complete User Journey

```
1. User clicks video call button
   └─► Window Management Flow
       ├── Create BrowserWindow
       ├── Vanilla JS bootstrap
       ├── Load webview with provider URL
       └── Pre-warm desktop capturer cache

2. Video call active
   └─► User clicks screen share
       └─► Screen Sharing Flow
           ├── Show ScreenSharePicker (React, lazy loaded)
           ├── Return cached sources instantly
           ├── Background refresh if stale
           └── Stream selected source
```

### Real-World Example

**Starting a call:**
1. Click "Join Video Call" in Rocket.Chat
2. Window Management Flow creates dedicated window
3. Vanilla JS shows loading overlay with localized text
4. Webview loads Jitsi/Pexip interface
5. Cache pre-warmed in background
6. Loading overlay hidden, video call visible

**Sharing your screen:**
1. Click screen share button in video call
2. ScreenSharePicker React component loaded (first time) or shown
3. Cached sources displayed instantly (no loading spinner)
4. Background refresh updates thumbnails if stale
5. Select window or screen
6. Stream starts immediately

## Key Innovations

### Vanilla JS Bootstrap
Traditional Electron apps render everything with React. This video call window uses vanilla JavaScript for the critical path:
- **Faster startup**: No React bundle to parse/execute initially
- **Simpler recovery**: Direct DOM manipulation, no state management
- **Lower memory**: React only loaded when needed

### Stale-While-Revalidate Cache
Traditional caching uses TTL (time-to-live) expiration. This system uses stale-while-revalidate:
- **Always instant**: Returns cached data immediately
- **Always fresh**: Background refresh keeps data current
- **Never empty**: Cache persists, no expiration
- **Error resilient**: Keeps last good data on fetch failure

### Cache Pre-warming
Traditional apps fetch data on demand. This system pre-warms:
- **Proactive fetch**: Cache populated when webview loads
- **Zero wait**: First screen share shows sources instantly
- **Background operation**: No impact on video call startup

## File Structure

```
src/videoCallWindow/
├── video-call-window.ts       # Vanilla JS bootstrap
├── screenSharePicker.tsx      # React screen picker UI
├── screenSharePickerMount.tsx # React mounting utilities
├── ipc.ts                     # Main process handlers
└── preload/
    └── index.ts               # Webview preload script

src/public/
├── video-call-window.html     # Window HTML with overlay containers
├── loading.css                # Loading overlay styles
└── error.css                  # Error overlay styles
```

## Related Documentation

- [Supported Versions Flow](./supported-versions-flow.md) - Server version compatibility
- [Testing Documentation](./testing/) - Test procedures and guidelines

Both window management and screen sharing systems work together seamlessly to provide a fast, reliable, and user-friendly video calling experience.
