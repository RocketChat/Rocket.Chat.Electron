# Post-Mortem: `DISABLE_AUTO_UPDATES=1` MSI property regression (PROD-595)

## Objective

Restore the MSI installer's `DISABLE_AUTO_UPDATES=1` public property so that
enterprise admins can deploy Rocket.Chat Desktop with auto-updates disabled,
both in interactive installs and in SYSTEM-context deployments via SCCM/MECM.

## Context

The feature was introduced in PR #3280 (commit `4da36441b`, shipped first in
4.14.0-alpha.0 / 4.14.0). Field reports indicated it worked briefly on an
engineer's dev machine but failed in every real enterprise deployment —
including SCCM VDI rollouts. No `resources/update.json` was produced after
`msiexec /i ... DISABLE_AUTO_UPDATES=1 /qn`, so the app continued to check
for and auto-install updates.

## Timeline

### Attempt 1: Symptom-level guesses

**What was done:** Scanned `build/msiProjectCreated.js` for obvious bugs
(VBScript path escaping, `\\"` vs `\\\\` handling, `REMOVE~="ALL"` condition
syntax, `Secure="yes"` placement).

**What went wrong:** Each candidate looked correct in isolation. None of
them explained why the CA appeared to execute (return value in MSI log was
success) yet no file was produced.

**Root cause of this detour:** Treated the MSI verbose log as
untrustworthy and suspected the VBScript first. Should have read the
`Executing op: CustomActionSchedule` line and its `CustomActionData` value
before touching VBScript internals.

### Attempt 2: Read the WiX CustomActionData idiom carefully

**What was done:** Re-read the injected XML:

```xml
<CustomAction Id="SetWriteUpdateJsonDir"
    Property="WriteUpdateJson"
    Value="[APPLICATIONFOLDER]"/>

<CustomAction Id="WriteUpdateJson"
    Script="vbscript"
    Execute="deferred"
    Impersonate="no"
    Return="check">...</CustomAction>

<!-- sequencing -->
<Custom Action="SetWriteUpdateJsonDir" Before="WriteUpdateJson">...</Custom>
<Custom Action="WriteUpdateJson" After="InstallFiles">...</Custom>
```

**What went wrong (the actual bug):**

Two compounding issues with the sequencing of an immediate type-51 setter
feeding `CustomActionData` into a deferred type-1 VBScript CA:

1. **Unreliable `Before="<deferred-CA>"` scheduling.** The immediate setter
   was scheduled `Before="WriteUpdateJson"`, but `WriteUpdateJson` itself
   was scheduled `After="InstallFiles"`. MSI accepted this only under
   narrow circumstances — specifically, WiX4's candle with ICE validation
   disabled (`-sval`) would emit the MST without complaining, but the
   resulting sequence was fragile: the relative positions depended on
   implicit ordering of unrelated standard actions. In many SYSTEM-context
   deployments the setter ran after the deferred script was already
   serialized, so `CustomActionData` was empty at execution time.

2. **Silent failure in VBScript.** The VBScript started with
   `On Error Resume Next` and used `Session.Property("CustomActionData")`.
   When the property was empty, `installDir` became `""`, `resourcesDir`
   became `"resources"` (a relative path), and `fso.FolderExists(...)`
   returned `False`. The `Err.Raise` that followed was suppressed by the
   earlier `On Error Resume Next` — Windows Installer treated the CA as
   successful (`Return value 1`) because VBScript exited cleanly.

**Root cause:** Two bugs hid each other. Fragile CA sequencing made
`CustomActionData` unreliable; silent-fail error handling made the silent
case indistinguishable from success in the MSI log.

### Attempt 3: The fix

**What was done:**

- Explicit, dependency-ordered scheduling after the files are on disk:
  ```xml
  <Custom Action="SetWriteUpdateJsonData" After="InstallFiles">...</Custom>
  <Custom Action="WriteUpdateJson" After="SetWriteUpdateJsonData">...</Custom>
  ```
- Added `Execute="immediate"` and `Return="check"` explicitly on the setter
  so its status is audited by MSI rather than defaulted.
- Added an explicit empty-`CustomActionData` guard in the VBScript so the
  failure mode is loud and visible in `msiexec /l*v` logs instead of silent.
- Added `NOT Installed` to the condition so repair/modify does not rewrite
  `update.json`.
- Quoted the `"1"` literal in the condition for string-safe comparison.
- Set `msi.perMachine: true` in `electron-builder.json` so the MSI bakes in
  `ALLUSERS=1` / empty `MSIINSTALLPERUSER` — a machine-scope install that
  works correctly under SYSTEM context (required for SCCM). NSIS stays
  `perMachine: false` for consumer use.

**What worked and why:** Making the immediate → deferred dependency
**explicit and observable** removed the whole class of "did it actually
run?" ambiguity. Even if the fix had been wrong, the next failure would be
diagnosable from the log (`CustomActionData is empty — SetWriteUpdateJsonData did not run`) instead of
silently no-op.

## Test infrastructure

Committed a reusable test harness at `scripts/msi-test/`:

- `test-on-windows.ps1` — Three scenarios: (A) baseline no property,
  (B) interactive `DISABLE_AUTO_UPDATES=1`, (C) SYSTEM context via
  PsExec to simulate SCCM. Writes structured `test-results.json`.
- `run-msi-tests.sh` — macOS orchestrator: `scp`'s MSI + PS1 to VM,
  invokes script over SSH, pulls results back.
- `fetch-logs.sh` — Standalone log puller.
- `README.md` — Usage and VM prerequisites.

Validation run on Windows 10 VM (192.168.13.87) with the patched MSI
produced all three scenarios `PASS`. The log excerpt proving the fix
fired correctly:

```
PROPERTY CHANGE: Adding DISABLE_AUTO_UPDATES property. Its value is '1'.
Doing action: SetWriteUpdateJsonData
PROPERTY CHANGE: Adding WriteUpdateJson property. Its value is 'C:\Program Files\Rocket.Chat\'.
Action ended: SetWriteUpdateJsonData. Return value 1.
Doing action: WriteUpdateJson
Action ended: WriteUpdateJson. Return value 1.
```

## Lessons Learned

### 1. `On Error Resume Next` without a matching `On Error Goto 0` hides bugs

Any VBScript CA that uses `On Error Resume Next` must either (a) reset the
handler with `On Error Goto 0` after the fragile block, or (b) check
`Err.Number` immediately after every operation that can fail. The MSI
engine cannot distinguish "script completed with Err=0" from "script
completed with all errors suppressed" — both report `Return value 1`.

### 2. Immediate-to-deferred CA plumbing needs explicit sequencing, not `Before="<deferred>"`

Always schedule both CAs explicitly in the same sequence with a direct
dependency between them:

```xml
<Custom Action="SetFooData" After="InstallFiles">...</Custom>
<Custom Action="FooDeferred" After="SetFooData">...</Custom>
```

Relying on `Before="<deferred-CA>"` is syntactically legal but
operationally brittle — the deferred action's position in the execution
script is not the same as its position in the sequence table, and ICE
validation will not always catch the divergence (especially when
`additionalWixArgs: ["-sval"]` disables it).

### 3. MSI "success" in the log is not proof of correctness

`Return value 1` means "the CA's host process exited cleanly." It says
nothing about whether the CA did what it was supposed to do. For file-
or registry-producing CAs, always assert the observable side-effect
(`Test-Path "<installdir>\resources\update.json"`) in automation, not
just the MSI exit code.

### 4. Test a fix in the ACTUAL deployment context, not just the happy path

The customer's "worked for a while, now doesn't" was misleading. The
feature likely never worked in a real SCCM/SYSTEM install — it may have
appeared to work during an interactive run on the author's dev machine
because implicit sequence ordering happened to favor the CA that one time.
Before marking a feature as Done for enterprise use, reproduce in:

- Interactive elevated install
- `/qn` silent install as a normal admin
- `PsExec -s -i` SYSTEM context (SCCM simulation)

### 5. Enterprise-targeted installers must bake in their scope

`msi.perMachine: true` (i.e., embed `ALLUSERS=1`) is the right default for
the MSI because MSI is the enterprise deployment vehicle. Leaving it
`false` and requiring every admin to pass `ALLUSERS=1 MSIINSTALLPERUSER=""`
on the command line is a trap — any missing property leads to a per-user
install under the SCCM SYSTEM profile, which is invisible to all logged-in
users. NSIS retains `perMachine: false` for consumer installs.

### 6. Cross-building Windows MSI from macOS arm64 is not viable in 2026

Attempted `electronuserland/builder:wine` under `--platform linux/amd64`:
WiX4's candle.exe needs Wine-Mono, which is not shipped in that image;
installing it manually inside the container leaves other COM dependencies
broken (`start_rpcss`, `StdMarshalImpl_MarshalInterface`). The practical
options are:

- Build on a Windows machine (CI runner or a VM)
- Use GitHub Actions with a Windows runner

Wine cross-build worked historically for NSIS but does not work for WiX4
MSI on Apple Silicon. Do not spend time on it; go straight to Windows.

## What this does NOT fix

- **NSIS `/allusers` under SYSCM/SYSTEM is still unreliable.** NSIS was
  never designed for SYSTEM-context execution; its per-user vs per-machine
  probing depends on UAC token information that isn't meaningful for
  SYSTEM. `docs/enterprise-deployment.md` now documents that enterprise
  customers must use the MSI, not the NSIS installer. Fixing NSIS for
  SYSTEM context is out of scope and would require either flipping NSIS
  to `perMachine: true` (breaks consumer flow) or implementing custom
  `!ifdef SYSTEM` detection inside `build/installer.nsh`.
- **`additionalWixArgs: ["-sval"]` is still set.** Removing it to re-enable
  ICE validation is the right long-term move, but may surface pre-existing
  ICE errors unrelated to this fix and would have to be addressed before
  the change ships.
