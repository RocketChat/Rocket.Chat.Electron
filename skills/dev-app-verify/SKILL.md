---
name: dev-app-verify
description: Drive and screenshot the running Rocket.Chat Desktop dev app (yarn start) through the main-process inspector on port 9339. Trigger menu items (Simulate Download/Update), evaluate in the renderer DOM, and capture titlebar screenshots. Use whenever a UI change needs runtime or visual verification that component tests cannot see (paint, clipping, colors, animation, layout).
---

# Verify UI in the running dev app

`yarn start` starts Electron with `--inspect=9339`. This is the
main-process Node inspector. There is **no renderer CDP port**. Every step
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

## The script

Run it in the context-mode sandbox (Bun has a global `WebSocket`) or in any
Bun runtime. Adapt the marked sections.

```javascript
const targets = await fetch('http://127.0.0.1:9339/json', {
  signal: AbortSignal.timeout(3000),
}).then((r) => r.json());
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const REQUEST_TIMEOUT_MS = 5000;
const failAllPending = (reason) => {
  for (const [i, { reject }] of pending) {
    reject(reason);
    pending.delete(i);
  }
};
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id).resolve(m);
    pending.delete(m.id);
  }
};
ws.onerror = (e) => failAllPending(new Error(`ws error: ${e.message || e}`));
ws.onclose = () => failAllPending(new Error('ws closed'));
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    const timer = setTimeout(() => {
      pending.delete(i);
      reject(
        new Error(
          `${method} timed out after ${REQUEST_TIMEOUT_MS}ms (watcher restart or dead socket?)`
        )
      );
    }, REQUEST_TIMEOUT_MS);
    pending.set(i, {
      resolve: (m) => {
        clearTimeout(timer);
        resolve(m);
      },
      reject,
    });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await new Promise((res, rej) => {
  ws.onopen = res;
  setTimeout(rej, 5000);
});
await send('Runtime.enable');
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.error)
    throw new Error(`CDP error: ${JSON.stringify(r.error).slice(0, 400)}`);
  if (r.result?.exceptionDetails)
    throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};
// `require` is NOT in eval scope — always go through process.mainModule.
const REQ = 'process.mainModule.require';
// Root window = the one BrowserWindow that loads `app/index.html`
// (`src/ui/main/rootWindow.ts`). The Settings, Downloads, Log Viewer and
// other windows load their own `app/*-window.html`, and none of them has a
// parent. In a live check, `getAllWindows()` listed the newest window first,
// and a parent or title check returned an open Downloads window. Use this
// exact expression for every operation below. Do not re-derive it.
// Run it only after the root window is created. During startup, a hidden
// temporary window also loads `app/index.html` until the root window replaces it.
const ROOT_WINDOW = `${REQ}('electron').BrowserWindow.getAllWindows()
  .find((w) => !w.isDestroyed()
    && w.webContents.getURL().includes('/app/index.html'))`;

// 1. Un-occlude so paint (and capturePage) is live
await ev(`(() => { const w = ${ROOT_WINDOW};
  w.show(); w.focus(); return 'ok'; })()`);

// 2. Trigger real flows via menu item ids (works for any getMenuItemById id).
//    Assert the gate and the item exist before you click. A missing or
//    disabled item would otherwise silently no-op and still print 'clicked'.
await ev(`(() => { const { Menu } = ${REQ}('electron');
  const menu = Menu.getApplicationMenu();
  const devMode = menu?.getMenuItemById('developerMode');
  if (!devMode?.checked) throw new Error('developerMode gate is off');
  const item = menu.getMenuItemById('simulateDownload');
  if (!item) throw new Error('simulateDownload menu item not found');
  if (!item.enabled) throw new Error('simulateDownload menu item is disabled');
  item.click();
  return 'clicked'; })()`);

// 3. Read renderer truth (computed styles > pixels for diagnosis)
console.log(
  await ev(`(() => { const w = ${ROOT_WINDOW};
  return w.webContents.executeJavaScript(\`(() => {
    const b = document.querySelector('button[data-downloads-status]');
    return JSON.stringify({ status: b?.getAttribute('data-downloads-status'),
      rect: b && b.getBoundingClientRect().toJSON() });
  })()\`); })()`)
);

// 4. Screenshot a region (write PNG somewhere readable, then Read it)
await ev(`(() => { const w = ${ROOT_WINDOW};
  const [width] = w.getContentSize();
  return w.webContents.capturePage(
    { x: Math.max(0, width - 420), y: 0, width: 420, height: 34 }
  ).then((img) => { ${REQ}('fs').writeFileSync('/tmp/ui_check.png', img.toPNG());
    return 'ok'; }); })()`);
ws.close();
```

## Gotchas

- In the main-process inspector sandbox, bare `require` may be missing. Use
  `process.mainModule.require('electron')`.
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
- The dev instance uses the `Rocket.Chat (development)` userData profile. Its
  persisted settings live in that profile's `config.json`. They include the
  theme and `navigationLayout: 'tabs' | 'sidebar' | 'hidden'`. To switch the
  layout under test, edit the file and restart. TopBar layouts render only
  with `sidebar` or `hidden`.
