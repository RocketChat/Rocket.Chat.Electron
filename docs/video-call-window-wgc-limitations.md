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
3.  **Smart restart behavior**:
    -   Users are advised to restart the desktop app after switching between local and RDP sessions to ensure the correct screen capture backend is active.
    -   If the app is launched in an RDP session, the toggle can still be changed, but it will not trigger an immediate restart, as the fallback is already enforced by the environment. The change will be applied on the next app launch.
    -   The UI shows a different description when the fallback is enforced by RDP detection: "Currently enforced because the app detected a Remote Desktop session. Toggle now controls future launches when running locally."

## References
- Microsoft documentation on Windows Graphics Capture limitations (remote sessions unsupported): https://learn.microsoft.com/windows/uwp/audio-video-camera/screen-capture#limitations
- Chromium WebRTC bug describing the RDP failure with WGC: https://bugs.chromium.org/p/chromium/issues/detail?id=1258686
- Chromium source comment explaining why WGC only works for interactive sessions: https://source.chromium.org/chromium/chromium/src/+/main:third_party/webrtc/modules/desktop_capture/win/wgc_desktop_frame_capturer_win.cc;l=51-60
- Electron desktopCapturer docs noting RDP limitations and the need to disable WGC: https://www.electronjs.org/docs/latest/api/desktop-capturer#windows-remote-sessions
- Electron issue tracker confirming the recommended switch (`disable-features=WebRtcAllowWgcDesktopCapturer`): https://github.com/electron/electron/issues/27411