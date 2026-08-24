---
id: CORE-2525-QA-001
title: Tray Icon Shows A Distinct Dot Per Presence State
platforms: [windows, linux, macos]
priority: smoke
qase:
  suite: Tray presence status
  priority: high
  severity: critical
  status: actual
  automation: manual
  qase_id: null
requires:
  [installed_branch_build, presence_supporting_workspace, logged_in_session]
test_links: []
expected_result: The tray icon shows a visually distinct colored dot for online, away, busy, and offline, matching the effective presence value.
---

# Tray Icon Shows A Distinct Dot Per Presence State

## Review Basis

- Comparison range: `dev` to the CORE-2525 branch.
- Changed surface: `src/ui/main/icons.ts` (`getTrayIconPath`), `src/ui/main/trayIcon.ts` (`updateTrayIconImage`, `getActivePresenceForIcon`), `src/ui/icons/WindowsTrayIcon.tsx` / `LinuxTrayIcon.tsx` / `MacOSTrayIcon.tsx` (presence recolors the existing `Badge` overlay; same size and position as the shipping unread circle), `src/ui/main/macOSTrayGlyph.ts` (`invertDarkAchromaticPixels`, `applyMacOSMenuBarGlyphAppearance`).
- User-visible risk: A tester cannot tell their presence at a glance from the system tray/menu bar, or two states render as the same icon.
- Hypothesis: Setting presence to online, away, busy, or offline recolors the existing unread-badge circle (online `#2DE0A5`, away `#FFD21F`, busy `#F5455C`, offline `#9EA2A8`) without moving or resizing it, on Windows, Linux, and macOS alike.
- Smallest useful proof: Local UI repro on a real Windows, Linux, and macOS build, comparing the tray icon crop against the four expected renders.
- macOS verification note: on macOS the icon lives in the menu bar (top-right of the screen), not a taskbar notification area, and the menu opens with a single left-click on the icon (there is no right-click step on macOS — every "right-click the tray icon" instruction in this flow means "click the menu bar icon" on macOS). The rocket glyph itself goes through `invertDarkAchromaticPixels`, which inverts only dark, low-saturation (achromatic) pixels to white so the glyph reads correctly whether the menu bar is light- or dark-tinted (including Liquid Glass, which keeps status items light-tinted even in Light appearance); the saturated presence dot pixels are left untouched by that inversion, so the four presence colours render exactly as specified above. Presence icon assets under `src/public/images/tray/darwin/` are intentionally not named `*Template.png` — if they were, AppKit would flatten the dot to monochrome along with the glyph, which is the specific regression this hypothesis guards against on macOS.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1    | Launch the branch build and sign in to a presence-supporting workspace so the main window fully loads. On Windows, locate the app's icon in the notification area at the bottom-right of the taskbar (click the `^` overflow chevron first if the icon is hidden there). On Linux, locate the icon in the system tray/status area, typically top-right of the panel. On macOS, locate the icon in the menu bar at the top-right of the screen (among the other menu bar icons). | Presence-supporting workspace credentials | Tray/menu bar icon is visible and shows a default icon plus a small colored dot in the lower-right corner of the icon.         | Locate the tray icon element/pixel region for the app.                                                       |
| 2    | Right-click the tray icon to open its context menu, then click the `Online` radio item at the top of the menu (a filled circle indicator to the left of the label when selected).                                                                                                                                                                                                                                                                                               | Presence value `online`                   | Within a few seconds the tray icon's dot renders as a solid green-teal filled circle (`#2DE0A5`).                              | Set presence to `online` via the app's IPC/API path and read back the icon file path from `getTrayIconPath`. |
| 3    | Right-click the tray icon again and click the `Away` radio item.                                                                                                                                                                                                                                                                                                                                                                                                                | Presence value `away`                     | The tray icon's dot changes to a solid yellow filled circle (`#FFD21F`), visibly different from step 2.                        | Set presence to `away`, confirm the resolved icon path differs from the online icon path.                    |
| 4    | Right-click the tray icon again and click the `Busy` radio item.                                                                                                                                                                                                                                                                                                                                                                                                                | Presence value `busy`                     | The tray icon's dot changes to a solid red filled circle (`#F5455C`), visibly different from steps 2 and 3.                    | Set presence to `busy`, confirm the resolved icon path differs from prior states.                            |
| 5    | Right-click the tray icon again and click the `Offline` radio item.                                                                                                                                                                                                                                                                                                                                                                                                             | Presence value `offline`                  | The tray icon's circle changes to a solid gray fill (`#9EA2A8`), same size and position as steps 2-4, distinct by colour only. | Set presence to `offline`, confirm the resolved icon path differs from prior states.                         |
| 6    | Zoom or crop a screenshot of the tray/menu bar icon region at native size (16x16 on Windows; macOS menu bar icons render at 18x18 pt, 2x/3x on Retina) for each of the four states captured above.                                                                                                                                                                                                                                                                              | Screenshots from steps 2-5                | All four crops are distinguishable from each other by color/shape even at native icon size.                                    | Compare the four resolved icon file paths/pixel buffers; assert they are byte-distinct.                      |

## Evidence

- Zoomed screenshot/crop of the tray icon for each of the four presence states.
- Resolved icon file paths used per state (from app logs or code-path proof) if screenshots are inconclusive at native size.

## Failure Signals

- Two or more presence states render the same icon (color/shape collision).
- The dot does not appear at all (icon looks identical to the pre-feature default icon).
- Offline is indistinguishable from busy/away at native size.
- The icon fails to update within a few seconds of changing presence.
