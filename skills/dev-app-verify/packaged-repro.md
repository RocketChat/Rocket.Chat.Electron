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
- The packaged app is the version the reporter runs. No watcher restarts
  interrupt the run.

## Steps

1. Check the version that the report names. Read
   `CFBundleShortVersionString` from
   `/Applications/Rocket.Chat.app/Contents/Info.plist`.
2. Make a scratch profile folder. Put a `servers.json` in it:
   `{"<name>": "https://<workspace>"}`.
3. Start a second instance with that profile. A running instance with your
   real profile can stay open, because the single-instance lock is per
   profile.

   ```sh
   /Applications/Rocket.Chat.app/Contents/MacOS/Rocket.Chat \
     --user-data-dir="$PROFILE" --remote-debugging-port=9222 > "$LOG" 2>&1 &
   ```

4. List the targets: `node cdp-eval.mjs --list`. Expect one `webview` per
   server and one `page` for the root window.
5. Log in without typing a password into the UI.
   - Get a token from `POST /api/v1/login`. Keep the credentials and the
     token in files with mode 600. Never print them.
   - Write the token into the webview's storage: `Meteor.loginToken`,
     `Meteor.userId` and `Meteor.loginTokenExpires`.
   - Reload with `location.reload()` inside the webview. Do not use
     `Page.reload` on a webview target. It reloads the root window.
6. Read the server state through the REST API before you act in the UI. Get
   the version from `/api/info`. Get the settings from
   `/api/v1/settings/<id>`.
7. Drive the UI with `cdp-eval.mjs`. Reach an iframe inside a webview (a
   video provider, for example) with `cdp-frame.mjs`.
8. Clean up. Stop the scratch instance with
   `pkill -f -- "--user-data-dir=$PROFILE"`. Delete the profile, the
   credentials and the token files.

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
node cdp-frame.mjs /conference/ <provider-host> -e '(async () => {
  window.parent.postMessage({ action: "rocketchat:videoconf/connected" }, "*");
  await new Promise((r) => setTimeout(r, 400));
  window.parent.postMessage(
    { action: "rocketchat:videoconf/disconnected", userInitiated: true }, "*");
  return location.origin;
})()'
```

The call window target must disappear from `--list`. The server must show the
leave in `/api/v1/video-conference.info?callId=<id>`.
