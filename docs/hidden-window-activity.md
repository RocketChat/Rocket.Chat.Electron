# Hidden-window visual activity

The reproduced gap is a launch with `--start-hidden` and the tray enabled.
Electron's default `show: false` window still reports its document as visible
until its first show. In the animated fixture, the never-shown workspace kept
requesting animation frames. Ordinary hide and minimize already stopped them.
The baseline includes the macOS transparency fix from #3528.

The fix disables initial shell painting only for a valid start-in-tray launch.
That launch completes on `did-finish-load`, because `ready-to-show` requires
painting. Normal launches, including `--start-hidden` with the tray disabled,
keep the existing first-paint behavior.

A workspace must finish booting before its visual layout is suppressed. The
preload forwards the existing web-client `startup` signal to its host. The
host then uses the same visibility wrapper as inactive workspaces, without
removing the webview. A full navigation resets the boot guard. A hidden host
has no paint tick to commit the new embedded-view visibility, so the host
flushes layout once at the hide boundary. The native frame check fails when
that flush is removed. There is no additional timer policy, renderer freeze,
workspace reload, network disconnection, or change to call-window settings.

See [Electron's initial-paint documentation](https://www.electronjs.org/docs/latest/api/browser-window#showing-the-window-gracefully).

## Reproduce

Use two built checkouts: the baseline at `428eaea` and this branch. Run
`yarn install` and `yarn build` from each checkout's root. Run the benchmark
from this branch, passing the other checkout through `--app`:

```sh
yarn benchmark:hidden-window --start-hidden --expect before --app ../desktop-before --samples 20 --output /tmp/before-animated.json
yarn benchmark:hidden-window --start-hidden --expect after --samples 20 --output /tmp/after-animated.json
yarn benchmark:hidden-window --start-hidden --expect after --static --samples 20 --output /tmp/after-static.json
yarn benchmark:hidden-window --start-hidden --expect before --app ../desktop-before --static --samples 20 --output /tmp/before-static.json
```

The launcher creates an isolated profile and a localhost-only synthetic
channel, then runs the actual compiled desktop shell and workspace preload.
It cleans up its own Electron process after the report is complete. Invalid
arguments and failed assertions return a nonzero exit code.

The scene has 48 avatars at 48 × 48 and six inline images at 192 × 192,
using 54 distinct URLs. The GIF is a generated 96 × 96 color grid with twelve
frames at 80 ms per frame. The static control uses its first frame. The
animated scene also runs a `requestAnimationFrame` counter to verify frame
scheduling; this counter contributes to the synthetic workload. These are
not measurements of a typical Rocket.Chat channel.

Each condition checks never-shown startup, visible, hidden, minimized, and
restored states. Each state warms up for three seconds, then records twenty
samples at 250 ms intervals. Visible image captures run outside the sampling
interval, reject blank pixels, and verify changing GIF frames or a still PNG.
The window stays above other windows during visible checks. Background event
delivery, exactly-once receipt, retained webview identity/no reload, scroll
position, and keyboard focus are checked separately from CPU sampling.

## Energy comparison

On macOS, start these collectors in separate terminals before running the
four energy phases. `powermetrics` requires administrator authentication.
Do not run builds or tests during the measurement.

```sh
sudo powermetrics --samplers gpu_power -i 1000 -n 560 -o /tmp/hidden-window-gpu.txt
top -l 560 -s 1 -stats pid,command,cpu -pid "$(pgrep -x WindowServer)" > /tmp/hidden-window-windowserver.txt
```

Run BEFORE / AFTER / AFTER / BEFORE, each in a fresh app instance. Wait for
the first GPU sample before starting:

```sh
yarn benchmark:hidden-window --start-hidden --expect before --app ../desktop-before --energy --initial-only --output /tmp/before-1.json
yarn benchmark:hidden-window --start-hidden --expect after --energy --initial-only --output /tmp/after-1.json
yarn benchmark:hidden-window --start-hidden --expect after --energy --initial-only --output /tmp/after-2.json
yarn benchmark:hidden-window --start-hidden --expect before --app ../desktop-before --energy --initial-only --output /tmp/before-2.json
yarn ts-node -O '{"module":"commonjs"}' scripts/summarize-hidden-window-energy.ts /tmp/hidden-window-gpu.txt /tmp/hidden-window-windowserver.txt /tmp/hidden-window-energy.json /tmp/before-1.json /tmp/after-1.json /tmp/after-2.json /tmp/before-2.json
```

Each energy phase warms up for 45 seconds, then takes sixty CPU samples at
one-second intervals while the window remains never shown. GPU power and
active residency are weighted by their recorded interval lengths. The first
cumulative `top` sample is discarded. Boundary intervals are excluded because
the text timestamps have one-second precision. The analysis requires at least
fifty seconds of usable GPU data and fifty WindowServer samples per phase.

CPU percentages retain `app.getAppMetrics()` units. GPU-process CPU is CPU
time used by the GPU process, not GPU hardware utilization. WindowServer CPU
uses `top` units, where 100% is one core. `powermetrics` reports estimated
system-wide GPU power and hardware active residency. Derived joules per
minute are a conversion of average estimated milliwatts, not an independent
measurement. Other applications remain running. These counters do not establish
per-app energy attribution, total application power, or battery-life savings.

## Lifecycle measurements

Apple M4, macOS 27.2 (26B123), Electron 43.8.1, GPU compositing enabled,
one 1512 × 982 logical display at 2× scale and approximately 120 Hz, on AC
power. The main window uses saved bounds of 1000 × 700 logical pixels.
Means of twenty samples per state from the four lifecycle runs:

| State            | Scene    | Renderer CPU before |   After | GPU-process CPU before |   After |
| ---------------- | -------- | ------------------: | ------: | ---------------------: | ------: |
| initially-hidden | Animated |             0.6597% | 0.0097% |                1.1242% | 0.0003% |
| visible          | Animated |             0.6483% | 1.4256% |                1.0915% | 4.6846% |
| hidden           | Animated |             0.0007% | 0.0029% |                0.0003% | 0.0003% |
| minimized        | Animated |             0.5356% | 0.5199% |                0.0007% | 0.0002% |
| restored         | Animated |             0.4435% | 0.4255% |                0.6064% | 0.5646% |
| initially-hidden | Static   |             0.0122% | 0.0091% |                0.0205% | 0.0004% |
| visible          | Static   |             0.0027% | 0.0033% |                0.0002% | 0.0002% |
| hidden           | Static   |             0.0013% | 0.0038% |                0.0003% | 0.0003% |
| minimized        | Static   |             0.5273% | 0.5154% |                0.0005% | 0.0003% |
| restored         | Static   |             0.0202% | 0.0294% |                0.0619% | 0.0746% |

These short windows include activation and minimization transients. The
visible-after run had higher CPU than its baseline, and minimized CPU was
similar in both builds, including the static scene. No improvement in these
states is claimed. The targeted gap is never-shown startup. All animation,
blank-pixel, background-delivery, no-reload, scroll, and focus assertions
passed. [Raw lifecycle samples](performance/hidden-window-lifecycle.json).

## Hidden-startup CPU and energy measurements

Apple M4, macOS 27.2, Electron 43.8.1; four fresh, never-shown app instances in BEFORE / AFTER / AFTER / BEFORE order. Each phase warms up for 45 seconds, then takes sixty one-second CPU samples. CPU means use 120 samples per build. GPU means are duration-weighted.

| Counter                            |   Before |    After |
| ---------------------------------- | -------: | -------: |
| Renderer CPU (Electron %)          |  0.1634% |  0.0083% |
| GPU-process CPU (Electron %)       |  0.3071% |  0.0004% |
| Estimated system GPU power         | 84.37 mW | 47.18 mW |
| GPU HW active residency            |   13.21% |    6.24% |
| WindowServer CPU (100% = one core) |   10.48% |    8.05% |
| Derived system GPU energy per 60 s |   5.06 J |   2.83 J |

| Run | Build  | GPU power | GPU active residency | WindowServer CPU |
| --- | ------ | --------: | -------------------: | ---------------: |
| 1   | before | 122.05 mW |               16.20% |           11.82% |
| 2   | after  |  17.62 mW |                4.63% |            7.51% |
| 3   | after  |  76.74 mW |                7.85% |            8.59% |
| 4   | before |  47.36 mW |               10.27% |            9.15% |

Individual GPU-power runs were 122.05 / 17.62 / 76.74 / 47.36 mW in that order. The second AFTER run exceeded its paired BEFORE run. These system-wide samples are noisy; they do not establish a reliable energy-saving percentage or a battery-life benefit.

Animation-frame callbacks during the one-minute samples were 7,208 and 7,206 before, and zero in both fixed runs. Background-event delivery passed in all four phases. The analysis retained [56, 56, 56, 57] GPU intervals and [55, 55, 55, 55] WindowServer intervals per phase after excluding boundaries.

[Raw energy counters](performance/hidden-window-energy.json) · [Raw CPU samples](performance/hidden-window-energy-cpu.json).

## Validation and limits

- Unit coverage includes launch modes on Windows/macOS/Linux, boot gating,
  unrelated IPC messages, full-navigation reset, and keeping webviews mounted.
- Removing the initial-paint guard, correct startup event, boot safeguard,
  visibility condition, or boot acknowledgment makes targeted tests fail.
  Removing the layout flush makes the native frame check fail.
- Meteor 8.9.0 and the Vite `develop` signal probes passed in both the page
  world and an isolated world, including login, incoming messages, presence,
  and forced logout.
- Live macOS checks used a disposable Rocket.Chat 8.9.0 server. A saved login
  resumed while never shown, DMs updated unread state, and the notification
  request reached the native handler. A simulated native click opened its DM.
- A localhost WebRTC fixture opened through the actual desktop call bridge.
  Its connection, audio packets, decoded video frames, and control messages
  continued while the main window was hidden/minimized. It used generated
  media and contacted no other user.
- The hidden-renderer heartbeat detected an intentional main-thread hang.
  Existing automatic recovery replaced the renderer process and restored the
  logged-in connection. A healthy run before that test produced no boot reports.
- macOS denied the development app's notification banner with
  `UNErrorDomain error 1`. Signed-package banner/sound/action/reply checks,
  real call-provider and screen-sharing checks, and Windows/Linux runtime
  validation remain for platform QA. No cross-platform energy claim is made.
