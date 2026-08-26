# Post-Mortem: Webview Boot Wedge & Startup Render Storm

## Objective

Eliminate two intermittent startup failures in Desktop 4.16.0-alpha: a
workspace webview that never finishes booting (the throbber spins forever,
only a full app restart cures it), and a `Maximum update depth exceeded`
error storm firing shortly after startup.

## Impact

- Users hitting the wedge saw a workspace tab stuck on the loading spinner
  indefinitely; plain reload (⌘R) did not cure it, so the only remedy was
  restarting the whole app. As of 4.16.0, the app detects the failure and
  auto-recovers with a cache-clearing reload (max 2 attempts per session).
- The error storm crashed `TabBar` rendering when it fired. Validation after
  the fix: 0 errors across the startup window, versus 10–14 errors in six
  consecutive pre-fix runs under the same account state.
- A forensic boot watchdog now captures a full autopsy (timeline, in-page
  probe, service-worker state, last 150 console messages) whenever a boot
  exceeds its deadline — so any future occurrence arrives with evidence
  attached instead of a verbal report.

## Timeline

### Attempt 1: Code-reading theories for the error storm (failed)

**What was done:** Two diagnostic passes attributed the storm to
platform-gated watchers and to `useDispatch` returning an unstable
reference.
**What went wrong:** An audit invalidated both: the watchers were gated to
platforms not in play, and `useDispatch` returns the store's stable
`dispatch`.
**Root cause of the failure:** Reasoning from code reading alone, without
runtime instrumentation, on an intermittent symptom. Plausible-looking
theories about a bug you cannot reproduce on demand are cheap to generate
and expensive to chase.

### Attempt 2: First dispatch-storm diagnosis (July 14, partially landed)

**What was done:** An instrumented run counted renderer dispatches: 1,140 of
1,314 were `webview/unread-changed`. `resolveBadge` in `src/injected.ts`
(introduced in PR #3369) called `setBadge` unconditionally on every
`unread-changed*` event, and 7.8.0+ servers stream one such event per room
at boot. A dedupe + trailing-edge debounce fix validated live: 101 errors
pre-fix → 0 post-fix on the dev instance.
**What went wrong:** Nothing technically — but the fix was validated locally
and not merged at the time, so the storm resurfaced during the August
4.16.0-alpha arc and had to be re-confirmed.
**Root cause:** The React 19 upgrade (#3384) enforces a stricter
nested-update budget than React 18, which had absorbed this pre-existing
high-frequency dispatch path — the hot path predated the upgrade; the
upgrade surfaced it.

### Attempt 3: Component-level re-render fixes — PR #3435 (partial)

**What was done:** Fixed five renderer defects: `ReparentingContainer`
per-render array deps, a selector defined inside `useServers`, a
`SupportedVersionDialog` setState churn, an unguarded `ResizeObserver` in
`useTabBarLayout`, and an in-place sort in `useSorting`.
**What went wrong:** The storm dropped from 119 errors to ~12 per startup
but did not disappear — these were real amplifiers, not the source.
**Root cause:** Each fix removed one amplification stage; the per-room event
flood feeding the pipeline was still upstream.

### Attempt 4: Boot-wedge auto-recovery + forensic watchdog — PR #3436

**What was done:** Root-caused the wedge's failure mode inside the app:
`injected.ts` requires `/app/utils/rocketchat.info` with 5 retries (~31s);
when the webview's Meteor module registry is incomplete, the retries exhaust
and the error escaped as an uncaught rejection — the entire injected script
died, and everything downstream (server info, notifications, unread badges,
presence, Outlook) never initialized. The app already shipped the right
remedy (`WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR`) but it was wired to only
one failure mode, with no attempt cap. The fix wires it to require-failure,
caps automatic recoveries at 2 per session via a `sessionStorage` counter,
and adds `.catch` handling to `start()`. The same PR shipped
`src/servers/bootWatchdog.ts`: dev-only (or `ROCKETCHAT_BOOT_WATCHDOG=true`)
forensic JSONL reports on boot-deadline-exceeded, render-process-gone,
unresponsive, and recovery exhaustion.
**What went wrong:** In the one live-observed wedge with the fix applied,
recovery fired correctly (`attempt 1 of 2` logged) — but the cache-clearing
reload did not cure that instance.
**Root cause (of the surviving wedge):** The broken state can live in the
guest renderer process itself, below the service-worker/cache layer that the
reload clears. The per-server equivalent of the app restart that reliably
cures it is recreating the `<webview>` element (fresh renderer process) —
identified as the escalation path, not yet implemented.

### Attempt 5: Deterministic reproduction (failed, deliberately)

**What was done:** Tried to force the wedge: clean SIGKILL + relaunch, kill
mid-boot at 6 seconds, two-instance partition race.
**What went wrong:** Every attempt booted healthy. The wedge is not
deterministically reproducible from the outside.
**Root cause:** Unknown external trigger — which is precisely why Attempt 4
invested in the watchdog: if the bug cannot be summoned, the next natural
occurrence must arrive with its own autopsy.

### Attempt 6: Build bisection + framework instrumentation — PR #3437 (succeeded)

**What was done:** After #3435/#3436 merged, the storm still reproduced —
now deterministically, ~2s after startup, at 10–14 errors. Five builds were
bisected under identical conditions: master with all fixes, master minus the
`setVersion` dispatch, #3434+#3435, #3434 only, and the untouched
4.16.0-alpha.2 baseline. **Every build reproduced, including the baseline**
— so no recent code caused it; the environment had changed. The storm fires
only when servers have unread rooms at boot, which is why it always looked
random. Patching react-dom's `getRootForUpdatedFiber` (locally, dev-only) to
print the fiber chain at the throw identified the crashing subscriber:
`TabBar`.
**Root cause (full chain):** On webapp boot the server fires one
`unread-changed-by-subscription` event per room → `injected.ts` recomputed
and dispatched a badge update per event → `preload/badge.ts` dispatched even
for identical values → the servers reducer minted a new array and server
object even for no-op patches → every server-subscribed component
re-rendered per dispatch → with enough unread rooms, React 19's
nested-update limit tripped inside `TabBar`.
**The fix (three layers):** 100ms trailing-edge coalescing + value dedupe at
the source (`injected.ts`), value dedupe in transport (`preload/badge.ts`),
and identity-preserving no-op bail in the reducers (`upsert`/`update`).
Validated: 0 errors vs 10–14 in six consecutive pre-fix runs. The same PR
fixed watchdog false positives by arming the boot deadline on the first
committed navigation instead of on attach.

## Lessons Learned

### 1. Bisect against a clean baseline before blaming recent code

Five builds including the untouched alpha.2 baseline all reproduced the
storm — proof that no recent PR caused it and the trigger was data (unread
rooms at boot), not code. An intermittent bug that "started recently" is a
claim about the code until a baseline run tests it; here the baseline test
redirected the whole investigation in one afternoon.

### 2. Instrument the framework instead of theorizing from source

Two code-reading theories were generated and invalidated before a single
instrumented run (patching react-dom's `getRootForUpdatedFiber`) named the
looping component in one reproduction. For framework-level failures, the
framework's own internals are the cheapest oracle.

### 3. High-frequency event chains need dedupe at every layer

The storm survived partial fixes because each pipeline stage amplified
independently: per-event recompute (no coalescing), unconditional dispatch
(no value dedupe), identity-breaking reducers (no no-op bail). Fixing one
layer reduces intensity; only fixing source, transport, and store together
eliminates the class.

### 4. If you can't reproduce it, ship the autopsy kit first

Three deliberate reproduction attempts failed. Instead of waiting to catch
the wedge live again, PR #3436 shipped a watchdog that writes a full
forensic report on every future occurrence — converting an unreproducible
bug into a data-collection problem. The next report reads back with probe
state, service-worker registrations, and the console buffer already
attached.

### 5. Recovery paths need caps and an escalation ladder

The pre-existing auto-reload path had no attempt limit; the new one caps at
2 per session and resets on successful boot. And a recovery that clears one
layer (service workers + caches) cannot cure state held in a lower layer
(the guest renderer process) — the cure ladder (plain reload → cache-clear
reload → webview recreation → app restart) localizes which layer holds the
broken state, and automated recovery should climb it the same way.

### 6. `did-start-loading` fires for subframes

The watchdog's first false positives came from keying boot cycles on
`did-start-loading`, which fires for subframe and resource loads. Boot
cycles must key on committed navigations (`did-navigate`), and the
boot-success signal is `WEBVIEW_SERVER_VERSION_UPDATED` (dispatched by
`setVersion` from `setServerInfo`, wired in PR #3436).

## What this does NOT fix

- **The wedge's ultimate root cause is unconfirmed.** Why the webview's
  Meteor module registry ends up incomplete remains unknown; the shipped work
  is detection + recovery + forensics, not prevention.
- **The webview-recreation escalation is designed but not implemented.** The
  one observed wedge survived the cache-clearing reload; until the escalation
  lands, a wedge of that class still ends in a manual app restart (after two
  automatic attempts).
- **Whether the badge dispatch storm and the boot wedge are connected is
  unconfirmed.** They co-occurred and were fixed in the same arc, but no
  evidence ties the storm to the incomplete module registry.
- The watchdog is dev-only by default (`ROCKETCHAT_BOOT_WATCHDOG=true` to
  enable elsewhere); production occurrences still surface only as user
  reports.

## References

- PR #3434 — workspace tab unread badge rendering and priority
- PR #3435 — renderer re-render loop fixes (five component defects)
- PR #3436 — injected-script boot recovery + boot watchdog
- PR #3437 — unread-badge dispatch storm root cause and three-layer fix
- `skills/boot-wedge-debug/SKILL.md` — live-autopsy runbook (CDP eval, cure
  ladder, watchdog report reading)
- `~/Library/Logs/Rocket.Chat/boot-watchdog.jsonl` — forensic reports
