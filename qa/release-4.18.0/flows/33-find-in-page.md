---
id: REL418-QA-033
title: Find in page opens with Cmd+F or Ctrl+F and searches the workspace
platforms: [windows, macos, linux]
priority: high
qase:
  suite: Release 4.18.0 / Workspaces
  priority: high
  severity: major
  status: actual
  automation: manual
  qase_id: null
requires: [installed_prerelease_build]
test_links: []
expected_result: The Edit menu item Find… and the Cmd+F or Ctrl+F shortcut open a find bar that counts, steps through, and clears matches in the active workspace.
---

# Find In Page In The Active Workspace

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3492. Edit menu item `Find…` with the accelerator
  `CommandOrControl+F`, `FindInPageBar`, and the `findInPage` calls in
  `ServerPane`.
- User-visible risk: Keystrokes inside the workspace never reach the host
  window. The shortcut fails when the menu is hidden, or when the cursor is in
  the message composer. The find field loses focus after the first letter.
- Hypothesis: On every platform, the menu item and the shortcut open the bar
  with the field focused. The counter, Enter, Shift+Enter, the arrow buttons,
  Escape, and a tab switch behave as the bar defines.
- Smallest useful proof: Local UI repro in the installed build. The PR lists
  two open manual checks: Ctrl+F with the menu bar hidden on Windows and
  Linux, and Cmd+F with the cursor in the composer. Steps 11 and 8 cover them.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed build with one signed-in workspace. Open a room that has many messages with a common word. Click the room name in the left room list. | A room with the word `the` in many messages | The room shows its messages. | Open the room. |
| 2 | Open the `Edit` menu. On macOS it is in the menu bar at the top of the screen. On Windows and Linux it is in the menu bar at the top of the window. If the menu bar is hidden, press Alt first. Click `Find…`. It is the last item of the menu, below a separator line. | | A small bar shows at the top-right corner of the workspace page. The bar has a text field with the grey hint `Find in page`. Three small icon buttons sit to its right: an up arrow, a down arrow, and a cross. The cursor blinks in the text field. | Open `Edit` and choose `Find…`. Capture the bar. |
| 3 | Type the word in the text field. | `the` | The page shows highlighted matches. The right end of the text field shows a counter such as `1 of 12`. The first match is highlighted in a stronger color. The field keeps the focus after each letter. | Type the word and read the counter. |
| 4 | Press Enter. Press Enter again. Then press Shift+Enter. | | The counter goes to `2 of N`, then `3 of N`, then back to `2 of N`. The stronger highlight moves to each match. | Press the keys and read the counter after each press. |
| 5 | Click the down arrow button. Click the up arrow button. | | The counter goes up by one for the down arrow and down by one for the up arrow. | Click the buttons and read the counter. |
| 6 | Select all text in the field. Type a word that is not on the page. | `zzqqxx` | The counter shows `No matches`. The page has no highlight. | Replace the text and read the counter. |
| 7 | Press Escape. | | The bar closes. All highlights are gone. | Press Escape and capture the page. |
| 8 | Click in the message composer at the bottom of the room. Type a few letters. Press Cmd+F on macOS, or Ctrl+F on Windows and Linux. Type the word. | Composer text `hello`, find word `the` | The bar opens. The new letters go into the bar field and not into the composer. The composer text stays `hello`. | Focus the composer, press the shortcut, type, and read both fields. |
| 9 | With the bar open, press the shortcut again. Type a different word. | `message` | The text in the field is selected on the second press. The typed word replaces it. The counter updates. | Press the shortcut again, type, and read the counter. |
| 10 | Click the cross button in the bar. | | The bar closes. Highlights are gone. | Click the cross. |
| 11 | Windows and Linux only. Open the `View` menu. Click `Menu bar` to turn it off. Click in the workspace page. Press Ctrl+F. | | The bar opens and the field has the focus, with the menu bar hidden. Press Escape to close it. Turn `Menu bar` on again. | Toggle `View` > `Menu bar`, press Ctrl+F, and capture the bar. |
| 12 | Only with a second workspace. Open the bar in the first workspace and type a word. Click the second workspace tab in the top strip. Click the first tab again. | `the` | The bar is closed in the first workspace. No highlight is left on the page. | Switch the tabs and capture the first workspace. |

## Evidence

- Screenshot of the bar with a counter (step 3).
- Screenshot of the `No matches` state (step 6).
- Screenshot of the composer and the bar after step 8.

## Failure Signals

- The menu item or the shortcut does nothing.
- The field loses the focus after the first letter.
- Letters go into the composer while the bar is open.
- The counter does not change with Enter or the arrow buttons.
- Highlights stay after the bar closes or after a tab switch.
- Ctrl+F does nothing with the menu bar hidden.
