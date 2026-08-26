# Post-Mortem: Notification Quick Reply (SUP-1097)

Cross-repository: `Rocket.Chat.Electron` (PR #3464) and `Rocket.Chat` (PRs #41875,
#41897).
A copy of this write-up is published under **Desktop Application** in the R&D
Confluence space.

## Objective

Make quick replies typed into desktop notifications reach the room the user meant,
and give administrators a fleet-wide switch to disable the reply field. Reported
through support (SUP-1097) by an enterprise customer running Desktop 4.15.6 on
Windows, with a screen recording showing a typed reply that never appeared in the
conversation.

## Why this spans two repositories

A notification reply crosses both codebases, and three distinct defects sat along
that path:

| Layer | Defect | Fix |
| --- | --- | --- |
| Desktop (`Rocket.Chat.Electron`) | Reply routing state was released while the OS notification was still repliable, so the reply was never delivered | PR #3464 |
| Web client (`Rocket.Chat`) | `useNotification.ts` sent the reply without `tmid`, so a delivered thread reply posted to the main channel | PR #41875 |
| Web client (`Rocket.Chat`) | Every notification was force-closed 10s after showing — the signal Desktop was treating as end-of-life | PR #41897 |

Neither repository's test suite can prove the feature works, and neither fix alone
resolves the customer's report. The support ticket described a single behavior
("replying to a notification does nothing useful"), which is why triage initially
split it into three separate tracks.

## Impact

- Replies typed into a Windows toast, or into its Action Center card afterwards,
  now post to the correct room — with no time limit on how long the card has been
  sitting in the Action Center. That is the path in the customer's recording.
- Replies to thread notifications land in the thread rather than the main channel.
- Administrators can disable the inline reply field centrally via
  `overridden-settings.json` (`isNotificationQuickReplyEnabled`), the option the
  customer asked for after declining Require Interaction as a workaround.
- Notifications now appear on workspaces served over plain HTTP. That path was
  previously not covered: an unguarded `navigator.clipboard` assignment aborted
  script injection before the Notification shim installed, so LAN, dev, and some
  on-prem installs got no desktop notifications at all.
- Desktop notifications are no longer force-closed 10 seconds after appearing; they
  stay as the operating system presents them and auto-close only when a duration is
  explicitly requested.
- `useNotification` has test coverage for the first time.
- Windows toast behavior is documented in `AGENTS.md` instead of being rediscovered
  per investigation.

## Root cause

### Web client: `tmid` dropped on the reply path

`apps/meteor/client/hooks/notification/useNotification.ts` built its reply with the
room id only, even though the desktop notification payload it had just received
already carried `tmid` (the server populates it in
`app/lib/server/functions/notifications/desktop.ts`). The same hook's click handler
_did_ read `notification.payload.tmid` to navigate into the thread, so the data was
demonstrably at hand — the reply path simply never used it.

The hook had no test coverage, which is how the omission survived a refactor that
migrated this exact call to REST (#40675).

### Web client: a 10-second auto-close left over from a removed setting

The same hook scheduled `setTimeout(() => n.close(), …)` for every notification,
falling back to 10 seconds whenever the server sent no `duration` — which it never
does on this path. That fallback is a remnant: `Desktop_Notifications_Duration`
began as an opt-in setting defaulting to `0` (#2955), and #15737 ("Remove a non
working setting 'Notification Duration'") deleted the setting, its API route, user
preference and model methods, leaving behind the client line that had read it. On
Windows the call cannot remove a notification the OS still shows, so its only
effect was to signal end-of-life for something the user could still act on.

### Desktop: reply routing released while the card was still live

Two platform behaviors combine, and the app sat on the wrong side of both:

1. A Windows Action Center card stays repliable indefinitely. When the banner times
   out, Electron reports it as `NotificationDismissed(should_destroy=false)` — it
   still emits the JS `close` event, but the card remains on screen and actionable,
   and calling `close()` on the instance does not remove it.
2. The web client unconditionally auto-closes every desktop notification 10 seconds
   after showing it (the server never sends `duration`, so the fallback always
   applies).

The app treated that close as end-of-life and released the state the reply path
needed while the card the user was looking at was still live. A reply typed
afterwards had nowhere to be routed.

This is also why the report read as thread-specific. There is no room-type branch
anywhere in the Desktop notification path — composing a thread reply simply takes
longer than 10 seconds, so it always lost that race while quick direct-message
replies won. Two separate defects produced one symptom, and the timing coincidence
made the Desktop one look like the web client's.

## Timeline

### 1. Triage split the report into three tracks

The ticket bundled three complaints: replies not posting on Windows, thread replies
appearing in the main channel, and no fleet-wide way to disable quick reply. Reading
both codebases established that the first was Desktop, the second web client, and
the third a new setting — and that the first two were independent, not one bug seen
twice.

### 2. Web client: pass `tmid` (succeeded)

A one-line change plus the hook's first specs (thread reply carries `tmid`; room
reply carries none). Rebasing onto `develop` mid-review required redoing it against
the REST migration that had landed in the meantime, which is also the change that
had introduced the omission.

### 3. Desktop: register `Notification.handleActivation` (succeeded, incomplete)

The app discarded its `Notification` instance when Windows moved the banner to the
Action Center, so the per-instance `reply` listener was gone by the time the user
replied. Added Windows activation routing: pass `id` to the constructor (becomes the
toast Tag), register the static `handleActivation` callback, hold per-notification
routing metadata in a bounded map, stop deleting the preload-side handler on close.

This replaced a closure that could not go missing (`ipcMeta` captured per listener)
with shared state — a lifetime question that step 6 had to answer.

### 4. Desktop: over-broad exclusive routing (caught in review)

Because activation fires in addition to instance events for live objects, all three
event types were routed exclusively through `handleActivation`. Root-body clicks
then stopped being handled: Windows produces structured activation arguments only
for reply and action interactions, and a body click arrives _only_ as the instance
`click` event (confirmed in Electron's `windows_toast_notification.cc`). Fix: keep
`click` unconditional, route only reply/action through activation.

### 5. Real-Windows validation exposed the HTTP-workspace gap

No toast appeared at all on the test workspace. In `src/injected.ts`,
`navigator.clipboard.writeText = …` ran unguarded inside `start()`; on a plain-HTTP
workspace `navigator.clipboard` is undefined, so `start()` threw before reaching
`window.Notification = class RocketChatDesktopNotification`. The shim never
installed and `Notification.permission` stayed `denied`. Guarded the assignment.

### 6. Real-Windows validation exposed the routing lifetime

Replies typed more than ~10 seconds after a notification appeared were not
delivered, while faster ones were — see Root cause. Fixed by retaining routing
metadata for as long as the card can be replied to, keeping the timed-out instance
reachable so a dismissal genuinely removes the card, and broadcasting as a fallback
when metadata is legitimately gone.

### 7. Two hypotheses pursued and disproved

**Electron drops activations for certain notification shapes.** A standalone
Electron 42.5.0 app fired six notifications varying title prefix, `@mention` body,
spaces and length; all six activated. No upstream issue was filed. Cost: one
build-and-drive cycle.

**Windows delivers activations twice.** A verification run showed one reply posting
twice (two ids, 29 ms apart), and Electron's documented "invoked in addition to
instance events" made it plausible; a dedupe guard was written with passing tests. A
clean experiment — Action Center cleared, one live toast, one Reply click — produced
exactly one message. The apparent duplicate was two stacked cards, one holding
unsent text from an earlier probe, submitting together. The guard was reverted
before merge; a short dedupe window would have swallowed a user legitimately sending
the same short reply twice.

### 8. End-to-end verification

A Desktop build installed from its own `.exe` on Windows 10, driven against a live
workspace running the web-client change, with every outcome asserted server-side.

## Lessons Learned

### 1. One symptom can be two defects in two repositories

The customer saw "replying does nothing useful". Behind it were an undelivered reply
(Desktop) and a misplaced reply (web client), which happened to correlate because
thread replies take longer to compose than the 10-second window that broke delivery.
When a report spans layers, resist explaining every observation with the first root
cause found — check whether the remaining symptoms still follow from it.

### 2. Neither repository's tests can prove a cross-repository feature

Desktop's suite proves the reply is delivered; the web client's proves `tmid` is
sent. Only a Desktop build running against a server carrying the web-client change
proves a user's thread reply lands in the thread. Build that combined check when a
behavior spans repositories — it is also what caught the routing-lifetime defect.

### 3. Assert the outcome, never the interface

Windows closes a toast's reply card on submit whether or not the app received
anything, and pressing Enter does not submit at all — the text just stays in the
box. Both look identical to success on screen, which is exactly why the customer's
recording read as "reply does nothing". Every proof here came from querying the
server for the message.

### 4. A confident root cause built only on documentation is a hypothesis

Both disproved hypotheses in step 7 came from docs plus code reading and had passing
tests. Tests passing proves the code does what its author believed, never that the
belief was true; both were settled in minutes by one observation on real hardware.
Require the observation before shipping the fix a document implies.

### 5. Suspect your own instrumentation before the product

Three apparent product failures were harness artifacts: Enter not submitting
replies, stale cards submitting together, and a diagnostic probe that re-registered
`handleActivation` — which _replaces_ the stored callback, unregistering the app's
real handler and guaranteeing the silence it was measuring.

### 6. Verify the artifact is the artifact you ship

The first validation builds were produced without `NODE_ENV=production`, which the
project's CI workflows set explicitly. They resolved a development userData
directory and ran dev-only code paths — a different program from the release
artifact. Symbol-verifying the installed bundle and matching the CI build
environment keep that equivalence honest.

### 7. Diagnostics that drop user input must be visible in packaged builds

Both drop paths in `handleNotificationActivation` used `console.warn`, which in a
packaged build goes nowhere a user or support engineer can read. A dropped reply
left no trace and the investigation had to be reconstructed with a debugger attached
to a VM. The scoped app logger turns the same event into a one-line log answer.

### 8. Untested hooks lose behavior across refactors

The `tmid` omission entered during a REST migration of the very call that dropped
it, in a hook with no specs. The fix added the hook's first tests; the general point
is that a refactor's blast radius is bounded by test coverage, not by intent.

## Windows toast behavior reference

| Behavior                                                         | Consequence                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Action Center card outlives its banner and the app's `close()`   | Never key reply state to a close or dismiss signal                           |
| Only reply/action carry activation arguments (`type=…&tag=…`)    | A body click arrives only as the instance `click` event — keep that listener |
| `Notification.handleActivation` replaces the stored callback     | A debug probe registering its own unregisters the app's                      |
| Enter does not submit a toast reply — only the Reply button does | Automation and QA steps that press Enter produce false failures              |
| The card closes on submit either way                             | Assert replies at the server, never by watching the notification             |
| Stacked cards holding unsent text can submit together            | Clear the Action Center between reply tests                                  |

## Building the live Windows test capability

Neither repository's tests could prove this feature (Lesson 2), so the verification
had to run on real Windows. That capability did not exist in usable form at the
start of the arc and was built alongside the fix, in the mOSdat harness, in
collaboration with the engineer working on it. It is now reusable for any Desktop
change.

**What the setup does end to end:** builds a PR branch natively on a Windows VM,
installs the resulting `.exe`, greps the installed `app.asar` for symbols unique to
the change (so a stale build cannot masquerade as a fresh one), provisions a
disposable Rocket.Chat server from the matching PR's container image, seeds a
workspace with two accounts over REST, then drives the real desktop through
VNC/VLM and asserts every outcome against the server rather than the screen. Both
Windows 10 and Windows 11 VMs are wired up.

**Harness defects found and fixed during the arc** (all in mOSdat, by its
maintainer, from field reports produced here):

| Problem                                                                       | Why it mattered                                                                                                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Builds ran `yarn build` without `NODE_ENV=production`                         | Every prior Windows artifact was a dev-flavoured build — different userData path, dev-only code paths, no notifications. Invalidated any earlier Windows verdict for this repo |
| `lint` validated a shallower schema than the runner                           | Scenarios passed lint, then the runner rejected them with dozens of schema errors                                                                                              |
| Runtime variables injected after scenario load                                | Scenarios using them failed at load with an undefined-variable error                                                                                                           |
| Pre-run workspace check read static config, not the scenario's resolved value | Every run aborted before touching the VM                                                                                                                                       |
| `preflight` ran its Linux probe battery against Windows VMs                   | Its verdict was noise, so a genuine early warning in the same output was dismissed                                                                                             |
| The GUI launch routine spawned a visible PowerShell console                   | It stole focus and swallowed VNC keystrokes mid-run                                                                                                                            |

**Environment lessons worth keeping with the VMs:** a VM sitting at a UTC-offset
clock lands inside Windows' default Focus Assist quiet hours, which silently
suppresses every toast; the taskbar news widget and OS nag toasts (OneDrive
sign-in, "Turn On Windows Backup") steal focus and pollute screenshot assertions;
and one-shot `schtasks` entries must be deleted immediately after running, or they
respawn on reboot.

**A design correction that came out of it:** the first scenarios put a VLM call in
the interaction path — trigger a notification, then ask a vision model to locate the
reply box. A Windows toast lives about six seconds and a VLM round trip takes
twenty to forty, so the interaction always lost. The fix was to stop treating
observation and interaction as the same step: interact on a deterministic timed
path, assert the outcome over REST, and keep the vision model for evidence and for
surfaces that persist. An earlier attempt to buy time by flipping the user's
`requireInteraction` preference was the wrong instinct — it mutated the system under
test into a configuration the customer had explicitly rejected.

## Scope notes

- **Replies after the app has fully quit are not delivered.** The app is not running
  to receive the activation — a platform constraint, not something these changes
  address.
- **Both changes must be deployed for thread notification replies to work.** Desktop
  carries the reply; the web client places it in the thread.
- **Nothing further is outstanding on the auto-close.** The fixed 10-second close
  was itself removed (PR #41897, below) rather than left as an open question.
