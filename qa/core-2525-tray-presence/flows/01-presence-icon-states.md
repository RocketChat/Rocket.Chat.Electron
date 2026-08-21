---
id: CORE-2525-QA-001
title: Tray Icon Shows A Distinct Dot Per Presence State
platforms: [windows, linux]
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
- Changed surface: `src/ui/main/icons.ts` (`getTrayIconPath`), `src/ui/main/trayIcon.ts` (`updateTrayIconImage`, `getActivePresenceForIcon`), `src/ui/icons/PresenceDot.tsx`.
- User-visible risk: A tester cannot tell their presence at a glance from the system tray, or two states render as the same icon.
- Hypothesis: Setting presence to online, away, busy, or offline changes the tray icon to a distinct dot color/shape (online `#2DE0A5` filled, away `#FFD21F` filled, busy `#F5455C` filled, offline `#9EA2A8` hollow ring) with no badge overlap.
- Smallest useful proof: Local UI repro on a real Windows and Linux build, comparing the tray icon crop against the four expected renders.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Launch the branch build and sign in to a presence-supporting workspace so the main window fully loads. On Windows, locate the app's icon in the notification area at the bottom-right of the taskbar (click the `^` overflow chevron first if the icon is hidden there). On Linux, locate the icon in the system tray/status area, typically top-right of the panel. | Presence-supporting workspace credentials | Tray icon is visible and shows a default icon plus a small colored dot in the lower-right corner of the icon. | Locate the tray icon element/pixel region for the app. |
| 2 | Right-click the tray icon to open its context menu, then click the `Online` radio item at the top of the menu (a filled circle indicator to the left of the label when selected). | Presence value `online` | Within a few seconds the tray icon's dot renders as a solid green-teal filled circle (`#2DE0A5`). | Set presence to `online` via the app's IPC/API path and read back the icon file path from `getTrayIconPath`. |
| 3 | Right-click the tray icon again and click the `Away` radio item. | Presence value `away` | The tray icon's dot changes to a solid yellow filled circle (`#FFD21F`), visibly different from step 2. | Set presence to `away`, confirm the resolved icon path differs from the online icon path. |
| 4 | Right-click the tray icon again and click the `Busy` radio item. | Presence value `busy` | The tray icon's dot changes to a solid red filled circle (`#F5455C`), visibly different from steps 2 and 3. | Set presence to `busy`, confirm the resolved icon path differs from prior states. |
| 5 | Right-click the tray icon again and click the `Offline` radio item. | Presence value `offline` | The tray icon's dot changes to a hollow/outlined gray ring (`#9EA2A8` stroke, no fill), visually distinct from the three filled dots in steps 2-4 (ring vs. solid disc). | Set presence to `offline`, confirm the resolved icon path differs from prior states and the rendered asset uses the ring/outline variant. |
| 6 | Zoom or crop a screenshot of the tray icon region at native size (16x16 on Windows) for each of the four states captured above. | Screenshots from steps 2-5 | All four crops are distinguishable from each other by color/shape even at native icon size. | Compare the four resolved icon file paths/pixel buffers; assert they are byte-distinct. |

## Evidence

- Zoomed screenshot/crop of the tray icon for each of the four presence states.
- Resolved icon file paths used per state (from app logs or code-path proof) if screenshots are inconclusive at native size.

## Failure Signals

- Two or more presence states render the same icon (color/shape collision).
- The dot does not appear at all (icon looks identical to the pre-feature default icon).
- The offline ring renders filled instead of hollow, or is indistinguishable from busy/away at native size.
- The icon fails to update within a few seconds of changing presence.
