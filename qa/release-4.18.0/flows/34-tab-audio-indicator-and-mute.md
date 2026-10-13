---
id: REL418-QA-034
title: Workspace tab shows an audio indicator that mutes the workspace on click
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
expected_result: A tab shows a speaker badge while its workspace plays sound. Click mutes and unmutes it. The tab menu Mute workspace item does the same. A restart starts unmuted.
---

# Tab Audio Indicator And Mute

## Review Basis

- Comparison range: 4.17.4..origin/dev at acaf3a712.
- Changed surface: #3491. It tracks `audio-state-changed` per workspace, with
  a 2-second hold-off. `WorkspaceTab` draws the `volume` and `volume-off`
  badge. The tab context menu has a `Mute workspace` checkbox. A focused tab
  opens that menu with ContextMenu or Shift+F10.
- User-visible risk: The badge shows for the wrong workspace, stays after the
  sound stops, or does not mute. A mute stays after a restart. The badge shows
  in the sidebar layout, where the PR says it must not.
- Hypothesis: A background workspace that plays sound gets a speaker badge on
  its tab. A click on the badge mutes it and shows the muted badge. The tab
  menu checkbox and the keyboard path give the same result. After a restart
  the workspace is unmuted with no badge.
- Smallest useful proof: Local UI repro in the installed build. The sound
  comes from the DevTools console. The PR author used a real voice message.

## Steps

| Step | Action | Test data | Expected result | Agent action |
| --- | --- | --- | --- | --- |
| 1 | Start the installed build with two signed-in workspaces. Open the `View` menu, then `Workspace switcher`, then click `Tabs`. | Workspace A and workspace B | Two tabs show in a strip at the top of the window. | Set the switcher to `Tabs`. |
| 2 | Click tab B in the top strip, so workspace B is selected and workspace A is in the background. | | Tab B is the selected tab. | Select tab B. |
| 3 | Right-click tab A. Click `Open DevTools`. In the DevTools panel, click the `Console` tab. Type the command and press Enter. Keep the system volume audible. | `var c=new AudioContext(),o=c.createOscillator();o.connect(c.destination);o.start()` | A steady tone plays. Tab A shows a small round grey badge with a speaker icon at its right end. Tab B stays selected. If no tone plays, play an audio file that is attached in a room of workspace A instead. | Evaluate the command in the console of workspace A. Capture the tab strip. |
| 4 | Hover over tab A. | | The tooltip ends the first line with `— Playing audio`. | Hover the tab and read the tooltip. |
| 5 | Click the speaker badge on tab A. | | The tone stops. The badge changes to a speaker with a slash. Tab B stays selected. | Click the badge. Capture the strip. |
| 6 | Hover over tab A. | | The tooltip first line ends with `— Muted`. | Hover the tab and read the tooltip. |
| 7 | Click the slashed speaker badge. | | The tone plays again. The badge is the plain speaker again. | Click the badge. Capture the strip. |
| 8 | In the DevTools console of workspace A, type the command and press Enter. Wait 3 seconds. | `o.stop()` | The tone stops. About 2 seconds later the badge goes away. | Evaluate `o.stop()` and capture after 3 seconds. |
| 9 | Right-click tab A. Look at the menu. | | The menu has a checkbox item `Mute workspace` between `Copy URL` and `Open DevTools`. It is not checked. | Open the tab context menu. |
| 10 | Click `Mute workspace`. In the console, start the tone again with the command from step 3, but use new variable names. | `var c2=new AudioContext(),o2=c2.createOscillator();o2.connect(c2.destination);o2.start()` | No sound plays. Tab A shows the slashed speaker badge. | Check the item. Start the tone. Capture the strip. |
| 11 | Right-click tab A. Click `Mute workspace` again. | | The tone plays. The badge is the plain speaker. | Uncheck the item. |
| 12 | Press Tab on the keyboard until tab A has the focus ring. Press Shift+F10. On a Mac keyboard without the function row mode, press Shift+Fn+F10. | | The tab menu opens below tab A. It has `Mute workspace`. Press Escape to close it. | Focus the tab and send Shift+F10. |
| 13 | Start the tone with the command from step 10 but use new variable names. Click the speaker badge on tab A to mute. | `var c3=new AudioContext(),o3=c3.createOscillator();o3.connect(c3.destination);o3.start()` | The badge is the slashed speaker. No sound plays. | Start the tone and click the badge. |
| 14 | Quit the app (Cmd+Q on macOS, File > Quit on Windows and Linux). Start it again. Look at the tab strip. | | Tab A has no badge. | Quit, restart, and capture the strip. |
| 15 | Right-click tab A. Click `Open DevTools`. In the console, start the tone with new variable names. | `var c4=new AudioContext(),o4=c4.createOscillator();o4.connect(c4.destination);o4.start()` | The tone plays. Tab A shows the plain speaker badge, not the slashed one. | Start the tone and capture the strip. |
| 16 | Open the `View` menu, then `Workspace switcher`, then `Sidebar`. Hover over the icon of workspace A in the sidebar. | | The sidebar shows a square icon for each workspace. No speaker badge shows. The tooltip first line ends with `— Playing audio`. | Switch the layout, hover, and read the tooltip. |
| 17 | Set `Workspace switcher` back to `Tabs`. In the console of workspace A, type `o4.stop()` and press Enter. | `o4.stop()` | The tone stops. | Restore the layout and stop the tone. |

## Evidence

- Screenshots of the tab strip for steps 3, 5, 8, 10, and 16.
- Tooltip text for steps 4 and 6.

## Failure Signals

- Tab B shows the badge when A plays the sound.
- The badge stays more than 5 seconds after the sound stops.
- A click on the badge selects the tab instead of muting.
- The tone is still audible with the muted badge.
- The tab menu has no `Mute workspace` item, or Shift+F10 does nothing.
- The mute stays after the restart.
- The badge shows in the sidebar layout.
