# Performance measurement

`yarn perf:measure` compares how much CPU, GPU, memory and power the app uses
under different conditions. Use it before and after an optimization, and put
its report in the PR.

A condition is a built checkout plus a settings profile. Examples: `dev`
against a fix branch, or the same build with a setting off and on. The tool
runs each condition several times in a rotating order and reports the median.

## What it measures

| Metric | Source | Platforms | Scope |
| --- | --- | --- | --- |
| `app CPU % (all processes)` and `CPU % <type>` | `app.getAppMetrics()`, difference of `cpu.cumulativeCPUUsage` | all | the app only |
| `app idle wakeups/s` | `cpu.idleWakeupsPerSecond` | macOS, Linux (Windows reports 0) | the app only |
| `app memory MB (working set)` | `memory.workingSetSize` at the end of the window | all | the app only |
| `window visible % of checks` | `document.visibilityState` of the root window, every 5 s | all | the app only |
| `GPU utilization % (system)` | `ioreg` `Device Utilization %`, once per second | macOS | the whole machine |
| `WindowServer CPU % (system)` | `ps -o time=` of `WindowServer`, start and end of the window | macOS | the macOS compositor |
| `GPU power mW`, `CPU power mW`, `CPU+GPU+ANE power mW`, `GPU active residency %` | `powermetrics`, with `--power` | macOS | the whole machine |

CPU is in percent of one core, so 150 means one and a half cores.

Window effects, such as the macOS vibrancy material, cost CPU and GPU in
`WindowServer`, the macOS compositor, and not in the app's own processes. The
app metrics can stay the same while `WindowServer CPU %` and
`GPU utilization %` change.

The GPU, WindowServer and power metrics cover the whole machine. The tool always adds a
condition named `no app (system baseline)`, with no app running. Compare
against it to see what the rest of the machine adds.

## Steps

1. Prepare one checkout for each build that you compare. Use a worktree for
   each one. In each checkout, run `yarn install` and
   `NODE_ENV=production yarn build`. A dev build (`yarn start`) is slower and
   gives different numbers.
2. Write a config file. Example: `dev` against a fix branch, and the fix with
   a setting on:

   ```json
   {
     "rounds": 3,
     "settleSeconds": 15,
     "sampleSeconds": 30,
     "window": { "width": 1200, "height": 800 },
     "reference": "dev",
     "conditions": [
       { "name": "dev", "appDir": "../Rocket.Chat.Electron-worktrees/dev-build" },
       { "name": "fix", "appDir": "../Rocket.Chat.Electron-worktrees/my-fix" },
       {
         "name": "fix, transparency on",
         "appDir": "../Rocket.Chat.Electron-worktrees/my-fix",
         "overriddenSettings": { "isTransparentWindowEnabled": true }
       }
     ]
   }
   ```

3. Run the tool from the repository root:

   ```sh
   yarn perf:measure --config perf.json --out .localdev/perf/my-change
   ```

4. Read `report.md` in the output folder. `results.json` has the value of
   every round.

## Config fields

| Field | Default | Meaning |
| --- | --- | --- |
| `rounds` | `3` | How many times each condition runs. `--rounds` overrides it. |
| `settleSeconds` | `15` | Wait time after launch, before the setup and the sample window. |
| `sampleSeconds` | `30` | Length of the sample window. |
| `window` | 1200x800 | Size of the root window during the sample. |
| `reference` | first app condition | The condition that the report compares the others against. |
| `baseline` | `true` | `false` removes the no-app condition. |
| `conditions[].name` | required | A unique name for the report. |
| `conditions[].appDir` | `.` | The checkout, relative to the config file. |
| `conditions[].overriddenSettings` | none | Written to `overridden-settings.json` in the profile. |
| `conditions[].config` | none | Written to `config.json` in the profile (the persisted user settings). |
| `conditions[].args` | `[]` | Extra Electron arguments, such as `--disable-gpu`. |
| `conditions[].env` | `{}` | Extra environment variables. |
| `conditions[].setup` | none | A main-process expression that runs once, after the settle time. |
| `conditions[].workload` | none | A main-process expression that runs when the sample window starts. |

Each run uses a new, empty profile in a temporary folder, through
`--user-data-dir`. The tool never reads or changes your real Rocket.Chat
profile.

### Setup and workload expressions

The tool evaluates these expressions in the main process through the
inspector. `require` is not in scope there: use
`process.mainModule.require('electron')`. An expression can return a promise.

Open the settings window before the sample:

```json
"setup": "process.mainModule.require('electron').Menu.getApplicationMenu().getMenuItemById('preferences').click()"
```

Start a scroll loop in the root window renderer:

```json
"workload": "process.mainModule.require('electron').BrowserWindow.getAllWindows()[0].webContents.executeJavaScript('setInterval(() => window.scrollBy(0, 40), 16)')"
```

An empty profile has no workspace. To measure a workspace view, add a server
in `config.json` or in `setup`, and use a test server, not a production one.

## Power with powermetrics

`--power` records CPU, GPU and combined power once per second with
`powermetrics`. It needs root, and the tool calls it with `sudo -n`, so it
needs a passwordless sudo rule for that one binary:

```sh
sudo visudo -f /etc/sudoers.d/powermetrics
# add this line, with your user name:
<user> ALL=(root) NOPASSWD: /usr/bin/powermetrics
```

Without the rule, `--power` stops before the first run and prints this
instruction.

## Read the results correctly

- Compare medians, and look at the range in brackets. When two ranges
  overlap, the difference can be noise. Add rounds or a longer sample window.
- Write down the load average from the report. Do not discard a run because
  the machine is busy: users have busy machines too. But compare only
  conditions from the same run, because the rotating order spreads the load
  over all of them.
- macOS does not composite a covered window, so a covered window hides the
  cost of window effects. The tool keeps the root window on top during each
  sample and checks `document.visibilityState` every 5 seconds. The
  `window visible % of checks` row must be 100 for every app condition, and
  the tool prints a warning for each run where it is not. Do not use the
  machine during a run.
- Before the first run, the tool warns about other Electron apps and a busy
  Spotlight indexer, and the report lists them. Another Rocket.Chat window
  (for example a `yarn start` dev app, which is always transparent on macOS)
  adds the same window cost that you measure. A new worktree starts
  Spotlight indexing of its `node_modules`. Close them, or wait for the index.
- `GPU utilization %` is the share of time that the GPU was busy, not power.
  Use `--power` for milliwatts.
- An Electron version without `cpu.cumulativeCPUUsage` falls back to
  `percentCPUUsage`, the average since the previous `getAppMetrics()` call.

## Code

- `scripts/perf-measure.ts`: the CLI (launch, inspector, sampling).
- `scripts/perfMeasure.lib.ts`: config parsing, round order, metric parsing,
  statistics and the report. `scripts/perfMeasure.lib.spec.ts` tests it.
