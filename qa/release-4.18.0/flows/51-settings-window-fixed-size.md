---
id: REL418-QA-051
title: Settings Window Opens At A Fixed Size And Cannot Be Resized
platforms: [windows, macos, linux]
priority: medium
qase:
  suite: Release 4.18.0 / App shell
  priority: medium
  severity: normal
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: The settings window always opens at 900 by 720 points (or the content width, if larger) and cannot be resized or maximized. On Windows the title bar shows only minimize and close.
---

# Settings Window Opens At A Fixed Size And Cannot Be Resized

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712. Build under test: 4.18.0-alpha.6.
- Changed surface: #3504 (`src/settingsWindow/ipc.ts` `resizable: false` and `maximizable: false`, fixed size in `src/settingsWindow/constants.ts`, `isMaximizable` prop on `WindowToolbar` and `WindowControls`). Related: the #3488 reset (REL418-QA-050).
- User-visible risk: The window still resizes or maximizes. Or a size that an older build saved comes back. Or the Windows title bar shows a maximize button that does not work. Or the sections wrap or clip at the fixed size.
- Hypothesis: A profile that has a saved settings window size from 4.17.x opens the window at the fixed size. The user cannot change the size. Every section fits.
- Smallest useful proof: Unit specs for the window options, the position-only restore and the hidden maximize button. The PR author checked macOS only. A spec covers the Windows title bar only. This flow runs it on Windows.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Open the settings window. On macOS, click the "Rocket.Chat" menu and click "Preferences". On Windows and Linux, press `Ctrl+,`. | Profile from 4.17.x, if available | A window titled "App settings" opens. Its size is about 900 by 720. A small screen work area makes it smaller. | Open the window and read its bounds. |
| 2 | Move the pointer to the right edge and to the bottom-right corner of the settings window. Drag. | None | The pointer shows no resize cursor. The window size does not change. | Try `setBounds` by drag. Read the size. |
| 3 | Look at the window controls. On macOS, look at the three round buttons at the top-left. On Windows, look at the top-right of the window. | None | macOS: the green button is gray or does not zoom the window when you click it. Windows: only the minimize (dash) and close (X) buttons show. No square maximize button shows. | Read the visible controls. |
| 4 | Double-click the title bar. | None | The window does not maximize. | Double-click and read the size. |
| 5 | Click each item in the left list in turn. The items are "General", "Appearance", "Certificates", "Telephony", "Video calls" and "Advanced". Look at the right panel. | None | Every section shows without clipped text or controls. The "Appearance" section shows its theme thumbnails in one row. | Click each item and capture a screenshot. |
| 6 | Close the window. Open it again. Drag it to the left side of the screen first, then close it, then open it again. | None | The window opens at the same size as in step 1. It opens at the position where you left it. | Reopen and compare the bounds. |
| 7 | In the settings window, click "Advanced". Click "Reset window sizes and positions". | None | The settings window moves to the center. Its size does not change. | Click and compare the size. |

## Evidence

- Screenshot of the window controls (step 3) on each platform.
- Screenshot of "Appearance" and "Advanced" sections.
- The window size from step 1 and step 6.

## Failure Signals

- The window resizes or maximizes.
- Windows shows a maximize button.
- A saved size from 4.17.x comes back.
- A section shows clipped or overlapping content.
