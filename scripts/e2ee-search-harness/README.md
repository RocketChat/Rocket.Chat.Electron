# E2EE local search harness

This harness tests the local search of encrypted messages end to end. It
uses a packaged macOS build of the desktop app and a real Rocket.Chat
server. The web client of the server makes the E2E keys, sends the encrypted
messages and runs the history crawler. The desktop app keeps the encrypted
index. The harness drives everything through REST, headless Chrome and the
Chrome DevTools Protocol (CDP). It never moves the mouse and never takes the
focus.

## Prerequisites

- macOS (the packaged test only). The server part also runs on Linux.
- Node.js 22.18 or later (the Volta pin of this repository). The canary scan
  imports a `.ts` file.
- `yarn install` in this repository. The seed script uses its `puppeteer`.
- A Rocket.Chat checkout of the companion branch, with its dependencies
  installed and its packages built (`yarn && yarn build` in that checkout).
  The harness runs `yarn dev` in `apps/meteor` of that checkout, with a
  MongoDB from the Meteor dev bundle.
- Optional: a Developer ID Application identity in the keychain. Without one,
  set `MAC_SIGN=adhoc`. macOS can then show a keychain dialog, and the test
  stops when one shows.

## Configuration

Each value is an environment variable. You can also put the values in
`.localdev/e2ee-search-harness/env`, which the scripts read.

| Variable              | Default                         | Use                                        |
| --------------------- | ------------------------------- | ------------------------------------------ |
| `ROCKETCHAT_CORE_DIR` | none (required)                 | The Rocket.Chat checkout                   |
| `HARNESS_PORT`        | `3500`                          | Server port. MongoDB uses the next port.   |
| `DESKTOP_DIR`         | this repository                 | The desktop checkout to build the app from |
| `APP_NAME`            | `Rocket.Chat R3m`               | Product name of the test app               |
| `CDP_PORT`            | `9444`                          | Remote debugging port of the test app      |
| `HARNESS_STATE_DIR`   | `.localdev/e2ee-search-harness` | State, logs and runs                       |
| `SERVER_WAIT_S`       | `1200`                          | Longest wait for the server to answer      |
| `INDEX_TIMEOUT_S`     | `600`                           | Longest wait for the crawler               |

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
```

- `server.sh up` starts MongoDB and the server in the background, makes the
  admin user, skips the setup wizard, and waits for `/api/info`.
  `server.sh down` stops only the processes that `up` started.
  `server.sh reset` deletes only the database of that server.
- `seed.mjs` makes the test world. If the world exists, it does nothing. If
  the users exist but the state file does not know the world, it fails. Then
  run `server.sh reset`.
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

## The packaged test

The test deletes the user data and the logs of `$APP_NAME` and starts the
app with `open -g`. It adds the server, logs A in, and enters A's E2E
password. Then it turns on "Index my encrypted messages on this device" in
Account > Security. The harness makes no index writes. Only the real history
crawler of the web client fills the index. The crawler starts after 60
seconds without input.

Each check prints one line:

| Line      | Meaning                                                                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `a`       | A bridge search (`RocketChatDesktop.e2eeSearch.search`) for each needle returns the id of its seeded message. The control word returns no hit.                                                                                                                                       |
| `b`       | The search panel of the encrypted room shows the hit for the oldest needle. The run folder gets a crop of the panel (`search-panel.png`).                                                                                                                                            |
| `c`       | After a SIGTERM and a restart, the main log says `index opened { store: 'file' }`, and the main process reports the index as `encrypted`. A bridge search finds the oldest needle, with documents in the index, less than 60 seconds after the start, so before the crawler can run. |
| `d`       | The same as `c`, after a SIGKILL.                                                                                                                                                                                                                                                    |
| `e`       | A canary scan of the whole profile and of the logs finds no copy of any needle. A scan for the server address finds copies, which proves that the scan works. A failed line tells where the hits are.                                                                                |
| `e.index` | The same scan, counted only in the search index folder.                                                                                                                                                                                                                              |
| `f`       | The hash of the production keychain item `Rocket.Chat Safe Storage` is the same before and after, and no keychain dialog showed.                                                                                                                                                     |

The last line is `SUMMARY PASS` or `SUMMARY FAIL`, with the run folder. The
exit code is 0 only when every check passes. The run folder,
`.localdev/e2ee-search-harness/runs/<timestamp>/`, holds the JSON output of
each step, `main.log`, the canary scan results and the screenshot.

## Known limits

- The canary scan cannot see a token inside compressed data, for example a
  snappy block of LevelDB. A clean scan is weaker evidence there.
- The packaged test is for macOS only.
- When a keychain dialog shows, the test stops. Do not click "Always Allow".
  Report the dialog.
