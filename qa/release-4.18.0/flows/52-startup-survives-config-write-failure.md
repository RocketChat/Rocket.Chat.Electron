---
id: REL418-QA-052
title: App Starts When The Settings File Cannot Be Written Atomically
platforms: [windows]
priority: high
qase:
  suite: Release 4.18.0 / App shell
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: On a Windows profile whose settings folder is a redirected network path, the app starts, shows its window, and keeps saving settings. On a normal profile the app starts and writes settings as before.
---

# App Starts When The Settings File Cannot Be Written Atomically

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712. Build under test: 4.18.0-alpha.6.
- Changed surface: #3507 (shipped in 4.17.2: `src/app/main/persistence.ts` retry without atomic rename and in-memory fallback, startup failure dialog in `src/main.ts`, `persistence` log scope).
- User-visible risk: On a Windows roaming profile with folder redirection, `%APPDATA%` is a UNC path. The rename behind the settings store fails with `UNKNOWN` (-4094). Before the fix, the app exited at startup with no window and no dialog.
- Hypothesis: With a failing rename, the app opens its window, settings still persist, and the log names the recovery. On a healthy profile the change causes no regression.
- Smallest useful proof: 7 unit tests in `persistence.main.spec.ts` and a fault injection by the PR author. The PR author did not test a real UNC share. Steps 1 to 4 are the healthy-path regression. Steps 5 to 8 need a lab machine with a redirected profile. If you have no such machine, mark steps 5 to 8 blocked and say so in the note.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Install the build under test on a normal Windows profile. Start the app. | Local profile | The main window opens. | Start the app and wait for the window. |
| 2 | Click the "Window" menu in the menu bar. Click "App settings". Click "General" in the left list. Change one toggle, for example "Tray icon". Close the settings window. | One toggle changed | The toggle keeps its new value. | Change the toggle and read the value. |
| 3 | Quit the app. Click the "File" menu and click "Quit Rocket.Chat". Start the app again. Open the settings window. | None | The toggle from step 2 has the new value. The window opened at once. | Restart and read the value. |
| 4 | Click the "Help" menu. Click "Open Log Viewer". In the search field "Search logs..." type `settings store`. | `settings store` | No line with level Error shows for the settings store. | Search the log and read the levels. |
| 5 | On the lab machine with a redirected profile, where `%APPDATA%` points to a network share, install the build under test. Start the app. | Redirected profile (UNC path) | The main window opens. No error dialog shows. | Start the app and wait for the window. |
| 6 | Change one toggle in the settings window as in step 2. Quit and start the app again. | One toggle changed | The toggle keeps its new value after the restart. | Restart and read the value. |
| 7 | Open the log viewer as in step 4. Search for `non-atomic`. | `non-atomic` | If the share rejected the atomic rename, a warning line "Atomic write of the settings store failed; retrying without atomic rename" shows. A second line follows: "Recovered the settings store using non-atomic writes". If the share did not reject the rename, no line shows, and this step passes with a note. | Search the log and copy the lines. |
| 8 | If the app showed an error dialog at startup in step 5, read the dialog. | Dialog text | The dialog names the error and the log location. The app is not blocked silently. Record this as a failure of step 5 and attach the log. | Capture the dialog. |

## Evidence

- Screenshot of the main window after step 5.
- The log lines from steps 4 and 7.
- The type of the profile (local or redirected) and the share type.

## Failure Signals

- The app exits at startup with no window.
- A settings change does not persist after a restart.
- The log shows "continuing with in-memory settings" on a healthy local profile.
