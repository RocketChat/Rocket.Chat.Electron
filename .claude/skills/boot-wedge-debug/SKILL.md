---
name: boot-wedge-debug
description: Debug the intermittent Rocket.Chat Desktop webview boot wedge, where a workspace tab stays on the loading throbber forever ("loading infinito"). Read boot-watchdog forensic reports, run live CDP autopsies on wedged webviews, and map the findings to the next fix. Trigger when a workspace hangs on the throbber, when boot-watchdog.jsonl has entries, when the console shows "Cannot find module '/app/utils/rocketchat.info'", or when the user mentions wedge/throbber/boot travado.
---

# Boot Wedge Debug

Use this workflow to diagnose the intermittent webview boot wedge and to drive
it to a definitive fix. Fixes land iteratively on PR
[#3436](https://github.com/RocketChat/Rocket.Chat.Electron/pull/3436)
(`fix/injected-boot-recovery`).

## The bug in one paragraph

Sometimes a workspace webview never finishes booting: the Rocket.Chat throbber
spins forever. Its console shows `Cannot find module '/app/utils/rocketchat.info'`
(Meteor module registry incomplete) and often a ServiceWorker
`InvalidStateError`. A plain reload (⌘R = `webContents.reload()`) never cures
it. Historically only a full app restart did. `src/injected.ts` now
recovers automatically with a force reload that clears the service worker and
the cache (max 2 attempts, sessionStorage-guarded). At least one observed
wedge survived that recovery, so the broken state may live in the guest
renderer process itself. The planned escalation is to recreate the `<webview>`
(fresh renderer process).

## Step 1 — Read the watchdog report first

The dev-only boot watchdog (`src/servers/bootWatchdog.ts`) is enabled when
`NODE_ENV=development` or `ROCKETCHAT_BOOT_WATCHDOG=true`. It appends one JSON
line for each incident to:

```
macOS:   ~/Library/Logs/Rocket.Chat/boot-watchdog.jsonl
Windows: %USERPROFILE%\AppData\Roaming\Rocket.Chat\logs\boot-watchdog.jsonl
Linux:   ~/.config/Rocket.Chat/logs/boot-watchdog.jsonl
```

The directory is Electron's `app.getPath('logs')`. In dev the app name may be
`Electron` instead of `Rocket.Chat`. At startup the watchdog prints the exact
path: `[bootWatchdog] enabled — … appended to <path>`.

Summarize the incidents:

```bash
python3 -c "
import json
for l in open('$HOME/Library/Logs/Rocket.Chat/boot-watchdog.jsonl'):
    r = json.loads(l)
    print(r['ts'], r['reason'], r['serverUrl'], '| probe:', json.dumps(r.get('probe'))[:120])
"
```

Then read the interesting incident in full: `probe`, `timeline`,
`serviceWorkers`, `console` (last 150 webview messages), `processMetrics`.

### Reading the report

| Field                           | Wedge signature                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reason`                        | `boot-deadline-exceeded` = 90s without the version signal after a main-frame navigation. `injected-recovery-exhausted` = both auto-recoveries failed. `render-process-gone` / `unresponsive` = process-level death. |
| `probe.requireType`             | `"function"` + `probe.infoModule: "broken: …"` = module registry incomplete (the classic wedge). `"undefined"` = the page never reached Meteor.                                                                     |
| `probe.recoveryAttempts`        | The number of auto-recoveries that ran in this session (`null` = none).                                                                                                                                             |
| `probe.serviceWorkerControlled` | Whether a SW controls the page. Compare with `serviceWorkers` (running SWs in the session).                                                                                                                         |
| `timeline`                      | Look for `injected-recovery-triggered` → `did-navigate` → whether `server-version-updated` follows.                                                                                                                 |

A healthy boot never produces a report. The watchdog deliberately excludes
navigation failures that show an ErrorView (e.g. invalid TLS cert).

## Step 2 — Live autopsy (wedge currently on screen)

Do NOT restart the app. If you launched it with
`npx electron . --remote-debugging-port=9222` (preferred during this
investigation), probe the wedged webview from outside:

```bash
node .claude/skills/boot-wedge-debug/cdp-eval.mjs <server-host> "JSON.stringify({
  readyState: document.readyState,
  title: document.title,
  requireType: typeof window.require,
  infoModule: (()=>{try{return !!window.require('/app/utils/rocketchat.info').Info}catch(e){return 'broken: '+e.message}})(),
  recoveryAttempts: sessionStorage.getItem('rocketChatDesktopBootRecoveryAttempts'),
  swControlled: !!navigator.serviceWorker?.controller
})"
```

Also useful live:

- List targets: `curl -s http://127.0.0.1:9222/json | python3 -m json.tool`
- SW registrations: eval `navigator.serviceWorker.getRegistrations().then(rs => JSON.stringify(rs.map(r => r.scope)))`
- Test the manual cure ladder. Record which rung works, because it localizes the broken layer:
  1. menu **View → Reload** (plain reload — historically never cures)
  2. menu **View → Force reload** (menu item id `reloadClearingCache`, = what auto-recovery does)
  3. remove and re-add the workspace (recreates the `<webview>` → fresh renderer process)
  4. full app restart (historically always cures)

## Step 3 — Map findings to action

| Finding                                                       | Conclusion / next fix                                                                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rung 2 cures                                                  | SW/cache layer. Auto-recovery in `injected.ts` should have handled it. Find why it did not fire (counter exhausted? recovery log lines in the report console?).          |
| Only rung 3 or 4 cures                                        | The broken state lives in the renderer process. Implement or check the escalation: recreate the webview after the recovery attempts exhaust (see PR #3436 "next steps"). |
| `render-process-gone` reports                                 | Different class of bug. Check `details` in the timeline (reason: crashed/oom/killed) and processMetrics.                                                                 |
| Report shows recovery triggered then `server-version-updated` | Auto-recovery worked. Take no action: the system healed itself.                                                                                                          |

## Step 4 — Land the fix

1. Reproduce or justify the fix with report evidence. Quote the relevant timeline lines in the PR.
2. Fix on branch `fix/injected-boot-recovery` (worktree
   `../Rocket.Chat.Electron-worktrees/fix-injected-boot-recovery`).
3. Run `npx tsc --noEmit`, `yarn lint`, `yarn test` and `yarn build`.
   Then run a watchdog smoke test: run the app ≥150s with healthy servers. It
   must produce zero new reports (this guards against false positives).
4. Push. Update PR #3436 with a comment that describes what the report revealed
   and what changed. Log the incident and the fix in `.wolf/buglog.json`.

## Known gotchas

- `did-start-loading` fires for subframes and resources. Never use it to reset
  a boot cycle. It caused the first false positive of the watchdog. Cycles key
  on `did-navigate`.
- Injected-script `console.log` calls do NOT reach the main process log. Only
  warn and error are forwarded. The console buffer of the watchdog captures all
  levels.
- `WEBVIEW_SERVER_VERSION_UPDATED` is the boot-success signal. `setVersion`
  dispatches it from `setServerInfo` (wired in PR #3436 — it was dead code
  before).
- The re-render loop fix (PR #3435) is a separate branch. A `Maximum update
depth exceeded` storm in a build without it is that bug, not a regression.
