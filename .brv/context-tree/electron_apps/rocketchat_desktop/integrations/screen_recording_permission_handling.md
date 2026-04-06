---
title: Screen Recording Permission Handling
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:13:18.152Z'
updatedAt: '2026-04-04T18:13:18.152Z'
---
## Raw Concept
**Task:**
Check screen recording permissions on macOS using systemPreferences API

**Changes:**
- Implemented checkScreenRecordingPermission() for macOS permission checking
- Returns true on non-macOS platforms (no permission check needed)
- Uses systemPreferences.getMediaAccessStatus('screen') on macOS

**Files:**
- src/screenSharing/screenRecordingPermission.ts
- src/screenSharing/serverViewScreenSharing.ts

**Flow:**
checkScreenRecordingPermission() → if macOS: call systemPreferences.getMediaAccessStatus('screen') → return true if 'granted', else false → if non-macOS: return true (no permission needed)

**Timestamp:** 2026-04-04

## Narrative
### Structure
checkScreenRecordingPermission() in screenRecordingPermission.ts: checks process.platform === 'darwin' (macOS). On macOS: calls systemPreferences.getMediaAccessStatus('screen') and returns true only if status === 'granted'. On other platforms: returns true (no permission check needed). Called via IPC handler 'screen-picker/screen-recording-is-permission-granted' in serverViewScreenSharing.ts.

### Dependencies
Requires Electron systemPreferences API (macOS only), IPC handler registration.

### Highlights
macOS requires explicit screen recording permission granted by user. Other platforms (Windows, Linux) do not require permission check. Permission status checked at runtime before allowing screen sharing. Gracefully handles non-macOS platforms by returning true (permission granted).
