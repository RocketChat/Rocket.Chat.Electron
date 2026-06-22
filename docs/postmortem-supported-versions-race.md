# Post-Mortem: Supported-Versions First-Launch Race

## Objective

Fix the macOS desktop app showing the "unsupported version" block screen for valid Rocket.Chat servers (e.g. `open.rocket.chat` running 8.5) on first launch after an app update, resolved only by quitting and restarting.

## Timeline

### Attempt 1: Map the validation pipeline (succeeded — diagnosis)

**What was done:** Dispatched a finder agent to map the supportedVersions code paths: action dispatches, reducer, validator, fetch orchestration, UI gate, and throttle logic. Decoded the live `/api/info` JWT from the affected server and re-ran `isServerVersionSupported` in a sandbox against the actual payload.

**What was found:** The validator returned `{supported: true}` for the live payload. So the persisted `isSupportedVersion: false` observed in the user's state dump did not come from the current data — it came from a stale snapshot at a moment when Redux state was inconsistent.

**Root cause:** The renderer's `SupportedVersionDialog` `useEffect` (deps `[server?.supportedVersions, server?.lastPath, currentView]`) ran `isServerVersionSupported(server, server.supportedVersions)` against whatever was currently in Redux. The main process's `updateSupportedVersionsData` dispatched `WEBVIEW_SERVER_VERSION_UPDATED` first, then `WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED` separately. Between those dispatches the renderer observed a `version`/`supportedVersions` mismatch, computed `false`, and dispatched `WEBVIEW_SERVER_IS_SUPPORTED_VERSION` with the wrong verdict. A 30-minute throttle then suppressed re-validation, locking the wrong verdict in until restart.

### Attempt 2: Move authority to main; tighten UI gate (initial fix)

**What was done:** Removed the renderer-side `WEBVIEW_SERVER_IS_SUPPORTED_VERSION` dispatch. Made `updateSupportedVersionsData` the sole authoritative writer of the verdict, computed against an explicit `serverWithFreshVersion = {...server, version: serverInfoResult.version}` so the validator could not observe stale state. Tightened the block gate from `fetchState !== 'loading'` to `fetchState === 'success'`. Added exception matching by exact-string and `sha-<7chars>` commit hash to fix per-tenant SHA exceptions like `sha-bb83777`.

**What worked:** The original race was eliminated. Live-payload regression test confirmed `8.5` plus `sha-bb83777` exception now resolves to `supported: true`.

### Attempt 3: Codex round 1 — fail-open on degraded network

**What was found:** The cache and builtin fallback paths called `dispatchSupportedVersionsUpdated` and `dispatch(ERROR)` but never computed or dispatched a verdict. Combined with the new gate `fetchState === 'success'`, an unsupported server stayed unblocked whenever fresh server/cloud both failed and the app fell back to cached/builtin data.

**Root cause:** The fix in Attempt 2 narrowed the gate without ensuring the fallback paths produced a verdict the gate could observe.

**Resolution:** Cache and builtin paths now compute `isServerVersionSupported` and dispatch a verdict before signaling `ERROR`. Widened the gate to `success || error` so fallback verdicts could enforce.

### Attempt 4: Codex round 2 — cache/builtin still used stale persisted version

**What was found:** The new fallback dispatches passed the original captured `server` object, not `serverWithFreshVersion`. If `/api/info` returned a fresh version but its signed payload was missing/invalid and cloud lookup failed, the fallback path evaluated against the persisted version, producing a verdict for the wrong version.

**Root cause:** `serverWithFreshVersion` was scoped inside the server-source `try` block; cloud, cache, builtin paths each constructed their own version snapshot or used the original.

**Resolution:** Hoisted `serverWithFreshVersion` and `freshCommitHash` once after `serverInfoResult` was known; every downstream path now uses the same authoritative object.

### Attempt 5: Codex round 3 — concurrent updates last-writer-overwrite; uniqueId endpoint skew

**What was found:**
1. `updateSupportedVersionsData` is invoked from four listeners (`WEBVIEW_READY`, `WEBVIEW_SERVER_RELOADED`, `SUPPORTED_VERSION_DIALOG_DISMISS`, `ipcMain.handle('refresh-supported-versions', ...)`) without any cancellation or sequencing. An older slower request could complete after a newer one and overwrite the verdict with stale data.
2. `getUniqueId(server.url, server.version || '')` selected the modern vs legacy endpoint via `semverGte(version, '7.0.0')`. With a persisted pre-7 version and a fresh 7+ `/api/info` response, the legacy settings endpoint was hit, often failing, falling back to cache/builtin against stale evidence.

**Resolution:** Added a per-URL generation counter in a module-level `Map`. Every call captures its own generation; before each dispatch and before `saveToCache`, an `isStale()` check short-circuits if a newer call has bumped the generation. `getUniqueId` now uses `serverInfoResult?.version ?? server.version` for endpoint selection.

### Attempt 6: Codex round 4 — cache poisoning via early saveToCache

**What was found:** The stale-generation check ran *after* `saveToCache`, so a stale request could persist its decoded payload to ElectronStore even when its dispatch was ignored. The persistent cache could be silently rolled back to stale data.

**Resolution:** Moved the `isStale()` check ahead of every `saveToCache` call on server, cloud, and builtin paths.

### Attempt 7: Codex round 5 — exception scope missing; dispatch ordering leaked stale verdict

**What was found:**
1. The new exact/commit-hash exception matching honored any matching version regardless of `exceptions.domain` and `exceptions.uniqueId`. The cloud and server payloads are inherently scoped (the lookup is keyed by domain+uniqueId), but the bundled builtin payload is global — a SHA exception for tenant A could be applied to tenant B with the same commit hash.
2. `dispatchSupportedVersionsUpdated` fired BEFORE the verdict was computed. The reducer flipped `fetchState` to `success` while `isSupportedVersion` still held the previous-session value, briefly rendering the unsupported overlay during the async gap.

**Resolution:** Added a scope guard requiring `exceptions.domain === hostname` and `exceptions.uniqueId === server.uniqueID` when those fields are present. Reordered every path to dispatch the verdict before `dispatchSupportedVersionsUpdated`.

### Attempt 8: Codex round 6 — strict scope rejected when local uniqueID undefined

**What was found:** The strict scope check used `(exceptions.uniqueId && server.uniqueID && exceptions.uniqueId !== server.uniqueID)`. If `server.uniqueID` was undefined (typical first launch before `getUniqueId` resolved), the comparison short-circuited and the exception was honored without proving tenant identity. A first launch where `/api/info` returned an exception scoped to a different tenant could bypass enforcement.

**Resolution:** Removed the `server.uniqueID &&` short-circuit. A present `exceptions.uniqueId` is now a required equality check — missing local identity rejects. To avoid false rejections on legitimate flows, threaded `serverInfoResult.uniqueId` (always returned by `/api/info`) into `serverWithFreshVersion` so first-launch identity is available immediately.

### Attempt 9: Codex round 7 — no-data fail-open + reducer erases commit hash + idle gate

**What was found:**
1. The earlier no-data path dispatched `isSupportedVersion: undefined` "to clear stale state", but this fail-open behavior allowed a previously-confirmed-unsupported server to become accessible whenever every source failed (e.g. firewalled enterprise with no cached/builtin data). Better: preserve any prior definitive verdict; only signal `ERROR`.
2. `WEBVIEW_SERVER_VERSION_UPDATED` is shared between `dispatchVersionUpdated` (main, includes `commit.hash`) and `src/servers/preload/version.ts` `setVersion()` (renderer, no hash). The reducer overwrote `gitCommitHash` unconditionally, so an ordinary webview version-tick erased the hash captured from `/api/info`. The dialog's sha-based exception matching then stopped working.
3. The gate `fetchState === 'success' || 'error'` did not block when persisted state hydrated with `fetchState` undefined or `idle`. Persisted `isSupportedVersion: false` from a prior session no longer enforced until a fresh fetch completed.

**Resolution:**
1. Removed the no-data clear; only `ERROR` dispatches when nothing is reachable. Prior verdict is preserved as security-correct fail-secure.
2. Reducer now only overwrites `gitCommitHash` when the payload provides one; preload's `setVersion` no longer erases the hash.
3. Reverted gate to `fetchState !== 'loading'`. Safe because main is the sole writer of `isSupportedVersion` and only writes `false` based on real evidence — a persisted `false` always reflects a previous determination and must keep blocking.

## Lessons Learned

### 1. When state is split across async dispatches, the renderer can race the main process

Redux/electron-store hydration plus async fetch logic creates a window where dependent state fields are mutually inconsistent. A renderer `useEffect` keyed on one of those fields will fire mid-update. The fix is not "throttle the renderer" — that masks the symptom and creates lock-in via persisted-throttle state. The fix is to make a single party authoritative, dispatch dependent fields atomically (or at least with the verdict last), and never let a derived value be computed by an observer of mid-update state.

**Rule:** Whenever multiple Redux fields are jointly required to compute a verdict, dispatch the verdict from the same site that produces the inputs, after they are all available. Do not let a `useEffect` on the inputs derive the verdict.

### 2. Exception-matching by version string and commit hash both need scoping

`exceptions.domain` and `exceptions.uniqueId` exist on the supportedVersions payload for a reason: cloud-fetched and server-signed payloads are tenant-scoped, but the **builtin** (bundled) payload is global. A commit-hash or version-string exception that ignores scope can apply across tenants. Treat present scope fields as required equality. Missing local identity (e.g. `server.uniqueID` undefined on first launch) must reject — not relax — the check, and the fix is to thread fresh identity in (e.g. `serverInfoResult.uniqueId` from `/api/info`) rather than weaken the check.

### 3. Shared Redux actions are unsafe places to add new payload fields

`WEBVIEW_SERVER_VERSION_UPDATED` was already dispatched from two unrelated sites (main `/api/info` flow and renderer preload `setVersion`). Adding `gitCommitHash` to the payload type without considering that the renderer dispatch did not include it caused the reducer to erase the hash on every webview version change. Either: only overwrite optional fields when the payload provides them, or use a separate action for the new data. Audit every dispatcher of an action before extending its payload semantics.

### 4. "Stale request" guarding requires checking *before every side effect*, not just before the dispatch

The first cache-poisoning bug came from putting `isStale()` only before `dispatch`, leaving `saveToCache` reachable from a stale generation. Persistent side effects (cache writes, file writes, IPC sends) need their own guards. A generation token isn't a "skip dispatch if stale" check; it's a "skip the rest of this critical section if stale" check.

### 5. Fail-secure over fail-open when evidence is missing

The "clear stale verdict on no-data" path felt like good UX (don't lock users out forever) but became a fail-open regression: a server confirmed unsupported yesterday could be accessed today by suppressing all evidence sources. The correct default is to preserve the last definitive verdict and only revise it when fresh evidence contradicts. UX cost (rare permanent block when truly offline + previously unsupported) is acceptable; security cost (silently weakening enforcement under attacker-induced failure) is not.

### 6. UI gates that depend on state machines must handle every state, including "uninitialized"

`fetchState === 'success'` and `'success' || 'error'` both seemed precise but missed `idle` and `undefined`. Persisted state hydrates without progressing through `loading → success`. The safer pattern when a verdict is sticky-from-evidence is to gate on the verdict itself with a single negative carve-out (`fetchState !== 'loading'`) rather than enumerate positive states.

### 7. Adversarial review converges slowly; ship-readiness ≠ review-clean

Each adversarial pass surfaced narrower edges than the last. Rounds 2-9 added meaningful hardening, but treating the review as a gate (rather than an audit) created a chase pattern. The original bug was fixed in round 1; rounds 2-9 closed real but progressively-narrower attack surfaces. Define ship readiness as "original bug fixed + no covered-path regression + reasonable hardening for the change blast radius" — not "no findings remaining". An adversarial agent will always find more.

## What this does NOT fix

- Servers that genuinely lack a signed `supportedVersions` field on `/api/info` (older self-hosted) still depend on the cloud lookup. If the cloud is unreachable AND there is no cached payload AND the bundled builtin doesn't cover the running version, the server hits the no-data path and inherits whatever verdict was previously persisted. This is intentional (fail-secure).
- The 30-minute revalidation throttle in `SupportedVersionDialog` is still present for the expiration-banner path; it was only removed from the verdict path.
- IPC `refresh-supported-versions` still does not await prior calls; the generation guard handles correctness, but a long stalled request is not actively cancelled.
- The bundled builtin JWT is signed with the embedded RC public key; verification depends on the key remaining unchanged. Rotation is out of scope.
