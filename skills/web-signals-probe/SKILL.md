---
name: web-signals-probe
description: Checks that a Rocket.Chat server's web client still fires the window events that the desktop app reads. It probes the Meteor build and the Vite build, in the page world and in an isolated world like a preload. Use it before you change desktop code that reads these events. Use it when a core release or the Vite client can change them. Use it when the badge, the logged-in state, the boot signal or the tray status fails on a new server. Triggers include "probe web signals", "check the web client events", "did core break the desktop signals", "test the Vite client with the desktop".
---

# Probe the web client signals

The desktop app reads `window` CustomEvents that the web client fires. It
does not read the webapp's internal modules. The `yarn probe:web-signals`
command checks this contract against a real server. It loads the client in
Chrome. It records each event in the page world and in an isolated world.
The isolated world receives what the desktop preload receives.

The command checks two builds:

- `meteor`: the client that the server serves.
- `vite`: the standalone client bundle from
  `ghcr.io/rocketchat/rocket.chat-web:<tag>`. The command routes requests the
  same way as the desktop UI preview (`src/ui/main/serverView/uiOverride.ts`).

## When to use

- Before you change desktop code that reads these events.
- When a new Rocket.Chat release or a Vite client change can change them.
- When the badge, the logged-in state, the boot signal or the tray status
  fails on a new server version.

## The contract

`PHASE_EXPECTATIONS` in `scripts/webSignals.lib.ts` is the contract. Each
phase must deliver its events in both worlds:

| Phase                  | Action                                             | Expected events                                                                                    |
| ---------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| logged-out boot        | Load `/home` with no token.                        | `startup` (detail `true`), `Custom_Script_Logged_Out`                                              |
| logged-in boot         | Reload with the admin token in `localStorage`.     | `startup`, `Custom_Script_Logged_In`, `status-changed`, `unread-changed`                           |
| incoming message       | A second user sends a direct message to the admin. | `unread-changed-by-subscription` (object), `unread-changed` (count grows), `notification` (object) |
| external status change | REST `users.setStatus` sets `busy`.                | `status-changed` (detail `busy`)                                                                   |
| forced logout          | REST `users.logout` for the admin.                 | `Custom_Script_Logged_Out`                                                                         |

The contract does not include `Custom_Script_On_Logout`. The Meteor build
does not fire it on a forced logout.

## Procedure

1. Get a disposable server. The forced-logout phase logs the admin out of
   every session.
   - With mosdat: run `mosdat_server_provision` with ref `develop` (or a
     release tag, or a PR). The result gives the URL. The default admin is
     `mosdat-admin` / `mosdat-admin-pass`.
   - If mosdat reports that the Docker daemon is not running, start Docker
     Desktop. If `docker info` does not answer after 2 minutes, quit Docker
     Desktop and start it again.
2. Run the probe from the repository root:

   ```sh
   yarn probe:web-signals --server <url> --out <report.json>
   ```

   - Add `--user` and `--password` when the admin is not the mosdat
     default.
   - Add `--build meteor` or `--build vite` to probe one build only.
   - Add `--bundle-tag <tag>` to load a different Vite bundle. Use the tag
     that matches the server revision when you can.
   - Add `--bundle-dir <dir>` to load an extracted bundle from disk.

3. Read the result.
   - `PASS` for each build: the contract holds. Exit code 0.
   - A `FAIL` line names the phase, the world and the event. Exit code 1.
     Use the table below.
4. Remove the server when you no longer need it. With mosdat, run
   `mosdat_server_teardown` with the same ref.

## Read a failure

| Result                              | Meaning                                                                                                         | Next step                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Missing in `main` and in `isolated` | The web client did not fire the event. Core removed it, renamed it, or no longer mounts the code that fires it. | Find the caller in core (`fireGlobalEvent`, `useFireGlobalEvent`). Tell the core team that the desktop reads it. |
| Missing in `isolated` only          | The page fires the event, but the isolated world does not receive it or its `detail`.                           | Check the Chrome or Electron version change. Check with an Electron preload before you change desktop code.    |
| `detail ... does not match`         | The payload shape changed.                                                                                      | Compare the old and new `detail` in the `--out` report. Update the desktop parser and the contract together.     |
| Fails on `vite` only                | A Vite build regression.                                                                                        | Check `apps/meteor/vite` in core. Probe again with the bundle tag that matches the server.                       |
| Fails on `meteor` only              | A Meteor build regression, or a Meteor-only code path.                                                          | Check `apps/meteor/client/meteor` in core.                                                                       |
| `count did not grow`                | The new message did not raise the unread count.                                                                 | Check that the direct message arrived (`--out` report, `incoming message` phase).                                |

## Change the contract

1. Edit `PHASE_EXPECTATIONS` in `scripts/webSignals.lib.ts`.
2. Update `scripts/webSignals.lib.spec.ts`.
3. Run `yarn test scripts/webSignals.lib.spec.ts`.
4. Run the probe against a server to show the new contract passes.
5. Update the event list in `AGENTS.md` (Testing section) and in
   `scripts/README.md`.

## Limits

- The isolated world is a Chrome CDP world (`worldName`), not the desktop
  preload. On 2026-10-19 an Electron 42.5 preload with `contextIsolation`
  and `sandbox` received the same events and object details. Check again
  after an Electron major upgrade.
- Headless Chrome cannot open the user menu. So the probe does not cover a
  logout from the menu. It covers the forced logout only.
- Lint and the project `tsc` exclude `scripts/`. Check new script code with
  `npx tsc --noEmit --strict --esModuleInterop --skipLibCheck --target es2022 --module commonjs --moduleResolution node --lib es2022,dom --types node,jest <files>`.
