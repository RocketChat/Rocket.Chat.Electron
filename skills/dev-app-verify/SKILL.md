---
name: dev-app-verify
description: Drive and screenshot the running Rocket.Chat Desktop dev app (yarn start) through the main-process inspector on port 9339. Use the scripts/cdp.mjs CLI. It evaluates in the main process or in a server webview, adds a server, logs in and reloads a webview. It also triggers menu items (Simulate Download/Update), captures screenshots and quits cleanly. Use whenever a UI change needs runtime or visual verification that component tests cannot see (paint, clipping, colors, animation, layout).
---

# Verify UI in the running dev app

`yarn start` starts Electron with `--inspect=9339`. This is the
main-process Node inspector. The app has **no renderer CDP port**. Every step
below drives the app through that socket: real menus, real Redux, real paint.

This skill drives the local macOS dev machine. Its commands (`pkill`, `/tmp`
paths) are macOS-specific by design. It has no Windows variants.

## When to use

- A UI change needs visual proof. Component tests cannot see paint. A clipped
  SVG passes every DOM assertion.
- You need to run the simulate flows (`Simulate Download` /
  `Simulate Update Flow`) and screenshot them at specific progress points.
- You need computed styles, bounding boxes, or DOM structure from the live
  renderer.

## Before connecting: the four pitfalls

1. **Watcher restarts kill everything.** The rollup watcher restarts the
   whole app when ANY bundle rebuilds, including after a subagent's last
   file save. Before a timing-sensitive run, wait until the `yarn start` log
   shows no `bundles src/` or `Restarting main process` lines for 12–15s. A
   builder's "finished" report can arrive before its final saves reach the
   watcher.
2. **Occluded windows lie.** macOS stops painting occluded windows, and
   `capturePage` returns the last painted frame. Screenshots freeze while the
   DOM moves. Always call `win.show(); win.focus()` before a capture.
3. **Singleton wedges.** If the inspector port refuses connections while an
   Electron process exists, two instances raced the SingletonLock. To
   recover, run `pkill -9 -f "<worktree-name>"`, wait, then start a single
   fresh `yarn start` (cold boot ≈ 30s).
4. **Background `gitnexus analyze` interferes.** While it runs, it mutates
   worktree git state and touches watched files. It can restart the app
   mid-verification (phantom `bundles src/` rebuilds). It can also silently
   drop freshly staged files from the git index. Do not reindex during a
   verification run. When you reindex, use
   `node .gitnexus/run.cjs analyze --index-only`.

## The script: `scripts/cdp.mjs`

Use `skills/dev-app-verify/scripts/cdp.mjs` for every inspector call. Do not
write your own inspector helper. The script is plain Node ESM with no
dependencies. It needs Node 22 or later (global `fetch` and `WebSocket`).
Run it from the repository root:

```sh
CDP=skills/dev-app-verify/scripts/cdp.mjs
node $CDP --help
```

| Command | What it does |
| --- | --- |
| `main '<expr>'` | Evaluates in the main process and prints the result as JSON. |
| `webview <url-part> '<expr>'` | Runs JS in the page of the one server webview whose URL includes `<url-part>`. |
| `add-server <url>` | Opens the add-server view, fills the form, submits it, and waits for the new webview. |
| `login <url-part>` | Logs in on that webview with `DEV_APP_USER` and `DEV_APP_PASSWORD`. |
| `reload-webview <url-part>` | Reloads that webview from the root window. |
| `quit` | Calls `app.quit()` and waits until the port closes and the process exits. |

Options and exit codes:

- `--port <n>` sets the inspector port. The default is 9339.
- `--timeout <ms>` sets the time limit of one command. The default is 30000.
- Put `--` before an expression that starts with `--`.
- Exit code 0 is success. Exit code 1 is a failure: an exception, a timeout,
  no matching webview, or no inspector. Exit code 2 is a usage error.
- The script prints errors on stderr with a `cdp:` prefix.

### `main` and `webview` expressions

- Give an expression (`electron.app.getVersion()`) or a function body that
  uses `return`. `await` works in both forms.
- In `main`, `require` and `electron` are in scope. The script binds
  `require` to `process.mainModule.require`, because bare `require` is
  missing in the inspector scope.
- The result must survive JSON. A `BrowserWindow` or a DOM node does not.
  Return plain values.
- An exception prints its stack and exits 1. A timeout exits 1. The code can
  still run in the app after a timeout.
- `webview` exits 1 when no webview URL or more than one webview URL includes
  `<url-part>`. It then lists every webview URL. An empty entry is a webview
  that has not committed a page yet. For example, its server is down.
- A webview exists only for a server that the app loaded. To load a server,
  select it with its menu item. The menu item id is the server URL:

  ```sh
  node $CDP main 'electron.Menu.getApplicationMenu().getMenuItemById("https://open.rocket.chat/").click(); return "clicked"'
  ```

- To list the webview URLs:

  ```sh
  node $CDP main 'electron.webContents.getAllWebContents().filter((wc) => wc.getType() === "webview").map((wc) => wc.getURL())'
  ```

### Root window

The root window is the one `BrowserWindow` that loads `app/index.html`
(`src/ui/main/rootWindow.ts`). The Settings, Downloads, Log Viewer and other
windows load their own `app/*-window.html`, and none of them has a parent.
In a live test, `getAllWindows()` listed the newest window first, and a
parent or title test returned an open Downloads window. Use this exact
expression. Do not re-derive it:

```js
electron.BrowserWindow.getAllWindows().find(
  (w) => !w.isDestroyed() && w.webContents.getURL().includes('/app/index.html')
)
```

Use it only after the app creates the root window. During startup, a hidden
temporary window also loads `app/index.html` until the root window replaces
it.

### Recipes

Un-occlude the root window, so that paint and `capturePage` are live:

```sh
node $CDP main 'const w = electron.BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.getURL().includes("/app/index.html")); w.show(); w.focus(); return "ok"'
```

Trigger a real flow through a menu item id. Assert the gate and the item
before you click. A missing or disabled item does nothing, and the call still
returns `clicked`:

```sh
node $CDP main '
const menu = electron.Menu.getApplicationMenu();
if (!menu?.getMenuItemById("developerMode")?.checked) throw new Error("developerMode gate is off");
const item = menu.getMenuItemById("simulateDownload");
if (!item) throw new Error("simulateDownload menu item not found");
if (!item.enabled) throw new Error("simulateDownload menu item is disabled");
item.click();
return "clicked";'
```

Read renderer truth from the root window (computed styles before pixels for
diagnosis):

```sh
node $CDP main '
const w = electron.BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.getURL().includes("/app/index.html"));
return w.webContents.executeJavaScript(`(() => {
  const b = document.querySelector("button[data-downloads-status]");
  return { status: b?.getAttribute("data-downloads-status"), rect: b && b.getBoundingClientRect().toJSON() };
})()`);'
```

Screenshot a region. Write the PNG to a readable path, then read it:

```sh
node $CDP main '
const w = electron.BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.getURL().includes("/app/index.html"));
w.show(); w.focus();
const [width] = w.getContentSize();
const img = await w.webContents.capturePage({ x: Math.max(0, width - 420), y: 0, width: 420, height: 34 });
require("fs").writeFileSync("/tmp/ui_check.png", img.toPNG());
return "ok";'
```

Read a server page:

```sh
node $CDP webview open.rocket.chat '({ title: document.title, readyState: document.readyState })'
```

### `add-server`

- The command clicks the `addNewServer` menu item, fills the URL, and clicks
  Connect. It waits for a new server webview and prints its URL.
- It does not submit when a root `<webview>` partition already includes the
  host of the URL. Each server webview has the partition
  `persist:<server url>`. The command then prints `alreadyAdded`.
- It refuses to submit when the form did not keep the typed URL. An empty
  form adds the default server `https://open.rocket.chat/`.
- A rejected URL exits 1 with the form error text.
- Adding a server writes to the dev profile. See "Dev profile" below.

### `login`

- Set `DEV_APP_USER` and `DEV_APP_PASSWORD` in the environment. The script
  has no default credentials. It replaces the password with `***` in all
  output.
- The command waits for the login form, fills it, and submits it. Success is
  a login token in the page's `localStorage` and no login form.
- When the page already has a token and no form, the command prints
  `alreadyLoggedIn` and submits nothing.
- The command does not answer a two-factor prompt. It exits 1 and prints the
  dialog text. Use a user without two-factor authentication.
- Use a dedicated test user for each run. A helper that calls `users.logout`
  on a shared admin removes all of that user's tokens on the server. The
  stored resume token then fails, and the web client removes its login keys.
  That looks exactly like a desktop session bug.

### `reload-webview`

- Do NOT send CDP `Page.reload` to a webview target. That reloads the root
  window and rebuilds the webview. It also causes "Server view became
  unresponsive" stalls.
- The command calls `<webview>.reload()` on the matching element of the root
  renderer. It finds the element by `getWebContentsId()`.
- It waits until the page has a new `performance.timeOrigin` and stops
  loading. It exits 1 when the root window `performance.timeOrigin` changed.
- "Reloaded" means the document finished loading. The web client can still
  be booting. Poll the page with `webview` for the state that you need.
- To read Redux state from the root renderer, walk the root React fiber for
  `memoizedProps.store`.

### `quit`

- The command calls `app.quit()` and closes its inspector socket at once. The
  app waits for open debugger sessions before it exits.
- It then waits until the port closes and the main process exits. It kills
  nothing.
- Dev-mode quit can hang, for example while another inspector client stays
  connected. The command then exits 1 and tells you what is still open.
- A hang with 0% CPU is often a deadlock in the dev-only chokidar watcher.
  On 2026-10-26 the main thread stopped in Node teardown, in
  `fse_instance_destroy` (`fsevents.node`) →
  `napi_release_threadsafe_function` → `uv_mutex_lock`. It did not recover.
  To find it, run `sample <pid> 2` and find `fse_instance_destroy` in the
  main thread. The `yarn start` runner sends SIGKILL 2.5 s after its own
  quit request, so a normal restart hides this hang.
- Do NOT kill the app while it quits. Quit takes 0.5–16 s. A kill can tear the
  last record of the Local Storage leveldb log. After that, leveldb silently
  drops every later write, and each new login token is lost. The sign is
  `Corruption: checksum mismatch` in the profile's Local Storage
  `leveldb/LOG`. Discard such a profile.
- The `yarn start` watcher keeps running after a quit. Its next rebuild
  starts a new app.

## Gotchas

- In the main-process inspector sandbox, bare `require` may be missing. Use
  `process.mainModule.require('electron')`. The `main` command does this for
  you.
- To drive a Developer-menu toggle, call
  `Menu.getApplicationMenu().getMenuItemById('<id>').click()`. The ids are
  `developerMode`, `simulateUpdate`, `simulateDownload` and
  `simulateDisconnected`.
- The `Tray` instance is module-scoped and CDP cannot reach it. To open the
  tray menu, use a real click. `osascript`/System Events clicks need
  Accessibility permission for the terminal app (error -25211 otherwise).
  `screencapture -x` + `sips -c` crops need no permission and show the icon
  itself.
- `yarn start` relaunches Electron once per bundle for ~60 s. Wait for
  `waiting for changes` before you take screenshots.

## Useful recipes

- **Real download with known size** (slow mirror, good for watching the
  ring): first grab a cancel handle, then call
  `wc.downloadURL('https://proof.ovh.net/files/1Gb.dat')` on a webview's
  webContents (`wc.session.once('will-download', (e, item) => { globalThis.__t = item; })`).
  When done, cancel with `globalThis.__t.cancel()`.
- **DOM truth beats screenshots for diagnosis.** `getBoundingClientRect` of
  svg children against their svg viewport catches clipping that looks like
  "missing artwork". `getComputedStyle(...).stroke/opacity/transition`
  catches token and animation regressions.

## Dev profile

- The dev instance uses the `Rocket.Chat (development)` userData profile. Its
  persisted settings live in that profile's `config.json`. They include the
  servers, the selected server, the theme and
  `navigationLayout: 'tabs' | 'sidebar' | 'hidden'`.
- To switch the layout under test, edit the file and restart. TopBar layouts
  render only with `sidebar` or `hidden`.
- `add-server`, `login` and a server selection change this profile. Restore
  the selected server when you finish.
