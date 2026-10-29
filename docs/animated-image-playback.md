# Animated image playback

Open **Settings → Appearance → Automatically play animated images** to
control raster image animation in all desktop workspaces. The default is on.
The preference is saved across app restarts. Turning it on allows normal
workspace behavior, including the workspace's own GIF preference.

![Animated image playback preference](images/animated-image-playback.png)

When off, supported images stay visible without animation. GIF, APNG and
animated WebP are verified by the bundled rendering check, including an
extensionless avatar URL. The policy operates on decoded images, so it does
not depend on a URL ending in `.gif`. Videos, CSS animations and SVG
animations are outside this control's tested scope.

Reload each workspace after changing the preference to update images that
were already loaded. No application restart is required. This follows
[Electron's image policy limitation](https://www.electronjs.org/docs/latest/api/web-contents#contentssetimageanimationpolicypolicy).
The app sets the initial policy before a workspace loads, and follows
preference changes for subsequently loaded images. It does not automatically
reload a workspace or rewrite images in the web client's DOM.

Right-click an HTTP(S) image and choose **View image animation** to play that
image in a separate window. The window uses the workspace's session and
referrer for authenticated image requests. Scripts, Node integration,
popups and user navigation are disabled. Closing the viewer leaves the
workspace's animation preference unchanged. For data/blob images, enable
playback and reload the workspace instead.

## Existing preferences

The web client's [Autoplay GIFs](https://docs.rocket.chat/docs/accessibility-and-appearance)
setting is useful for its interactive GIF controls. The desktop setting adds
a browser image policy across all workspaces and the verified raster image
formats, including avatars. A desktop policy can also stop a GIF that the
workspace would otherwise play on interaction; use the separate viewer in
that case.

[Auto Load Images and Collapse Embedded Media](https://docs.rocket.chat/accounts)
change loading or visibility. They do not provide this combination of visible
still images and a desktop-wide animation policy. CSS reduced-motion media
queries are not a substitute for controlling raster image decoding. This
preference is explicit and preserves the existing default regardless of OS
motion settings.

## Reproduce rendering checks and performance comparison

From the repository root after `yarn install`, run:

```sh
yarn electron scripts/benchmark-image-animation.ts --output /tmp/image-animation.json
```

Use `--verify-only` to run just the rendering checks. Add Chromium's
`--force-prefers-reduced-motion` switch before the script path to check the
reduced-motion case.

The local fixture scene contains 48 avatars at 48 × 48 and six inline images
at 192 × 192, using distinct URLs split equally among GIF, APNG and WebP.
Each animated fixture contains twelve 96 × 96 frames at 80 ms per frame.
Three rounds compare the current autoplay policy, disabled playback, and a
static PNG control. Each condition warms up for three seconds, then takes
60 samples at 250 ms intervals. The second round reverses the order.

The window stays visible above other windows. Frame captures before and
after sampling assert that the autoplay condition is actually animating and
the disabled/static conditions are still. Each capture crops to the image
rectangle and checks for the fixture's color variation, so a uniform blank
image fails even when its decoded dimensions are intact. Frame captures
are outside the CPU sampling interval. The checks also verify that existing
animations require a reload and that re-enabling playback works after
reloading.

The JSON records raw samples, per-round means, Electron/Chromium versions,
CPU model and GPU configuration. CPU values come from
[`app.getAppMetrics()`](https://www.electronjs.org/docs/latest/api/app#appgetappmetrics)
and retain Electron's reported units. GPU-process CPU is CPU time consumed
by that process, not GPU hardware utilization. These synthetic measurements
do not establish whole-app, battery-life or real-channel savings. Run on the
target OS and hardware before generalizing the results.

## Measured comparison

The [recorded benchmark](performance/animated-image-playback.json) contains
all 540 samples from a macOS run on an Apple M4, using Electron 43.8.1 with
GPU compositing enabled. Means of the 180 raw samples for each condition:

| CPU metric (Electron-reported percent) | Autoplay on | Playback off | Static control |
| --- | ---: | ---: | ---: |
| Renderer | 0.5235% | 0.0069% | 0.0122% |
| GPU process | 1.2241% | 0.0065% | 0.0040% |

The limitations above apply to these numbers. They compare the `animate`
and `noAnimation` policies on the fixture scene, rather than two full app
versions running a live workspace.


## GPU power and WindowServer comparison (macOS)

The optional `--energy` mode uses OFF / ON / ON / OFF order, with a fresh
workspace-page load for each phase, a 45-second warm-up, and 60 one-second
samples. The same 54-image scene and window dimensions apply. Visibility and focus
are recorded alongside the image-paint and animation checks.
It records WindowServer CPU with `top`, discarding its initial sample.
This follows the counters and counterbalanced order used in
[PR #3528](https://github.com/RocketChat/Rocket.Chat.Electron/pull/3528#issuecomment-6102870874).
The image policy applies on reload, so this test reloads the page rather
than restarting the app as that window-transparency test required.

In one terminal, start the system GPU sampler. macOS requires administrator
authentication for `powermetrics`:

```sh
sudo powermetrics --samplers gpu_power -i 1000 -n 480 -o /tmp/image-animation-gpu.txt
```

Immediately start the fixture run in a second terminal:

```sh
yarn electron scripts/benchmark-image-animation.ts --energy --output /tmp/image-animation-energy-cpu.json
```

After both commands finish, combine their timestamped data:

```sh
node scripts/summarize-image-animation-energy.ts /tmp/image-animation-energy-cpu.json /tmp/image-animation-gpu.txt /tmp/image-animation-energy.json
```

The summary includes duration-weighted estimated GPU power, hardware active
residency, integrated estimated GPU energy, and WindowServer CPU. It drops
intervals near phase boundaries because the GPU text timestamps have only
one-second precision. A phase fails validation if less than 50 seconds of
GPU data remain. The normalized joules-per-60-seconds value is calculated
from average milliwatts, rather than an additional energy measurement.

GPU power and residency and WindowServer CPU are system-wide counters.
Other applications remain running. These measurements cannot attribute
energy solely to Rocket.Chat or predict battery life. Results depend on the
display, refresh rate, machine state, and other compositor work.

### Recorded GPU/WindowServer results

Energy follow-up using the GPU/WindowServer counters from [#3528](https://github.com/RocketChat/Rocket.Chat.Electron/pull/3528#issuecomment-6102870874):

Apple M4, macOS 27.0.1 (26A434), Electron 43.8.1, one display reporting 1920 × 1080 at 100 Hz, on AC power. This uses the same synthetic 54-image scene in a 680 × 720 opaque Electron window. Each OFF / ON / ON / OFF phase reloads the page, warms up for 45 seconds, then samples for one minute. These are visible-image phases, not scrolling or a live workspace. The image policy needs a page reload, so this test does not restart the entire app between phases as the transparency test did.

Two-run means (GPU counters weighted by sample duration):

| Counter | Playback OFF | Playback ON |
| --- | ---: | ---: |
| WindowServer CPU (100% = one core) | 12.33% | 20.89% |
| Estimated system GPU power | 47.05 mW | 119.38 mW |
| GPU HW active residency | 9.63 % | 19.16 % |
| Derived GPU energy per 60 seconds | 2.82 J | 7.16 J |

Individual runs:

| Run | Playback | GPU power | GPU HW active residency | WindowServer CPU |
| --- | --- | ---: | ---: | ---: |
| 1 | OFF | 15.77 mW | 6.86% | 8.94% |
| 2 | ON | 90.56 mW | 17.69% | 20.92% |
| 3 | ON | 148.21 mW | 20.64% | 20.87% |
| 4 | OFF | 77.81 mW | 12.36% | 15.72% |

GPU power and HW active residency came from `powermetrics --samplers gpu_power -i 1000`. WindowServer CPU came from `top`, discarding the first sample. The analysis retained 56–57 GPU intervals per phase after excluding boundary intervals because GPU timestamps have one-second precision; it retained 60 WindowServer CPU intervals per phase. Joules per 60 seconds are calculated from average estimated milliwatts, not an additional energy measurement.

The window remained visible, and image pixels/animation were validated before and after sampling. Keyboard focus was not held fixed throughout the run, and other apps remained running. The OFF baseline also drifted from 15.77 to 77.81 mW. Both ON runs had higher GPU power than their paired OFF run, but this is an exploratory **system-wide** comparison, not isolated Rocket.Chat energy attribution, total app power, a precise energy-saving percentage, or a battery-life claim.

[Recorded samples and context](performance/animated-image-playback-energy.json).
