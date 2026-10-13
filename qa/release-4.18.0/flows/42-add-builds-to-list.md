---
id: REL418-QA-042
title: Add web UI builds to the Settings list
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Web UI previews
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: Settings lists develop and PR builds only after the registry confirms they exist, and shows commit, build date, and PR state.
---

# Add web UI builds to the Settings list

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3541 (build list in Settings > Appearance, `UiPreviewHistory*.tsx`, `ui-preview/add` handler), #3534 (`develop` input), #3525 (source rules).
- User-visible risk: a typo or a PR with no build is listed or applied. A listed build shows a wrong commit, date, or PR state. The list is lost after restart.
- Hypothesis: with Developer Mode on, type `develop` or a PR number in the field and click Add. The list shows the build with its short commit and build date. An unknown PR number lists nothing and shows "Could not load: ghcr.io/rocketchat/rocket.chat-web:pr-1 was not found". Add downloads no bundle. Failure mode: a missing build is listed, or the field clears on failure. This runs on every platform.
- Smallest useful proof: local UI repro against ghcr.io. The tester needs network access to ghcr.io and api.github.com. Dated values in the author's notes are examples only.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the app with one workspace signed in. Open the Help menu and click Developer Mode so that it has a check mark. | None. | Developer Mode has a check mark. | Click the menu item and read its state. |
| 2 | Open the app settings window (macOS: app name menu, Preferences. Windows and Linux: File, App settings). Click Appearance (palette icon) in the left list. Scroll to the bottom. | None. | A section titled "Load a web UI build" shows below a divider. It has a description, a text box with the hint "develop, 42364 or http://127.0.0.1:4173/", and a blue Add button. The Add button is disabled while the box is empty. Below it, a row for the workspace shows "Using the server's UI." and a disabled Restore server UI button. | Open Settings, select Appearance, and read the section. |
| 3 | Click the text box, type `develop`, and click Add. | `develop` | The text "Checking that the build exists…" shows for a moment. The box then clears. A row shows the name "develop", a short commit of 7 characters, and a date like "built Oct 5, 2026, 10:39 AM". The row has an Apply button, a refresh icon button, and a trash icon button on the right. | Type, click Add, and read the new row. |
| 4 | Type `DEVELOP` in capital letters and click Add. | `DEVELOP` | No second "develop" row shows. The existing "develop" row stays, at the top of the list. | Add the text and count the rows named develop. |
| 5 | Type an open Rocket.Chat pull request number and press Enter. | Number of an open PR that has a web preview build, for example `42364`. | The box clears. A row shows "PR #<number>", a tag with the PR state (Open, Draft, Merged, or Closed), the short commit, and the build date. The PR title shows on a second line. The new row is above "develop". | Type the number, press Enter, and read the row. |
| 6 | Type `#` followed by the same number and click Add. | `#42364` | No second row shows for the same PR. The existing row moves to the top. | Add the text and count the rows. |
| 7 | Type `1` and click Add. | `1` | Red text under the box reads "Could not load: ghcr.io/rocketchat/rocket.chat-web:pr-1 was not found". The box keeps the value `1`. No row is added. | Add the text and read the red text and the box value. |
| 8 | Edit the box: add one more character to `1`. | `12x` | The red text goes away at once. | Type and check the text. |
| 9 | Clear the box. Type `ftp://example.com/x` and click Add. | `ftp://example.com/x` | Red text reads "Could not load: Not develop, a PR number or an http(s) URL: ftp://example.com/x". No row is added. | Add the text and read the red text. |
| 10 | Clear the box. Type `http://127.0.0.1:1/` and click Add. | `http://127.0.0.1:1/` | Red text under the box starts with "Could not load:". No row is added. | Add the text and read the red text. |
| 11 | Click the trash icon button on the PR row. Hover it first. | None. | The tooltip reads "Remove from the list". The row goes away. The "develop" row stays. | Hover, click, and count the rows. |

## Evidence

- Screenshot of the list with the develop row and the PR row.
- Screenshot of the "was not found" message.
- The commit and date shown on each row.

## Failure Signals

- A build that does not exist appears in the list.
- The box clears after a failed add.
- A row has no commit or no date for a registry build.
- A bundle download starts on Add (the `ui-previews` folder grows).
