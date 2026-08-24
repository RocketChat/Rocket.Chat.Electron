# Tray Presence Status QA Pack (CORE-2525)

This folder contains manual and agent-readable QA flows for the tray presence
status feature. It covers the Windows/Linux/macOS system-tray or menu-bar icon
showing a presence dot (online/away/busy/offline), the tray context menu's
presence radio items and read-only custom status line, connection/logged-out/
no-workspace/unsupported-workspace states, active-workspace scoping, the
unread-badge regression, and the presence rate limiter, on all three
platforms.

macOS ships the presence dot indicator alongside Windows and Linux and is a
fully in-scope target platform for every flow in this pack: run all flows on
macOS, not just Windows and Linux. The rocket glyph in the menu bar goes
through a colour-inversion path (`src/ui/main/macOSTrayGlyph.ts`,
`invertDarkAchromaticPixels`) that inverts only dark, low-saturation
(achromatic) glyph pixels to white so the icon reads correctly against both
light- and dark-tinted menu bars, including Liquid Glass, which keeps status
items light-tinted even when the system Appearance is set to Light; the
saturated presence dot pixels are deliberately left untouched by that
inversion, and the presence icon assets under `src/public/images/tray/darwin/`
are deliberately not named `*Template.png`, so the colour-coded dot renders
in colour rather than being flattened to monochrome by AppKit. Two mechanical
differences a tester needs to execute steps correctly on macOS:

- The icon lives in the menu bar at the top-right of the screen, not a
  taskbar notification area. Wherever a step says "right-click the tray icon
  (Windows notification area / Linux system tray)", on macOS this means:
  click the app's icon in the menu bar (a single left-click opens the menu;
  there is no separate right-click gesture for this icon on macOS).
- Menu bar icons render at 18x18 pt (2x/3x pixel density on Retina displays),
  not 16x16 px like Windows; native-size screenshot crops should be taken at
  the platform's own native resolution.

The steps are intentionally visual and self-contained. They describe screen
region, icon shape, visible labels, and confirmation states because these
flows are meant for both QA engineers and future visual agents. Do not
replace those instructions with references to a separate navigation
document.

## Quick Start

1. Install or run a build from this branch on Windows, Linux, or macOS.
2. Add at least two Rocket.Chat workspaces that support presence (a modern
   server where the account has a `status` field), and sign in to at least
   one of them far enough for the main window to load.
3. Keep the web client (or another Rocket.Chat client, e.g. a second browser
   session logged in as the same user) open side by side so status changes
   can be confirmed independently of the tray.
4. Follow the smoke order below, then run the remaining flows.
5. For Qase import, run
   `node qa/scripts/export-qase-csv.mjs qa/core-2525-tray-presence` and
   import the generated CSV with source type `Qase.io`.

## Smoke Order

| Order | Flow                                      | Required on           |
| ----- | ----------------------------------------- | --------------------- |
| 1     | `flows/01-presence-icon-states.md`        | Windows, Linux, macOS |
| 2     | `flows/02-presence-menu-radios.md`        | Windows, Linux, macOS |
| 3     | `flows/03-custom-status-text.md`          | Windows, Linux, macOS |
| 4     | `flows/04-active-workspace-scoping.md`    | Windows, Linux, macOS |
| 5     | `flows/05-disconnected-state.md`          | Windows, Linux, macOS |
| 6     | `flows/06-logged-out-state.md`            | Windows, Linux, macOS |
| 7     | `flows/07-no-workspace-state.md`          | Windows, Linux, macOS |
| 8     | `flows/08-unsupported-workspace.md`       | Windows, Linux, macOS |
| 9     | `flows/09-unread-badge-regression.md`     | Windows, Linux, macOS |
| 10    | `flows/10-badge-and-presence-combined.md` | Windows, Linux, macOS |
| 11    | `flows/11-rate-limit-rapid-clicks.md`     | Windows, Linux, macOS |

## Flow Result Format

Use this format in `results/` or in the release issue/PR comment:

```text
Flow ID:
Platform:
Build:
Result: Pass | Fail | Blocked
Evidence:
Notes:
```

Capture screenshots of the tray icon (ideally a zoomed crop of the
notification area / system tray / macOS menu bar) for icon-legibility
failures, and screen recordings or before/after screenshots of the second
client for status-value failures.

## Folder Map

| Path       | Purpose                                                           |
| ---------- | ----------------------------------------------------------------- |
| `flows/`   | Structured QA flows                                               |
| `exports/` | Generated Qase CSV exports                                        |
| `results/` | Optional local evidence area; do not commit run-specific evidence |

## Source Of UI Truth

When updating this pack, derive visible steps from the implementation:

- Tray menu items and enabled/checked/hidden logic:
  `src/ui/main/trayIcon.ts` (`buildMenuTemplate`, `buildPresenceMenuItems`).
- Tray icon file selection per platform/badge/presence: `src/ui/main/icons.ts`
  (`getTrayIconPath`).
- Presence circle colours (existing unread `Badge`, recolored):
  `src/ui/icons/presenceColors.ts`, `WindowsTrayIcon.tsx`, `LinuxTrayIcon.tsx`,
  `MacOSTrayIcon.tsx`.
- macOS menu bar glyph appearance (colour inversion of the achromatic glyph
  only, presence dot left untouched): `src/ui/main/macOSTrayGlyph.ts`
  (`invertDarkAchromaticPixels`, `applyMacOSMenuBarGlyphAppearance`).
- Visible menu labels: `src/i18n/en.i18n.json` under `tray.presence.*`.
- Active-workspace presence selection: `src/ui/selectors.ts`
  (`selectActiveServerPresence`).
- Presence read/write and rate limiting inside the webview:
  `src/injected.ts` (`userPresenceStatus` setup block) and
  `src/servers/preload/presenceDebounce.ts`.
