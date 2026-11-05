# E2EE local search harness

This harness tests the local search of encrypted messages end to end. It
uses a packaged macOS build of the desktop app and a real Rocket.Chat
server. A second script runs the same checks against a packaged Windows
build (see [Windows](#windows)). The web client of the server makes the E2E keys, sends the encrypted
messages and runs the history crawler. The desktop app keeps the encrypted
index. The harness drives everything through REST, headless Chrome and the
Chrome DevTools Protocol (CDP). It never moves the mouse and never takes the
focus.

## Prerequisites

- macOS (the packaged macOS test, and the Mac side of the Windows test). The
  server part also runs on Linux.
- Node.js 22.18 or later (the Volta pin of this repository). The canary scan
  imports a `.ts` file.
- `yarn install` in this repository. The seed script uses its `puppeteer`.
- A Rocket.Chat checkout of the companion branch, with its dependencies
  installed and its packages built (`yarn && yarn build` in that checkout).
  The harness runs `yarn dev` in `apps/meteor` of that checkout, with a
  MongoDB from the Meteor dev bundle. `yarn dev` is the Vite dev server
  (`apps/meteor/vite/dev.mjs`). It builds the workspace packages, and then
  starts the Meteor server on `HARNESS_METEOR_PORT` and Vite on
  `HARNESS_PORT`. The browser and the app talk only to Vite, which proxies
  the server routes to Meteor. The core serves the browser search worker
  from `public/workers/e2ee-search/` (links to the build of
  `@rocket.chat/e2ee-search-worker`).
- Optional: a Developer ID Application identity in the keychain. Without one,
  set `MAC_SIGN=adhoc`. macOS can then show a keychain dialog, and the test
  stops when one shows.

## Configuration

Each value is an environment variable. You can also put the values in
`.localdev/e2ee-search-harness/env`, which the scripts read.

| Variable                        | Default                         | Use                                                                                   |
| ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| `ROCKETCHAT_CORE_DIR`           | none (required)                 | The Rocket.Chat checkout                                                              |
| `HARNESS_PORT`                  | `3500`                          | Server port. MongoDB uses the next port.                                              |
| `HARNESS_METEOR_PORT`           | `HARNESS_PORT` + 10             | Port of the Meteor server behind Vite. Meteor also uses the next port.                |
| `DESKTOP_DIR`                   | this repository                 | The desktop checkout to build the app from                                            |
| `APP_NAME`                      | `Rocket.Chat R3m`               | Product name of the test app. It starts and ends with a letter, digit or underscore   |
| `CDP_PORT`                      | `9444`                          | Remote debugging port of the test app                                                 |
| `HARNESS_STATE_DIR`             | `.localdev/e2ee-search-harness` | State, logs and runs                                                                  |
| `SERVER_WAIT_S`                 | `1200`                          | Longest wait for the server to answer                                                 |
| `INDEX_TIMEOUT_S`               | `600`                           | Longest wait for the crawler                                                          |
| `RESTART_TIMEOUT_S`             | `120`                           | Longest wait for the index to open again after a restart (checks `c` and `d`)         |
| `HARNESS_BACKFILL_PAUSE_S`      | `1`                             | Seconds between two crawler requests (`E2E_Local_Search_Backfill_Pause`)              |
| `HARNESS_BACKFILL_PAGE_SIZE`    | `100`                           | Messages per crawler request (`E2E_Local_Search_Backfill_Page_Size`)                  |
| `HARNESS_BACKFILL_MAX_PER_ROOM` | `0`                             | Backfill limit per room, 0 = none (`E2E_Local_Search_Backfill_Max_Messages_Per_Room`) |

The test app has its own product name. The product name sets the keychain
item (`<name> Safe Storage`) and the user data folder. So the test never
changes the production keychain item `Rocket.Chat Safe Storage` or the
production profile.

The state folder holds passwords, tokens and test profiles. Git ignores
`.localdev/`, which has it. The scripts never print a password.

## Commands

Run the whole test with one command:

```sh
export ROCKETCHAT_CORE_DIR=/path/to/Rocket.Chat
scripts/e2ee-search-harness/run-all.sh
```

`run-all.sh` starts the server, resets its database, seeds the test world,
and runs the packaged test. The first run also builds the app. Use
`run-all.sh --reuse` to keep the server and the world of the last seed.

Each step also runs alone:

```sh
scripts/e2ee-search-harness/server.sh up|down|status|reset [CORE_DIR] [PORT]
node scripts/e2ee-search-harness/seed.mjs [--port PORT]
scripts/e2ee-search-harness/build-macos.sh
scripts/e2ee-search-harness/macos-packaged.sh [path/to/Rocket.Chat.app]
node scripts/e2ee-search-harness/seed.mjs --world win
scripts/e2ee-search-harness/windows-packaged.sh [--build]
```

- `server.sh up` starts MongoDB and the server in the background, makes the
  admin user, skips the setup wizard, and waits for `/api/info`. Then the
  step `client-ready` loads the page, the client entry and the files of the
  search worker once. Vite compiles the client on the first request, and a
  missing worker build fails here.
  `server.sh down` stops only the processes that `up` started.
  `server.sh reset` deletes only the database of that server.
- `seed.mjs` makes the test world. If the world exists, it does nothing. If
  the users exist but the state file does not know the world, it fails. Then
  run `server.sh reset`. `--world <name>` makes a separate world on the same
  server (see [The test world](#the-test-world)).
- `build-macos.sh` builds `$DESKTOP_DIR` into the state folder. Run it again
  after you change the desktop code.

## The test world

- Settings: E2EE on, local search allowed, two-factor login off, rate
  limits off.
- User A (`harnessalice`) is the desktop user. User B (`harnessbob`) is the
  peer.
- The web client in headless Chrome makes the E2E keys of A and B. The E2E
  password of each user goes to the state file only.
- The encrypted private group `harness-e2ee-room`. B creates it and then
  invites A, so the client of B gives A the room key:
  - B sends `harnessneedlebravo` (the oldest message), then
    `harnessneedlecharlie`.
  - A sends `harnessneedlealpha`.
  - B sends a file with the caption `harnessneedlefile` (the newest message).
  - The seed checks that the server stores each of these messages as `e2e`
    ciphertext.
- The plain public channel `harness-plain-room` has the control word
  `harnesscontrolplain`. That word must never go into the local index.

`seed.mjs --world <name>` makes a separate world with the same layout. The
name replaces the prefix `harness` in each user, room and word. For example,
`--world win` gives the users `winharnessa` and `winharnessb`, the rooms
`win-e2ee-room` and `win-plain-room`, and the words `winneedlebravo` and
`wincontrolplain`. The state file keeps the default world in `users` and
`worlds.<port>`, and a named world in `worldUsers.<name>` and
`worlds.<port>-<name>`. A seed or a test of one world never changes another
world.

`server.sh reset` deletes the database, so it deletes every world of that
server. `run-all.sh` without `--reuse` does a reset. It seeds and tests only
the default world. The next `windows-packaged.sh` run seeds its world again.

## The packaged test

The test deletes the user data and the logs of `$APP_NAME` and starts the
app with `open -g`. It adds the server and logs A in. Before it enters A's
E2E password, it runs the check `g`. Then it enters the password and turns on "Index my encrypted messages on this device" in
Account > Security. The harness makes no index writes. Only the real history
crawler of the web client fills the index. The crawler does not wait for idle
time: it also runs while the user is active.

Each check prints one line:

| Line      | Meaning                                                                                                                                                                                                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `g`       | Before E2E unlock, a bridge open (`RocketChatDesktop.e2eeSearch.open`) with the user id and no wrap key returns `locked: true`, because A has an E2EE key on the server. A bridge search then fails with `E2EE search index is locked`. The profile has no `e2ee-search` file (no index file and no key file).                                                                                      |
| `a`       | A bridge search (`RocketChatDesktop.e2eeSearch.search`) for each needle returns the id of its seeded message. The control word returns no hit.                                                                                                                                                                                                                                                      |
| `b`       | The search panel of the encrypted room shows the hit for the oldest needle. The run folder gets a crop of the panel (`search-panel.png`).                                                                                                                                                                                                                                                           |
| `c`       | After a SIGTERM that the app handles without a forced kill, and a restart, the main log says `index opened { store: 'file' }`, and the main process reports the index as `encrypted`. A bridge search finds the oldest needle, with documents in the index. The hit comes from the saved index (see below). No history response of the web client up to the hit holds the id of the needle message. |
| `d`       | The same as `c`, after a SIGKILL.                                                                                                                                                                                                                                                                                                                                                                   |
| `e`       | A canary scan of the whole profile and of the logs finds no copy of any needle. A scan for the server address finds copies, which proves that the scan works. A failed line tells where the hits are.                                                                                                                                                                                               |
| `e.index` | The same scan, counted only in the search index folder.                                                                                                                                                                                                                                                                                                                                             |
| `f`       | The hash of the production keychain item `Rocket.Chat Safe Storage` is the same before and after, both reads succeeded, and no keychain dialog showed.                                                                                                                                                                                                                                              |

The checks `c` and `d` do not depend on the pace of the crawler. The web
client puts a message into the index only after it gets the message from the
server. So the hit after a restart comes from the saved index, or from a
history response of this run that holds the needle. The driver
(`app.mjs after-restart`, with `restart-proof.mjs`) proves that no such
response arrived:

- It starts before the app and connects to the CDP port as soon as the port
  opens. CDP auto-attach holds each new target, also the server webview,
  until the driver turns on the Network domain for it. So the driver sees
  the first request of the web client.
- It reads the body of each history response (`chat.syncMessages`,
  `loadHistory`, `loadSurroundingMessages`, `loadNextMessages`,
  `chat.getMessage`) and each WebSocket frame from the server.
- It searches the oldest needle and waits 2 seconds more for late events.
  Then it checks every response and frame that arrived up to the hit plus
  those 2 seconds.

The check fails in each of these cases:

- A response or a frame holds the needle id.
- The driver cannot read a response body.
- The driver attached to the webview after the webview started, or it saw no
  document load of the webview. Then it cannot prove that it saw the first
  request.

The line shows the count of history responses before the hit, the count
with the needle id, and the reasons of a failure.

The last line is `SUMMARY PASS` or `SUMMARY FAIL`, with the run folder. The
exit code is 0 only when every check passes. The run folder,
`.localdev/e2ee-search-harness/runs/<timestamp>/`, holds the JSON output of
each step, `main.log`, the canary scan results and the screenshot.

## The browser test

`browser-flow.mjs` runs the full user flow of the web client in a real
browser. The index uses the browser backend: the SQLite WASM worker and a
sealed copy in OPFS. It needs no desktop app.

```sh
node scripts/e2ee-search-harness/browser-flow.mjs --port 3860 \
  --state-dir <harness state dir> --core-dir <Rocket.Chat checkout> \
  [--browser /Applications/Firefox.app/Contents/MacOS/firefox] [--headful]
```

Start the server with `server.sh up` and seed it with `seed.mjs`,
`seed-large.mjs` and `seed-rooms.mjs` first. The core checkout must have the
browser backend. The test starts the browser with a throwaway profile and
deletes it at the end. The default is headless. `--headful` shows a window,
so that the persistent-storage prompt of the browser shows. The test then
takes screenshots of that window only (it compiles `winid.swift` for this).

Each step prints one line: `s1-login`, `s2-unlock`, `s3-opt-in`, `s4-index`
(progress until done), `s5-search` (`orcamento` finds `orçamento`, and a click
jumps to the message), `s6-send`, `s6-edit`, `s6-delete`, `s7-reload` (after a
reload, the hit for the oldest needle of the large room comes from the saved
copy, see below), `s8-mongo` (ciphertext only) and `s8-opfs` (the copy is sealed and holds no test word). The last
line is `SUMMARY PASS` or `SUMMARY FAIL`. The exit code is 0 only when every
step passes. The run folder is
`.localdev/e2ee-search-harness/browser-runs/<timestamp>/`.

The scripts that run code in the page get the module of the E2E client
through `e2e-module.mjs`. On the Vite dev server, the page imports the
source file through its `/@fs/` URL. On a Meteor-built client, the page uses
the Meteor `require`.

`s7-reload` uses the same proof as the checks `c` and `d` of the packaged
test, with a different recorder. WebDriver BiDi in puppeteer cannot read
response bodies. So a script runs in each document before the scripts of the
page. It wraps `fetch` and `XMLHttpRequest`, and keeps each history response
with its body (`restart-proof.mjs`). The step passes only when no response
after the reload holds the id of the needle message. The check covers each
response that arrived up to the hit, plus 2 seconds. Each history response that the network
events of the browser show must have a twin in that recording. Otherwise the
step fails, because the page recorder missed a response. The browser
recorder does not see WebSocket frames.

`seed.mjs` sets the crawler pacing on the server. The crawler fetches one
page every second (`HARNESS_BACKFILL_PAUSE_S`; the server default is 12
seconds), so the index step is shorter than with the server default. Its
duration is not measured yet. The page size and the per-room limit keep the
server defaults unless `HARNESS_BACKFILL_PAGE_SIZE` or
`HARNESS_BACKFILL_MAX_PER_ROOM` is set. A core that does not know these
settings keeps its own pacing, and `seed.mjs` prints a warning.

## Windows

`windows-packaged.sh` runs on the Mac and drives a Windows 11 x64 host over
SSH. The host needs OpenSSH Server with a key login, Node.js 22.18 or later,
and `tar.exe` (Windows 10 and later have it). It needs no Visual Studio: the
native modules come as prebuilt binaries.

| Variable           | Default                  | Use                                       |
| ------------------ | ------------------------ | ----------------------------------------- |
| `WINDOWS_HOST`     | none (required)          | SSH destination (`user@host` or an alias) |
| `WINDOWS_DIR`      | `C:\e2ee-search-harness` | Work folder on the host, no spaces        |
| `WINDOWS_NODE_DIR` | none                     | Folder of `node.exe`, if PATH has no node |
| `WINDOWS_CDP_PORT` | `9446`                   | Remote debugging port of the app          |
| `WINDOWS_WORLD`    | `win`                    | Name of the test world                    |

Start the server first (`server.sh up`). Then run:

```sh
export WINDOWS_HOST=user@windows-host
scripts/e2ee-search-harness/windows-packaged.sh --build
```

- The script seeds the world `win` when the world does not exist. It never resets the
  server, so the macOS world stays.
- With `--build`, or when the host has no build, it copies the working tree
  of `$DESKTOP_DIR` to the host. That is the tracked files and the untracked
  files that git does not ignore. Then it runs `yarn install`, the
  production build and `electron-builder --win dir --x64` there. Run it with
  `--build` again after you change the desktop code.
- One SSH connection holds two tunnels. The host reaches the server as
  `localhost:$HARNESS_PORT`, and the Mac reaches the CDP port of the app.
  So `HARNESS_HOST` must be `localhost` or `127.0.0.1`.
- The app runs with `--user-data-dir=$WINDOWS_DIR\profile` and the product
  name `$APP_NAME`. The script deletes only that profile and the folder
  `%APPDATA%\$APP_NAME`. It never touches another Rocket.Chat app on the host.
- The helpers in `windows/` run on the host in Windows PowerShell. The
  script copies them to `$WINDOWS_DIR\harness` at each run.

The checks are the same as in the macOS test, with these changes:

| Line      | Meaning on Windows                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `g`       | The same as on macOS. The count of `e2ee-search` files covers `$WINDOWS_DIR\profile` and `%APPDATA%\$APP_NAME`.                                                                                                           |
| `c`       | The app closes through CDP (`Browser.close`) instead of a SIGTERM.                                                                                                                                                        |
| `d`       | `Stop-Process -Force` ends every process of the app instead of a SIGKILL.                                                                                                                                                 |
| `e`       | The scan covers the profile and `%APPDATA%\$APP_NAME`.                                                                                                                                                                    |
| `f.dpapi` | Replaces `f`. The profile has one `key.bin`. The key in `Local State` is DPAPI-protected, and DPAPI opens it. That key opens `key.bin` (AES-GCM, prefix `v10`). The plaintext starts with `kw1.`, and `key.bin` does not. |

The run folder is `.localdev/e2ee-search-harness/runs/win-<timestamp>/`.

## Step log and watchdog

Each script of the harness runs its work in steps. The server start, each
part of each seed and each step of `browser-flow.mjs` are steps. In the
packaged tests, the build, the app start and each check are steps. Each step
prints a start line and an end line on stderr:

```text
[12:01:02] STEP start seed-rooms/dm/send (expected ~29s, limit 300s, count=200)
[12:01:32] STEP slow seed-rooms/dm/send 30s (expected ~29s, limit 300s)
[12:01:34] STEP done seed-rooms/dm/send 31.6s (expected ~29s)
[12:05:40] STEP FAIL seed-rooms/dm/key-to-a timeout after 180s (expected ~10s)
[12:06:10] STEP FAIL macos-packaged/setup exit code 1 after 41.2s (expected ~30s)
```

- After the expected time, a `STEP slow` line comes every 20 seconds while the
  step runs. Then you can see that the step is alive or stuck.
- The expected time is the median of the last 10 runs of the step. A step
  with no runs uses the `expectedS` of its entry in `step-timings.json`, else
  the default in the code.
- The limit is the larger of the default limit of the step and 4 times the
  expected time. A limit that a script had before (for example
  `SERVER_WAIT_S`, `INDEX_TIMEOUT_S` or `--index-timeout-s`) is now the default
  limit of its step.
- Past the limit, the step fails with `STEP FAIL ... timeout`. Then the
  script stops the processes that it started. A packaged test stops the app
  and prints the summary. The exit code is not 0. It is 124 when nothing else
  sets the code.
- A failed step does not go into the history.

| Variable                    | Default | Use                                                                  |
| --------------------------- | ------- | -------------------------------------------------------------------- |
| `HARNESS_STEP_LIMIT_SCALE`  | `1`     | Multiplies every limit. Use `2` on a slow machine.                   |
| `HARNESS_STEP_SLOW_EVERY_S` | `20`    | Seconds between two `STEP slow` lines                                |
| `HARNESS_STEP_CLEANUP_S`    | `30`    | Longest time for the cleanup of a Node script after a timeout        |
| `HARNESS_STEP_TIMINGS`      | none    | Another timings file, for example for a test that must not change it |

The files:

- `scripts/e2ee-search-harness/step-timings.json` is the history. Git tracks
  it, so each machine and each agent uses the same expected times. The key of
  an entry is the step, the platform (`darwin`, `win32` or `linux`), and the
  parameters that change the time, for example
  `macos-packaged/wait-index darwin pause=1` or
  `seed-rooms/pt/send darwin count=1000`. Each run writes the file. The person
  or agent that runs the harness decides whether to commit the change. The
  first entries have no runs. Their `expectedS` is the default in the code, or
  the median of earlier runs when their logs had the time.
- `.localdev/e2ee-search-harness/steps.log` gets every step line of every
  script. The run folder of a packaged test or of `browser-flow.mjs` gets its
  own `steps.log` too. These logs are run state, not history: Git ignores them.
- `.localdev/e2ee-search-harness/current-step.json` holds each step that runs
  now: the script, the step, the start time, the expected time, the limit and
  the process id. It is also run state.

Watch a run from another terminal:

```sh
tail -f .localdev/e2ee-search-harness/steps.log | grep --line-buffered STEP
cat .localdev/e2ee-search-harness/current-step.json
```

Run the self-test of the step helper:

```sh
node --test scripts/e2ee-search-harness/steps.test.mjs
```

## Known limits

- The canary scan cannot see a token inside compressed data, for example a
  snappy block of LevelDB. A clean scan is weaker evidence there.
- The packaged tests are for macOS and Windows x64. There is no Linux
  packaged test.
- When a keychain dialog shows, the test stops. Do not click "Always Allow".
  Report the dialog.
