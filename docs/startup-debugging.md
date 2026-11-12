# Startup debugging

How to read the app's state during startup, and where to start when a
workspace does not finish booting. Full investigation history:
[postmortem-webview-boot-wedge.md](postmortem-webview-boot-wedge.md).

## Dev mode relaunches

- For the first ~60 s, `yarn start` relaunches Electron once per rollup bundle
  (each `writeBundle` restarts the app). Until `waiting for changes` prints,
  the tray or menu-bar icon flickers or is absent. Judge the tray state only
  after that line.
- Before you judge the tray, `pkill` orphaned worktree Electrons. A leftover
  instance keeps port 9339 and shows a second menu-bar icon.

## Webview boot

- `WEBVIEW_SERVER_VERSION_UPDATED` is the webview boot-success signal.
  `setVersion` dispatches it from `setServerInfo`.
- Key a boot cycle on a committed navigation (`did-navigate`). Do NOT key it
  on `did-start-loading`. That event fires for subframes and resources, and it
  causes false boot-failure reports.
- When a workspace stays on the loading throbber (the "boot wedge"), follow
  [.claude/skills/boot-wedge-debug/SKILL.md](../.claude/skills/boot-wedge-debug/SKILL.md)
  (watchdog report, live CDP autopsy, cure ladder).
  - If the boot watchdog was enabled for the run (dev mode or
    `ROCKETCHAT_BOOT_WATCHDOG=true`), read `boot-watchdog.jsonl` first. It is
    in Electron's `app.getPath('logs')` directory (`~/Library/Logs/Rocket.Chat/`
    on macOS).
  - If the watchdog was disabled, it wrote no report. Start with the live CDP
    autopsy.

## Render storms

A startup `Maximum update depth exceeded` storm depends on data (unread rooms
at boot). Before you blame recent code for an intermittent startup failure,
bisect against a clean baseline build. The storm reproduced on the untouched
4.16.0-alpha.2 baseline (PR #3437).
