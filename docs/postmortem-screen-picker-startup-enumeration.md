# Post-Mortem: Screen-share picker at launch — startup enumeration trigger (issue #3308, PR #3400)

Continuation of [postmortem-screen-picker-sandbox-detection.md](./postmortem-screen-picker-sandbox-detection.md). That investigation shipped a sandbox-safe `detectPickerType()` in 4.15.1 and closed the cache-prewarm trigger. Field reports on 4.15.1 (Ubuntu 26.04 KDE/Cosmic, Wayland, deb) continued — this investigation found and removed a second, independent trigger, and explains why it evaded every software-rendered test environment.

## Objective

Root-cause why the XDG screen-share dialog still opened at every app launch on Wayland after the 4.15.1 detection fix, ship a verified fix, and close #3308.

## Outcome

PR #3400 (merged 2026-07-09): 4-line deletion of a mount-time `desktopCapturer.getSources()` in `src/screenSharing/screenSharePicker.tsx`. Verified at dbus level on GPU-passthrough Wayland: stock 4.15.2 issues `ScreenCast CreateSession + SelectSources` at every launch; the fixed build issues zero. Tracked as CORE-2400.

## Timeline

### Attempt 1: Enumerate every `getSources()` reacher at the shipped tag (succeeded — found the trigger in minutes)
**What was done:** Instead of re-examining the previously fixed prewarm path, listed every call site that can reach `desktopCapturer.getSources()` at tag 4.15.1 (`git grep` at the tag, not the working tree).
**What it found:** `ScreenSharePicker` is pre-mounted hidden in the root window (`Shell` → `RootScreenSharePicker`) at every startup, and its mount effect called `fetchSources()` unconditionally — before any user action, bypassing `detectPickerType()` entirely.
**Key insight:** One symptom had two independent triggers. The 4.15.1 fix was correct for the trigger it addressed; reports continued because the second trigger was never enumerated.

### Attempt 2: Verify the fix in software-rendered VMs (misleading results, multiple harness defects)
**What was done:** mOSdat `confirm`/`verify-fix` runs on fedora42 (GNOME Wayland VM).
**What went wrong (harness, fixed in passing):**
- VLM verdicts 401'd: the TOML `[vlm]` block silently overrides `.env` credentials (config precedence), and the endpoint URL used `http://` — the https redirect turned POST into GET (405).
- The scenario's precondition prompt required a visible login/chat UI; a blank window behind the picker overlay scored INCONCLUSIVE even when the bug was on screen.
**What worked:** 4.14.1 (Electron 40) reproduced visually on first-launch-after-boot; the fixed build was clean 3/3. This was declared "verified" — prematurely.
**Root cause of the misstep:** The A/B baseline (4.14.1, Electron 40) did not match the reported version (4.15.1, Electron 42). A control run with stock 4.15.2 came back clean on the same VM, collapsing the claim.

### Attempt 3: KDE control on Manjaro (false positive from a contaminated VM)
**What was done:** Same A/B on the Manjaro KDE Wayland VM. Stock "reproduced" — then the fixed build "reproduced" too.
**What went wrong:** The VM had a pre-existing manual install at `/opt/Rocket.Chat` with a `~/.config/autostart` entry from earlier testing. It launched at every login and owned the observed dialog. The inventory had only checked flatpak and pacman — package managers do not list manual `/opt` installs.
**Correction:** Killed/removed the old install and autostart entry, re-ran clean: stock 4.15.2 showed nothing on this VM either.

### Attempt 4: dbus-level probes across the VM matrix (right instrument, wrong environments)
**What was done:** Replaced visual assertions with `dbus-monitor` on `org.freedesktop.portal.ScreenCast` — the request is deterministic even when dialog rendering is flaky (portal dialogs on these VMs rendered only on the first request per boot).
**What it showed:** Electron 42 issued zero ScreenCast calls at startup on every combination tried: Fedora 42 GNOME + Manjaro KDE, X11 and Wayland ozone, fresh and server-configured profiles, portal ≤ 1.20.
**Discipline that paid off:** This was recorded as *inconclusive for the reported environment* rather than "the fix is irrelevant on Electron 42" — the reported environment (real hardware) had not actually been exercised.

### Attempt 5: Webapp load-time `getDisplayMedia` probe hypothesis (killed statically — second time this hypothesis died)
**What was done:** Reporters run server 7.10.7; the prior postmortem had only cleared the *latest* webapp. Checked the actual version: `git grep getDisplayMedia` at tag 7.10.7 — zero matches anywhere.
**Root cause of the misstep:** The same hypothesis was eliminated in the prior investigation; re-checking for the older server version was legitimate, but the 30-second static check should have run before any VM cycles were spent around it.

### Attempt 6: Ubuntu 26.04 environment build (near-miss + environment wall)
**What was done:** Cloned the ubuntu2404 VM and dist-upgraded the clone to 26.04 (reporters' exact distro/kernel/portal).
**Near-miss:** The clone kept the original's static IP. The first upgrade command, targeted by IP, landed on the **production** ubuntu2404 VM. It self-aborted harmlessly ("install all available updates first") before mutating anything; hostname was the only change and was restored. Rule extracted: mutate VMs by identity (guest-agent hostname), never by IP, immediately after cloning.
**Environment wall:** On the finished 26.04 VM, Electron 42 + Wayland ozone + virtual std-VGA (Mesa 26 / llvmpipe) never mapped a window in 10+ minutes — renderer stalls pre-paint. The reported environment remained unverifiable in software-rendered VMs. (Also hit: Ubuntu 24.04+ AppArmor userns restriction requires `chrome-sandbox` root:4755 for extracted AppImages.)

### Attempt 7: GPU passthrough (decisive)
**What was done:** With IOMMU enabled on the Proxmox host, passed a GTX 970 to fedora42 (nouveau, GNOME Wayland) and re-ran the dbus A/B with fresh profiles on the same boot.
**Result:**
| Build (both 4.15.2 / Electron 42) | ScreenCast calls at launch |
|---|---|
| stock | `CreateSession` + `SelectSources` every launch (2/2 runs) |
| with the fix | zero (2/2 runs) |
**Why it worked:** Electron 42's Chromium initializes the PipeWire capture path only when hardware GL is available. Software-rendered VMs return from `getSources()` without touching the portal — masking the trigger in every earlier test environment — while all real machines (all reporters) hit the portal on each launch. Electron 40 portal'd even under software GL, which is why the 4.14-era trigger *was* reproducible in plain VMs.
**Note:** With passthrough, the Proxmox VNC console is black (output goes to the physical GPU head) — evidence must come from dbus/journal or guest-side capture.

## Lessons Learned

### 1. One symptom can have multiple independent triggers — enumerate all reachers at the shipped tag
When reports continue after a correct fix, don't re-litigate the fixed trigger. List every call site that can reach the side effect (`git grep <api>` at the release tag) and audit each one. The second trigger here was findable in minutes once the question changed from "why didn't the fix work" to "what else reaches getSources".

### 2. Software-rendered VMs are not representative for Chromium capture/media behavior
Chromium gates the PipeWire capture path on hardware GL (behavior differs across Electron/Chromium versions). "Does not reproduce in a VM" is not evidence of absence for capture-stack, WebRTC, or portal behavior — validate on hardware GL (GPU passthrough or physical machine) before concluding non-repro, and label VM-only results as environment-limited.

### 3. The A/B baseline must match the reported version
Verifying the fix against a 4.14.1 baseline proved only the Electron 40 trigger. The "fix verified" claim collapsed the moment a same-version control (stock 4.15.2) ran. Always run the control with the exact reported version before declaring a report resolved.

### 4. Inventory a shared VM beyond package managers before trusting results from it
Check `/opt`, `~/.config/autostart`, and running processes (`pgrep`) — manual installs and autostart entries don't appear in flatpak/pacman/dpkg listings. A pre-existing autostarted install produced a convincing false CONFIRMED and a false bug-still-present on the fixed build.

### 5. Mutate cloned VMs by identity, never by IP
Clones keep statically configured IPs; the address may still belong to the source VM. Verify the target via guest-agent hostname (`/agent/get-host-name`) before any mutating command. This near-missed a dist-upgrade of a production test VM.

### 6. Assert on the protocol, not the pixels, when the UI layer is flaky
Portal dialog *rendering* on these VMs was boot-state dependent (rendered once per boot, then "Failed to associate portal window"). The dbus *request* (`CreateSession`/`SelectSources`) fires deterministically per launch. When a visual assertion is environment-flaky, find the deterministic protocol-level signal underneath it.

### 7. Config precedence chains hide credential failures
mOSdat's TOML `[vlm]` block silently overrode fresh `.env` credentials (stale hosted-API key → 401 mid-run). When creds fail despite being "set", walk the full precedence chain before minting new keys. Related: `http://` base URLs on https-only APIs turn POST into GET via redirect (405) — always https.

### 8. `pkill -f` patterns must not appear in your own command line
Twice, a remote cleanup killed its own SSH session because the pattern string appeared in the shell's cmdline (once via the pattern itself, once via an unrelated filename later in the same command). Use `pkill -x` with exact (≤15 char) process names, or split the kill into its own SSH invocation with a `[b]racketed` pattern and no other occurrence of the string.

## What this does NOT fix

- On-demand screen sharing is unchanged: when the user initiates a share, the portal (Wayland) or internal picker appears as designed — the fix removes only the un-requested enumeration at startup.
- The mOSdat harness gaps found along the way (VLM config precedence, precondition strictness, watcher agents not reporting results back) were patched or worked around in-session but belong to the mOSdat repo's own backlog.
- Flathub's community package picks up the fix only after the next release flows downstream.
