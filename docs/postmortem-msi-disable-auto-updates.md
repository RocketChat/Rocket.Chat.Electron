# Retrospective: `DISABLE_AUTO_UPDATES=1` MSI — Enterprise Deployment Hardening

## Objective

Extend the MSI installer's `DISABLE_AUTO_UPDATES=1` public property to cover
SCCM/MECM and Intune deployment patterns, which have distinct requirements
compared to interactive elevated installs: per-machine install scope and
reliable deferred CustomAction data plumbing under `NT AUTHORITY\SYSTEM`.

## Context

The feature was introduced in PR #3280 (commit `4da36441b`, shipped in
4.14.0-alpha.0 / 4.14.0). It was validated interactively on a developer
machine running an elevated administrator session, where it produced
`resources/update.json` correctly.

When an enterprise customer deploying via SCCM tested the property, it did
not take effect. SCCM deploys as `NT AUTHORITY\SYSTEM` using
`msiexec /i ... DISABLE_AUTO_UPDATES=1 /qn`, which has two requirements that
interactive installs do not exercise:

1. **Per-machine install scope.** Without `ALLUSERS=1` embedded in the MSI,
   an interactive install lands in the administrator's user profile; a
   SYSTEM-context install lands in the SYSTEM profile — invisible to every
   logged-in user.
2. **Deferred CustomAction data isolation.** Deferred CAs run in a serialized
   script with a clean property environment; they cannot read session
   properties directly. Data must be forwarded through `CustomActionData` by
   an explicit immediate setter CA, scheduled before the deferred CA.

Neither requirement surfaces in a standard interactive elevated install, which
is why the initial testing did not expose them.

## Investigation

### Phase 1: Symptom-level scan

**What was done:** Reviewed `build/msiProjectCreated.js` for surface-level
issues (VBScript path escaping, `\\"` vs `\\\\` handling, `REMOVE~="ALL"`
condition syntax, `Secure="yes"` placement).

**Outcome:** Each candidate appeared correct in isolation. None explained why
the CA reported success (`Return value 1`) in the MSI log yet produced no
file.

**Learning:** Treated the MSI verbose log as untrustworthy and investigated
VBScript internals first. Should have read the `Executing op:
CustomActionSchedule` line and its `CustomActionData` value before going
further.

### Phase 2: WiX CustomActionData sequencing

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

**Gaps exposed by SYSTEM-context deployment:**

1. **`Before="<deferred-CA>"` scheduling is unreliable in SYSTEM context.**
   The immediate setter was scheduled `Before="WriteUpdateJson"`, but
   `WriteUpdateJson` itself was scheduled `After="InstallFiles"`. MSI accepted
   this under narrow circumstances — WiX4's candle with ICE validation
   disabled (`-sval`) emitted the MST without warning, but the resulting
   sequence was implicit: relative positions depended on implicit ordering of
   unrelated standard actions. In SYSTEM-context deployments the setter could
   run after the deferred script was already serialized, leaving
   `CustomActionData` empty at execution time.

2. **Silent VBScript failure path.** The VBScript used `On Error Resume Next`
   and `Session.Property("CustomActionData")`. When `CustomActionData` was
   empty, `installDir` resolved to `""`, `resourcesDir` became `"resources"`
   (a relative path), and `fso.FolderExists(...)` returned `False`. The
   subsequent `Err.Raise` was suppressed by the earlier `On Error Resume
   Next` — Windows Installer reported `Return value 1` because VBScript
   exited cleanly.

**Net effect:** The two gaps masked each other. Fragile sequencing made
`CustomActionData` unreliable in SYSTEM context; silent error handling made
the empty-data case indistinguishable from success in interactive logs where the path was never empty.

### Phase 3: Fix

**What was done:**

- Explicit, dependency-ordered scheduling after files are on disk:
  ```xml
  <Custom Action="SetWriteUpdateJsonData" After="InstallFiles">...</Custom>
  <Custom Action="WriteUpdateJson" After="SetWriteUpdateJsonData">...</Custom>
  ```
- Added `Execute="immediate"` and `Return="check"` explicitly on the setter
  so MSI audits its exit status.
- Added an explicit empty-`CustomActionData` guard in VBScript so the failure
  mode is visible in `msiexec /l*v` logs instead of silent.
- Added `NOT Installed` to the condition so repair/modify does not rewrite
  `update.json`.
- Quoted the `"1"` literal in the condition for string-safe comparison.
- Set `msi.perMachine: true` in `electron-builder.json` so the MSI bakes in
  `ALLUSERS=1` / empty `MSIINSTALLPERUSER` — a machine-scope install that
  works under SYSTEM context. NSIS stays `perMachine: false` for consumer use.

**Why it works:** Making the immediate → deferred dependency **explicit and
observable** removes the "did it actually run?" ambiguity entirely. If the CA
does not receive data, the log now says so explicitly (`CustomActionData is empty —
SetWriteUpdateJsonData did not run`), giving operators an observable signal
instead of requiring them to infer the outcome from side-effects.

## Test Infrastructure

Committed a reusable test harness at `scripts/msi-test/`:

- `test-on-windows.ps1` — Three scenarios: (A) baseline no property,
  (B) interactive `DISABLE_AUTO_UPDATES=1`, (C) SYSTEM context via
  PsExec to simulate SCCM. Writes structured `test-results.json`.
- `run-msi-tests.sh` — macOS orchestrator: `scp`'s MSI + PS1 to VM,
  invokes script over SSH, pulls results back.
- `fetch-logs.sh` — Standalone log puller.
- `README.md` — Usage and VM prerequisites.

Validation on a Windows 10 VM with the patched MSI produced all three
scenarios `PASS`. Log excerpt confirming correct execution:

```
PROPERTY CHANGE: Adding DISABLE_AUTO_UPDATES property. Its value is '1'.
Doing action: SetWriteUpdateJsonData
PROPERTY CHANGE: Adding WriteUpdateJson property. Its value is 'C:\Program Files\Rocket.Chat\'.
Action ended: SetWriteUpdateJsonData. Return value 1.
Doing action: WriteUpdateJson
Action ended: WriteUpdateJson. Return value 1.
```

## Lessons Learned

### 1. `On Error Resume Next` without a matching `On Error Goto 0` hides gaps

Any VBScript CA that uses `On Error Resume Next` must either (a) reset the
handler with `On Error Goto 0` after the fragile block, or (b) check
`Err.Number` immediately after every operation that can fail. The MSI engine
cannot distinguish "script completed with Err=0" from "script completed with
all errors suppressed" — both report `Return value 1`.

### 2. Immediate-to-deferred CA plumbing needs explicit sequencing, not `Before="<deferred>"`

Always schedule both CAs explicitly in the same sequence with a direct
dependency between them:

```xml
<Custom Action="SetFooData" After="InstallFiles">...</Custom>
<Custom Action="FooDeferred" After="SetFooData">...</Custom>
```

Relying on `Before="<deferred-CA>"` is syntactically legal but operationally
fragile — the deferred action's position in the execution script is not the
same as its position in the sequence table, and ICE validation will not always
catch the divergence (especially when `additionalWixArgs: ["-sval"]` disables
it).

### 3. MSI "success" in the log is not proof of correctness

`Return value 1` means "the CA's host process exited cleanly." It says nothing
about whether the CA did what it was supposed to do. For file- or
registry-producing CAs, always assert the observable side-effect
(`Test-Path "<installdir>\resources\update.json"`) in automation, not just
the MSI exit code.

### 4. Enterprise validation requires testing in the actual deployment context

Interactive elevated installs and SYSTEM-context deployments have materially
different property environments and install scope behaviour. Before certifying a
feature for enterprise deployment, reproduce in:

- Interactive elevated install
- `/qn` silent install as a normal admin
- `PsExec -s -i` SYSTEM context (SCCM simulation)

### 5. Enterprise-targeted installers must bake in their install scope

`msi.perMachine: true` (i.e., embed `ALLUSERS=1`) is the right default for
the MSI because MSI is the enterprise deployment vehicle. Leaving it `false`
and requiring every admin to pass `ALLUSERS=1 MSIINSTALLPERUSER=""` on the
command line is a trap — any missing property leads to a per-user install
under the SCCM SYSTEM profile, which is invisible to logged-in users. NSIS
retains `perMachine: false` for consumer installs.

### 6. Cross-building Windows MSI from macOS arm64 is not viable in our tested environment as of April 2026

Attempted `electronuserland/builder:wine` under `--platform linux/amd64`:
WiX4's candle.exe needs Wine-Mono, which is not shipped in that image;
installing it manually inside the container leaves other COM dependencies
broken (`start_rpcss`, `StdMarshalImpl_MarshalInterface`). The practical
options are:

- Build on a Windows machine (CI runner or a VM)
- Use GitHub Actions with a Windows runner

Wine cross-build worked historically for NSIS but does not work for WiX4 MSI
on Apple Silicon. Do not spend time on it; go straight to Windows.

## What This Does Not Address

- **NSIS `/allusers` under SCCM/SYSTEM is still unreliable.** NSIS was never
  designed for SYSTEM-context execution; its per-user vs per-machine probing
  depends on UAC token information that is not meaningful for SYSTEM.
  `docs/enterprise-deployment.md` now documents that enterprise customers must
  use the MSI, not the NSIS installer. Hardening NSIS for SYSTEM context is
  out of scope and would require either flipping NSIS to `perMachine: true`
  (breaks consumer flow) or implementing custom `!ifdef SYSTEM` detection
  inside `build/installer.nsh`.
- **`additionalWixArgs: ["-sval"]` is still set.** Removing it to re-enable
  ICE validation is the right long-term move, but may surface pre-existing ICE
  errors unrelated to this change and would need to be addressed before
  shipping.
