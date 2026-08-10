---
name: dev-app-verify
description: Drive and screenshot the running Rocket.Chat Desktop dev app (yarn start) through the main-process inspector on port 9339 — trigger menu items (Simulate Download/Update), evaluate in the renderer DOM, capture titlebar screenshots. Use whenever a UI change needs runtime/visual verification that component tests can't see (paint, clipping, colors, animation, layout).
---

# Verify UI in the running dev app

`yarn start` launches Electron with `--inspect=9339` (main-process Node
inspector; there is **no renderer CDP port**). Everything below drives the
app through that socket: real menus, real Redux, real paint.

This skill drives the local macOS dev machine — commands (`pkill`, `/tmp`
paths) are macOS-specific by design. No Windows variants.

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
const REQUEST_TIMEOUT_MS = 5000;
const failAllPending = (reason) => {
  for (const [i, { reject }] of pending) { reject(reason); pending.delete(i); }
};
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m); pending.delete(m.id); }
};
ws.onerror = (e) => failAllPending(new Error(`ws error: ${e.message || e}`));
ws.onclose = () => failAllPending(new Error('ws closed'));
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    const timer = setTimeout(() => {
      pending.delete(i);
      reject(new Error(`${method} timed out after ${REQUEST_TIMEOUT_MS}ms (watcher restart or dead socket?)`));
    }, REQUEST_TIMEOUT_MS);
    pending.set(i, { resolve: (m) => { clearTimeout(timer); resolve(m); }, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await new Promise((res, rej) => { ws.onopen = res; setTimeout(rej, 5000); });
await send('Runtime.enable');
const ev = async (expression) => {
  const r = await send('Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true });
  if (r.error) throw new Error(`CDP error: ${JSON.stringify(r.error).slice(0, 400)}`);
  if (r.result?.exceptionDetails)
    throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};
// `require` is NOT in eval scope — always go through process.mainModule.
const REQ = 'process.mainModule.require';
// Root window = the one BrowserWindow with no parent and not the log-viewer
// window (the only other unparented window `src/main.ts` creates). Reuse
// this exact expression for every operation below — do not re-derive it.
const ROOT_WINDOW = `${REQ}('electron').BrowserWindow.getAllWindows()
  .find((w) => !w.isDestroyed() && !w.getParentWindow()
    && w.getTitle() !== 'Log Viewer - Rocket.Chat')`;

// 1. Un-occlude so paint (and capturePage) is live
await ev(`(() => { const w = ${ROOT_WINDOW};
  w.show(); w.focus(); return 'ok'; })()`);

// 2. Trigger real flows via menu item ids (works for any getMenuItemById id).
//    Assert the gate + item are actually there before clicking — a missing
//    or disabled item would otherwise silently no-op and still print 'clicked'.
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
console.log(await ev(`(() => { const w = ${ROOT_WINDOW};
  return w.webContents.executeJavaScript(\`(() => {
    const b = document.querySelector('button[data-downloads-status]');
    return JSON.stringify({ status: b?.getAttribute('data-downloads-status'),
      rect: b && b.getBoundingClientRect().toJSON() });
  })()\`); })()`));

// 4. Screenshot a region (write PNG somewhere readable, then Read it)
await ev(`(() => { const w = ${ROOT_WINDOW};
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
