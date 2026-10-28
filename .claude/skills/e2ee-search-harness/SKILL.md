---
name: e2ee-search-harness
description: Run the E2EE local search harness (packaged macOS or Windows app, local server) and report its result lines
---

# E2EE search harness

The harness is in `scripts/e2ee-search-harness/`. Read
`scripts/e2ee-search-harness/README.md` first. It tells what each check
proves and what each script does.

## Run it

1. Make sure that a Rocket.Chat checkout of the companion branch exists, with
   its dependencies installed and its packages built.
2. Set `ROCKETCHAT_CORE_DIR` to that checkout. Alternatively, write it in
   `.localdev/e2ee-search-harness/env`.
3. Run `scripts/e2ee-search-harness/run-all.sh` from the repository root.
   Run it in the background, because it can take 10 minutes or more. A cold
   server start and a first app build each take some minutes.
4. To run the packaged test again on the same world, run
   `scripts/e2ee-search-harness/run-all.sh --reuse`.
5. After a change to the desktop code, run
   `scripts/e2ee-search-harness/build-macos.sh` before the test.

## Run it on Windows

1. Start the server with `scripts/e2ee-search-harness/server.sh up`. Do not
   use `run-all.sh` for Windows. Its reset deletes every world.
2. Set `WINDOWS_HOST` to the SSH destination of a Windows 11 x64 host with
   a key login and Node.js 22.18 or later. Set `WINDOWS_NODE_DIR` when
   `node` is not in PATH on the host.
3. Run `scripts/e2ee-search-harness/windows-packaged.sh --build` in the
   background. The first build on the host takes some minutes. Leave out
   `--build` to test the last build again.
4. The script uses the world `win` (users `winharnessa` and `winharnessb`).
   It never resets the server, so the macOS world stays.
5. Report `f.dpapi` in place of `f`. The README tells what each Windows
   line proves.

## Report

- Copy each `PASS` or `FAIL` line and the `SUMMARY` line exactly.
- Give the run folder path.
- Do not print a password, a token or the content of the state file.
- For a `FAIL`, find the cause before you change code. Read the JSON files
  and `main.log` in the run folder.
- For a canary hit, the line tells the place (search index, web client
  storage, or other). The bytes near a hit are test words only, so you can
  read them to find which store wrote them.

## Rules

- Do not stop or reuse a server that the harness did not start.
  `server.sh down` stops only the harness processes.
- Do not move the mouse or take the focus. The scripts use `open -g` and CDP.
- On Windows, stop only the test app. `windows/stop.ps1` stops only the
  processes under `$WINDOWS_DIR\dist`.
- If a keychain dialog shows, stop and report it. Never click
  "Always Allow". Never change the keychain access lists.
- Do not set `APP_NAME` to `Rocket.Chat`. That is the production keychain
  item and profile.
