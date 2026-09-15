# Troubleshooting

How to collect Desktop logs and inspect the running app when something
goes wrong.

## Log Viewer

In the running app, open **Help → Open Log Viewer** (`menus.openLogViewer`;
shortcut `Ctrl+Shift+L` / `Cmd+Shift+L`). The viewer lives in
`src/logViewerWindow/` and can filter, **Copy**, and **Save** the
current log buffer for a bug report.

## Debug / verbose logging

The Debug Logging toggle is **Settings → Advanced → Verbose logging**
(`settings.options.debugLogging`). The visible label is **Verbose
logging**; it writes all console output to the log file. When it is off,
only errors and important messages are saved.

The toggle is shown only after **Help → Developer Mode** is enabled.
Without Developer Mode, Settings → Advanced still has hardware
acceleration and error reporting, but not the logging switches.

## On-disk log paths

Logs are written via Electron's `app.getPath('logs')` (see
`src/logging/index.ts`). Typical locations:

| Platform | Directory |
| -------- | --------- |
| Windows  | `%APPDATA%\Rocket.Chat\logs` |
| macOS    | `~/Library/Logs/Rocket.Chat` |
| Linux    | `~/.config/Rocket.Chat/logs` |

The default file is `main.log`. Attach a Log Viewer export or this file
when filing a bug.

## DevTools

- **Help → Toggle DevTools** (`Ctrl+Shift+D` / `Cmd+Shift+D`) opens
  DevTools on the focused Desktop window (shell / titlebar).
- **View → Open DevTools** (`Ctrl+Shift+I` / `Cmd+Alt+I`) opens DevTools
  on the current workspace webview.

## Dev inspector (`yarn start`)

`yarn start` launches the main process with `--inspect=9339`
(`rollup.config.mjs`). Attach a Node inspector or open
`http://127.0.0.1:9339/json` while developing. This port is for local
dev only; it is not a packaged-app setting.

## Related

- [Bug report template](../.github/ISSUE_TEMPLATE/bug-report.yml) —
  include install type and a Log Viewer export.
- [QA alpha update testing](./qa-alpha-update-testing.md) — in-app update
  checks on GitHub-installed builds.
- [How updates work by install source](../README.md#how-updates-work-by-install-source)
  — store vs GitHub vs Snap vs distro/IT.
