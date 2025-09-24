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

## Recommended Workaround
1. When the app starts on Windows:
   - if `process.env.SESSIONNAME` is not `Console`, append `disable-features=WebRtcAllowWgcDesktopCapturer` before creating the app window.
   - This forces Chromium to use the legacy Desktop Duplication capturer, which works in RDP sessions.
2. Tell users to restart the desktop app after switching between local and RDP sessions so the correct capturer is selected.
3. Optionally expose a manual toggle in settings so administrators can force the legacy capturer for every session.

## References
- Microsoft documentation on Windows Graphics Capture limitations (remote sessions unsupported): https://learn.microsoft.com/windows/uwp/audio-video-camera/screen-capture#limitations
- Chromium WebRTC bug describing the RDP failure with WGC: https://bugs.chromium.org/p/chromium/issues/detail?id=1258686
- Chromium source comment explaining why WGC only works for interactive sessions: https://source.chromium.org/chromium/chromium/src/+/main:third_party/webrtc/modules/desktop_capture/win/wgc_desktop_frame_capturer_win.cc;l=51-60
- Electron desktopCapturer docs noting RDP limitations and the need to disable WGC: https://www.electronjs.org/docs/latest/api/desktop-capturer#windows-remote-sessions
- Electron issue tracker confirming the recommended switch (`disable-features=WebRtcAllowWgcDesktopCapturer`): https://github.com/electron/electron/issues/27411