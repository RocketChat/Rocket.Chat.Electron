---
title: Video Call Window Configuration and WebPreferences
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:45:28.667Z'
updatedAt: '2026-04-04T18:45:28.667Z'
---
## Raw Concept
**Task:**
Document BrowserWindow configuration and webPreferences settings

**Changes:**
- webPreferences: nodeIntegration true, contextIsolation false
- Windows RDP detection and fallback mode
- WebRTC screen capture feature flags

**Files:**
- src/videoCallWindow/ipc.ts

**Timestamp:** 2026-04-04

## Narrative
### Structure
Window created with specific webPreferences: nodeIntegration enabled, contextIsolation disabled, webviewTag enabled, experimentalFeatures disabled, v8CacheOptions bypassHeatCheck, spellcheck disabled. Windows-specific: RDP detection via process.env.SESSIONNAME !== Console, screen capture fallback flag isVideoCallScreenCaptureFallbackEnabled.

### Dependencies
Requires Electron BrowserWindow API, process environment access, WebRTC API.

### Highlights
RDP detection triggers disabling WebRTC screen capture features (WebRtcAllowWgcDesktopCapturer, WebRtcAllowWgcScreenCapturer) via additionalArguments. Fallback mode supports legacy screen capture.

### Rules
Rule 1: nodeIntegration = true
Rule 2: nodeIntegrationInSubFrames = true
Rule 3: contextIsolation = false
Rule 4: webviewTag = true
Rule 5: experimentalFeatures = false
Rule 6: offscreen = false
Rule 7: disableHtmlFullscreenWindowResize = true
Rule 8: backgroundThrottling = true
Rule 9: v8CacheOptions = bypassHeatCheck
Rule 10: spellcheck = false
Rule 11: show = false (hidden initially)
Rule 12: frame = true
Rule 13: transparent = false
Rule 14: skipTaskbar = false
