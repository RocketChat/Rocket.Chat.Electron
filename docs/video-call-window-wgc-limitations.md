# Video Call Window – Windows Graphics Capture Limitation

## Summary
- Users on Windows 10 and 11 hit a stalled "Loading video call" screen when they join Jitsi calls through Rocket.Chat Desktop 4.9.0.
- The freeze happens mostly on Remote Desktop (RDP) sessions, but it can also appear on some on-console sessions depending on policy.
- The root cause is Chromium switching to the Windows Graphics Capture (WGC) path, which cannot capture remote sessions. WebRTC reports "Source is not capturable" and the meeting never progresses.

## Impact
- Auto-open devtools never launches because the webview does not reach `dom-ready`.
- The user-facing loading overlay never clears, so the call window appears frozen.
- Frequency is “often but not always”, matching the intermittent success of WGC when users move between console and remote sessions.

## Detection
- On Windows, `process.env.SESSIONNAME` is `Console` for local sessions and `RDP-Tcp#*` (or similar) for remote sessions. We can check this once during startup.
- If the value changes after launch (user switches to RDP), Chromium must be restarted to apply a new screen-capture backend.

## Implemented Solution
1.  **Windows-only "Screen Capture Fallback" toggle**:
    -   A new setting is available in `Settings → General` (only visible on Windows).
    -   When enabled, this setting forces Chromium to use the legacy Desktop Duplication capturer, which works reliably in RDP sessions.
2.  **Automatic RDP detection**:
    -   If `process.env.SESSIONNAME` is anything other than `Console` when the app starts, the app automatically disables Windows Graphics Capture, even if the toggle is off. This protects users who launch the client directly inside an RDP session.
3.  **Comprehensive WGC disabling**:
    -   Both `WebRtcAllowWgcDesktopCapturer` and `WebRtcAllowWgcScreenCapturer` Chrome features are disabled to ensure complete fallback to Desktop Duplication API.
    -   This dual-flag approach ensures that both desktop capturer and screen capturer variants properly fall back to the legacy API that works in RDP sessions.
4.  **Smart restart behavior**:
    -   When running locally (not in RDP), toggling the setting automatically restarts the app to apply the change.
    -   When running in an RDP session:
        - The toggle is automatically shown as ON (enabled)
        - The toggle is disabled (grayed out) and cannot be changed
        - This clearly indicates that WGC is already disabled by RDP detection
        - The descriptive text explains: "Currently enforced because the app detected a Remote Desktop session. Toggle now controls future launches when running locally."
    -   Users should restart the desktop app after switching between local and RDP sessions to ensure the correct screen capture backend is active.

## Technical Details

### Disabled Chrome Features
When RDP session is detected or the fallback setting is enabled, the following Chrome features are disabled:
- `WebRtcAllowWgcDesktopCapturer` - Disables Windows Graphics Capture for desktop capture
- `WebRtcAllowWgcScreenCapturer` - Disables Windows Graphics Capture for screen capture

Both flags are necessary because Chromium's WebRTC implementation uses different code paths for desktop and screen capturing. Disabling both ensures complete fallback to the Desktop Duplication API.

### Implementation Location
The flags are disabled at two levels for maximum reliability:

1. **App-level** (`src/app/main/app.ts`):
   - Disabled during `performElectronStartup()` function before any windows are created
   - Uses `app.commandLine.appendSwitch('disable-features', ...)` 
   - This affects all Chromium processes in the app

2. **Video call window level** (`src/videoCallWindow/ipc.ts`):
   - Explicitly passes the flags via `additionalArguments` in the BrowserWindow's `webPreferences`
   - This ensures the webview tag inside the video call window definitely inherits the flags
   - Acts as a safeguard since webview tags can have isolated renderer processes

This dual-layer approach ensures WGC is disabled both at the app level and specifically for the webview that loads Jitsi/video call content.

## References

### Windows Graphics Capture Limitations
- Microsoft documentation on Windows Graphics Capture limitations (remote sessions unsupported): https://learn.microsoft.com/windows/uwp/audio-video-camera/screen-capture#limitations
- Chromium WebRTC bug describing the RDP failure with WGC: https://bugs.chromium.org/p/chromium/issues/detail?id=1258686
- Chromium source comment explaining why WGC only works for interactive sessions: https://source.chromium.org/chromium/chromium/src/+/main:third_party/webrtc/modules/desktop_capture/win/wgc_desktop_frame_capturer_win.cc;l=51-60
- Electron desktopCapturer docs noting RDP limitations and the need to disable WGC: https://www.electronjs.org/docs/latest/api/desktop-capturer#windows-remote-sessions
- Electron issue tracker confirming the recommended switch: https://github.com/electron/electron/issues/27411
- Chromium code showing both WGC capturer variants: https://source.chromium.org/chromium/chromium/src/+/main:third_party/webrtc/modules/desktop_capture/desktop_capturer.cc

### Webview Chrome Flags Inheritance
- Electron webview tag security and architectural considerations: https://github.com/electron/electron/issues/18187
- Electron webview getUserMedia/getDisplayMedia limitations: https://github.com/electron/electron/issues/27208
- Electron documentation on webview isolation and separate process model: Webview tags run in separate renderer processes and don't automatically inherit all app-level command-line switches
- Solution: Using `additionalArguments` in parent BrowserWindow's `webPreferences` to ensure flags propagate to webview renderer processes