---
name: dev-app-verify
description: Drive and screenshot the running Rocket.Chat Desktop dev app (yarn start) through the main-process inspector on port 9339 — trigger menu items (Simulate Download/Update), evaluate in the renderer DOM, capture titlebar screenshots. Use whenever a UI change needs runtime/visual verification that component tests can't see (paint, clipping, colors, animation, layout).
---

# Verify UI in the running dev app

`yarn start` launches Electron with `--inspect=9339` (main-process Node
inspector; there is **no renderer CDP port**). Everything below drives the
app through that socket: real menus, real Redux, real paint.

## When to use

- A UI change needs visual proof (component tests can't see paint — a
  clipped SVG passes every DOM assertion).
- You need the simulate flows (`Simulate Download` / `Simulate Update Flow`)
  run and screenshotted at specific progress points.
- You need computed styles, bounding boxes, or DOM structure from the live
  renderer.

## Before connecting — the three pitfalls

1. **Watcher restarts kill everything.** The rollup watcher restarts the
   whole app when ANY bundle rebuilds (including after a subagent's last
   file save). Confirm the `yarn start` log shows no `bundles src/` /
   `Restarting main process` lines for 12–15s before any timing-sensitive
   run. A builder's "finished" report can arrive before its final saves hit
   the watcher.
2. **Occluded windows lie.** macOS stops painting occluded windows and
   `capturePage` returns the last painted frame — screenshots freeze while
   the DOM moves. Always `win.show(); win.focus()` before captures.
3. **Singleton wedges.** If the inspector port refuses connections while an
   Electron process exists, two instances raced the SingletonLock. Recovery:
   `pkill -9 -f "<worktree-name>"`, wait, single fresh `yarn start`
   (cold boot ≈ 30s).
4. **Background `gitnexus analyze` interferes.** While it runs it mutates
   worktree git state and touches watched files — it can restart the app
   mid-verification (phantom `bundles src/` rebuilds) and silently drop
   freshly staged files from the git index. Don't reindex during a
   verification run; when you do reindex, use
   `node .gitnexus/run.cjs analyze --index-only`.

## The script

Run with the context-mode sandbox (Bun has a global `WebSocket`) or any Bun
runtime. Adapt the marked sections.

```javascript
const targets = await fetch('http://127.0.0.1:9339/json',
  { signal: AbortSignal.timeout(3000) }).then((r) => r.json());
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(rej, 5000); });
await send('Runtime.enable');
const ev = async (expression) => {
  const r = await send('Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails)
    throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};
// `require` is NOT in eval scope — always go through process.mainModule.
const REQ = 'process.mainModule.require';

// 1. Un-occlude so paint (and capturePage) is live
await ev(`(() => { const { BrowserWindow } = ${REQ}('electron');
  const w = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  w.show(); w.focus(); return 'ok'; })()`);

// 2. Trigger real flows via menu item ids (works for any getMenuItemById id;
//    'developerMode' toggles the gate for the simulate items)
await ev(`(() => { const { Menu } = ${REQ}('electron');
  Menu.getApplicationMenu()?.getMenuItemById('simulateDownload')?.click();
  return 'clicked'; })()`);

// 3. Read renderer truth (computed styles > pixels for diagnosis)
console.log(await ev(`(() => { const { BrowserWindow } = ${REQ}('electron');
  const w = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  return w.webContents.executeJavaScript(\`(() => {
    const b = document.querySelector('button[data-downloads-status]');
    return JSON.stringify({ status: b?.getAttribute('data-downloads-status'),
      rect: b && b.getBoundingClientRect().toJSON() });
  })()\`); })()`));

// 4. Screenshot a region (write PNG somewhere readable, then Read it)
await ev(`(() => { const { BrowserWindow } = ${REQ}('electron');
  const w = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  const [width] = w.getContentSize();
  return w.webContents.capturePage(
    { x: Math.max(0, width - 420), y: 0, width: 420, height: 34 }
  ).then((img) => { ${REQ}('fs').writeFileSync('/tmp/ui_check.png', img.toPNG());
    return 'ok'; }); })()`);
ws.close();
```

## Useful recipes

- **Real download with known size** (slow mirror, good for watching the
  ring): grab a cancel handle first, then
  `wc.downloadURL('https://proof.ovh.net/files/1Gb.dat')` on a webview's
  webContents (`wc.session.once('will-download', (e, item) => { globalThis.__t = item; })`),
  cancel with `globalThis.__t.cancel()` when done.
- **DOM-truth beats screenshots for diagnosis**: `getBoundingClientRect` of
  svg children vs their svg viewport catches clipping that looks like
  "missing artwork"; `getComputedStyle(...).stroke/opacity/transition`
  catches token and animation regressions.
- The dev instance uses the `Rocket.Chat (development)` userData profile —
  its persisted settings (theme, `navigationLayout: 'tabs' | 'sidebar' |
  'hidden'`) live in that profile's `config.json`; edit + restart to switch
  the layout under test (TopBar layouts only render with `sidebar`/`hidden`).
