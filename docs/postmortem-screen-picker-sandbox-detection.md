# Post-Mortem: Screen-share picker opens on every launch (issue #3308)

## Objective

Diagnose why the XDG screen-share picker dialog opened at every launch on Linux (reported on Flatpak/Flathub, present in 4.14.0 / 4.14.1 / 4.15.0) and why the earlier cache-warming guard did not cover the reporter's environment. Ship a fix that works across all Linux packaging formats.

## Background

Screen sharing for the server view was added in PR #3266 (4.14.0). It registers a `setDisplayMediaRequestHandler` per server-view webview and, for the internal picker path, warms a `desktopCapturer` source cache at `WEBVIEW_READY`. A follow-up guard (`requiresCacheWarming`) was added so the prewarm only runs for the `InternalPickerProvider`, not the `PortalPickerProvider`. The guard shipped in 4.15.0 but reports of the dialog persisted — that is where this investigation started.

## Timeline

### Attempt 1: "Surviving trigger is the request handler firing on a webapp load-time getDisplayMedia probe" (wrong hypothesis)
**What was done:** Read the handler code, saw `setDisplayMediaRequestHandler` registered on every webview with no user-gesture gate, and adopted the reporter's own hypothesis: the Rocket.Chat webapp probes `navigator.mediaDevices.getDisplayMedia()` at page load, the handler catches it, and the portal picker opens.
**What went wrong:** The whole theory rested on an unverified assumption — that the webapp issues a load-time `getDisplayMedia()`.
**Root cause of the misstep:** Adopting a plausible-sounding hypothesis before verifying its foundational assumption. The assumption was checkable and turned out false.
**Correction:** Queried the indexed Rocket.Chat webapp knowledge graph. The only `getDisplayMedia` in the webapp is the VoIP `MediaSessionStore.getDisplayMedia`, called solely by a user-gesture-gated `displayMediaFactory`. Zero load-time callers, zero process participation. The webapp does not probe at load. Hypothesis eliminated.

### Attempt 2: "Our fix was never shipped" (wrong, tooling misread)
**What was done:** Ran `git merge-base --is-ancestor <fix-commit-sha> <tag>` for the release tags; all returned "no". Concluded the `requiresCacheWarming` guard never reached master/tags and only lived on a feature branch.
**What went wrong:** The guard *had* shipped — it reached master via a squash-merge, so the original commit SHA is not an ancestor of the tags even though the code change is present.
**Root cause of the misstep:** Testing for a specific commit SHA's ancestry instead of testing for the *content* of the change. Squash/rebase merges make SHA-ancestry a false negative for "did this change ship."
**Correction:** `git show <tag>:<path> | grep requiresCacheWarming` proved the guard is present in 4.15.0. Switched to content checks over SHA-ancestry checks.

### Attempt 3: Raw grep across the 10k-file webapp repo (process misstep)
**What was done:** After the graph gave the answer, dropped to `grep -rn getDisplayMedia` across the entire Rocket.Chat monorepo to "double-check", which auto-backgrounded and produced empty/slow output through the shell proxy.
**What went wrong:** Slow, noisy, and redundant — the knowledge graph had already answered the structural question authoritatively.
**Root cause of the misstep:** Reflexive grep on a large unfamiliar repo when a prebuilt code graph was available and already consulted.
**Correction:** Returned to graph queries (`query`, `context`) for structural questions; reserved source reads for implementation detail.

### Attempt 4: "child_process in the picker file will crash the renderer" (wrong, over-cautious)
**What was done:** The builder added a synchronous `execSync('busctl ...')` D-Bus probe to `detectPickerType`. Noticing `createScreenPicker` is imported by `videoCallWindow/video-call-window.ts` (a renderer file that imports `ipcRenderer`), flagged it as a runtime crash: Node APIs unavailable in the renderer.
**What went wrong:** The video-call `BrowserWindow` is created with `nodeIntegration: true` and `contextIsolation: false` (`videoCallWindow/ipc.ts`), so `require('child_process')` works there. No crash.
**Root cause of the misstep:** Asserting a renderer-context constraint without checking that window's `webPreferences`.
**Correction:** Verified `webPreferences` first. The crash claim was withdrawn. The `execSync` probe was still removed — for a different, valid reason (a synchronous ≤300ms subprocess spawn on the video-call render thread, and it was non-load-bearing for the fix).

### Attempt 5: Correct root cause and fix (succeeded)
**What was done:** Traced the real trigger to `prewarmDesktopCapturerCache()` → `desktopCapturer.getSources()` at `WEBVIEW_READY`. On Linux the app forces `--enable-features=WebRTCPipeWireCapturer` for all sessions, so `getSources()` on Wayland routes through the XDG portal and shows the picker. The guard skips prewarm only when `detectPickerType()` returns `'portal'` — but that function reads `XDG_SESSION_TYPE` / `XDG_CURRENT_DESKTOP`, which Flatpak/Snap sandboxes strip. On a Wayland host inside a sandbox, detection fell through to `'internal'` → `requiresCacheWarming = true` → prewarm ran → picker at launch.
**Why it worked:** The fix flips the Linux default to `'portal'` and recovers `'internal'` only when a silent-capable session is positively confirmed (pure X11 via `XDG_SESSION_TYPE=x11`, or the `ROCKETCHAT_INTERNAL_SCREEN_PICKER=1` escape hatch). Wayland is detected via `XDG_SESSION_TYPE` OR a real `WAYLAND_DISPLAY` socket on disk (mirroring the ozone-platform decision already in `app.ts`), so sandbox env-stripping no longer causes a misdetect. With `'portal'` selected, the startup prewarm never runs.
**Key insight:** The picker-vs-portal decision must not depend on environment variables that sandboxes strip. Default to the safe branch (portal — dialog only on user demand) and only leave it when a silent-capable environment is positively proven.

## Lessons Learned

### 1. Verify a hypothesis's foundational assumption before building on it
Attempt 1 adopted "the webapp probes getDisplayMedia at load" — a checkable claim — as fact. It was false. When a diagnosis rests on one load-bearing assumption, verify that assumption first (here: query the code graph for load-time callers) before reasoning forward from it.

### 2. "Did this change ship?" is a content question, not a SHA-ancestry question
`git merge-base --is-ancestor <sha> <tag>` returns false for squash/rebase merges even when the change is present, because the original SHA is not in the tag's history. To check whether a change reached a release, inspect the *content* at that ref: `git show <tag>:<path> | grep <marker>`.

### 3. On a graph-indexed codebase, use the graph for structural questions
Rocket.Chat is indexed. The graph answered "who calls getDisplayMedia" instantly and authoritatively. Dropping to a repo-wide grep afterward was slow and redundant. Query the graph first for call chains / ownership / participation; read source only for implementation detail.

### 4. Check `webPreferences` before asserting a renderer Node-API constraint
Whether `fs` / `child_process` work in a renderer-reachable module depends on that window's `nodeIntegration` / `contextIsolation`. The video-call window runs with `nodeIntegration: true`. Confirm the actual `BrowserWindow` config before claiming a Node-in-renderer crash.

### 5. Sandbox-safe environment detection: default to the safe branch, positively confirm the optimization
Flatpak/Snap strip `XDG_SESSION_TYPE` / `XDG_CURRENT_DESKTOP`. Any Linux detection keyed on those vars silently misfires inside a sandbox. The robust shape: default to the branch that is always correct (here, portal — the picker appears only on user demand), and switch to the optimized branch (internal cache-warming) only when the enabling condition is positively proven (pure X11, or explicit opt-in). Reuse an existing robust signal when one exists — `app.ts` already validated the Wayland socket on disk for its ozone decision.

## What this does NOT fix

- It does not change screen-sharing behavior when the user actually initiates a share — the portal picker appears on demand, as intended, on Wayland.
- It does not touch the Flathub package directly. `chat.rocket.RocketChat` on Flathub is community-maintained and separate from this repo's official builds; it will pick up the change after the next release flows downstream.
- The reporter's original hypothesis (a webapp load-time `getDisplayMedia` probe) was not the mechanism. The trigger was the desktop app's own startup cache warm-up under portal routing, selected because environment detection misfired in the sandbox.
