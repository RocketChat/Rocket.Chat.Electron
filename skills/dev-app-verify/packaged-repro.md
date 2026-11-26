# Reproduce a field report with the packaged app

Use this runbook when a report comes from a real workspace and the dev build
is not needed. Examples: a released version misbehaves, or the bug depends on
the server's configuration. The packaged app accepts Chromium's
`--remote-debugging-port`, so every webview, the root window and the video
call window are CDP targets.

## Why not the dev build

- A dev build writes into the real `Rocket.Chat` profile folder (for example
  `supportedVersions.json`). The packaged app with a scratch
  `--user-data-dir` touches nothing of yours.
- One exception: the app log. `--user-data-dir` does not move it, so the
  scratch instance also writes to `~/Library/Logs/Rocket.Chat/main.log`.
  Cleanup does not delete those lines. Do not delete the shared log.
- The packaged app is the version the reporter runs. No watcher restarts
  interrupt the run.

## Steps

Run the commands from the repository root.

1. Check the version that the report names. Read
   `CFBundleShortVersionString` from
   `/Applications/Rocket.Chat.app/Contents/Info.plist`.
2. Make a private scratch folder and set the paths. `mktemp -d` makes a
   folder that only you can read. Keep the credentials and the token files in
   it too.

   ```sh
   SCRATCH="$(mktemp -d)"
   PROFILE="$SCRATCH/profile"
   LOG="$SCRATCH/app.log"
   PORT=9222
   CDP=skills/dev-app-verify/scripts/cdp.mjs
   mkdir "$PROFILE"
   ```

3. Put a `servers.json` in the profile: `{"<name>": "https://<workspace>"}`.
4. Make sure that the port is free. This command must print nothing. If it
   prints a listener, choose another `PORT`:
   `lsof -nP -iTCP:"$PORT" -sTCP:LISTEN`.
5. Start a second instance with that profile. A running instance with your
   real profile can stay open, because the single-instance lock is per
   profile.

   ```sh
   /Applications/Rocket.Chat.app/Contents/MacOS/Rocket.Chat \
     --user-data-dir="$PROFILE" --remote-debugging-port="$PORT" > "$LOG" 2>&1 &
   ```

6. Make sure that the port belongs to the scratch instance. Otherwise the
   commands act on another app. This command must print the scratch
   instance's command line:

   ```sh
   ps -o command= -p "$(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN)" \
     | grep -F -- "--user-data-dir=$PROFILE"
   ```

7. List the targets: `node $CDP --port "$PORT" targets`. Expect one
   `webview` per server and one `page` for the root window. Give `--port`
   to every later command.
8. Log in without typing a password into the UI.
   - Get a token from `POST /api/v1/login`. Keep the credentials and the
     token in files with mode 600. Never print them.
   - Write the token into the storage of the workspace's webview:
     `Meteor.loginToken`, `Meteor.userId` and `Meteor.loginTokenExpires`.
     Use `eval <workspace-host>`, and check the URL that `targets` shows. A
     preset server from `/Library/Preferences/Rocket.Chat/servers.json` also
     loads, and the app selects it first.
   - Reload with `location.reload()` inside the webview. Do not use
     `Page.reload` on a webview target. It reloads the root window.
9. Read the server state through the REST API before you act in the UI. Get
   the version from `/api/info`. Get the settings from
   `/api/v1/settings/<id>`.
10. Drive the UI with `node $CDP --port "$PORT" eval <target> '<expr>'`.
    `<target>` is a target id or a part of the target URL. The command
    stops when more than one page, webview or iframe URL contains it, and
    lists the targets.
11. Reach an iframe inside a webview (a video provider, for example) with
    `node $CDP --port "$PORT" frame <target> <frame-url-part> '<expr>'`.
    Such an iframe can share the webview's process, and then it has no
    target of its own. `frame` finds it in the webview's frame tree. The code
    runs in an isolated world: it sees the DOM and can call `postMessage`,
    but not the page's globals. Add `--main-world` to run in the page's own
    world. The command fails when the frame URL no longer contains
    `<frame-url-part>` at the time the code runs.
12. Clean up.
    - Log out the scratch session with `POST /api/v1/logout` and the token
      headers (`X-Auth-Token`, `X-User-Id`). A deleted token file does not
      end the session on the server.
    - Stop the scratch instance with
      `pkill -f -- "--user-data-dir=$PROFILE"`.
    - Delete the scratch folder: `rm -rf "$SCRATCH"`.

## Rules for actions on a real workspace

- Use a direct message with a bot (for example `rocket.cat`) for calls and
  messages. Do not use public rooms.
- Run a guard step and the action it guards as two separate calls. Check the
  guard's result before the action. Example: a script that must untick
  "Ring people" and then click Call. If the checkbox is not found, stop. Do
  not ring people by accident.

## Example: prove the video call close path

On server 9.x, the conference page closes the call window when the provider
plugin posts `rocketchat:videoconf/disconnected` with
`userInitiated: true`. To prove the desktop half without the provider:

```sh
node $CDP --port "$PORT" frame /conference/ <provider-host> '(async () => {
  window.parent.postMessage({ action: "rocketchat:videoconf/connected" }, "*");
  await new Promise((r) => setTimeout(r, 400));
  window.parent.postMessage(
    { action: "rocketchat:videoconf/disconnected", userInitiated: true }, "*");
  return location.origin;
})()'
```

The call window target must disappear from `targets`. The server must show the
leave in `/api/v1/video-conference.info?callId=<id>`.
