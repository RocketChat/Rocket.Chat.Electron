# Testing

How specs are found and run, how to keep them green on every platform, and how
to check what a spec cannot see. For coverage numbers and more spec gotchas,
read [COVERAGE.md](COVERAGE.md).

## Where a spec lives decides how it runs

Spec names and locations decide which Jest project runs a spec (`testMatch` in
`jest.config.js`):

- Main-process specs live under `src/<module>/main/` (named `*.main.spec.ts`
  by convention), or they are named `src/<module>/main.spec.ts`. The `main/`
  directory selects the main-process runner, not the `.main.spec.ts` suffix.
- Renderer specs (`*.spec.ts` / `*.spec.tsx`) live in a nested path such as
  `src/<module>/<subdir>/*.spec.ts(x)`, or they are named
  `src/<module>/renderer.spec.ts(x)`. Jest does not discover any other flat
  `src/<module>/*.spec.ts` file.
- Specs under `scripts/` run in their own Jest project, with
  `testEnvironment: 'node'`.
- A spec with the `@jest-environment jsdom` docblock runs in its own Jest
  project, in plain Node. `jest.config.js` finds these specs by the docblock.
  Do not run jsdom inside the Electron runner. Since Electron 43, the renderer
  aborts with `Check failed: ToExecutionContext(context)`, and the runner hangs
  until CI kills the job. These specs also count under `--coverage`.

When you are not sure that Jest finds a new spec, run
`yarn test --listTests --runTestsByPath <file>`.

## Run specs

Run specs with `yarn test <path>`. The script adds `--forceExit` and
`xvfb-maybe`. A bare `npx jest` has no `--forceExit`, and it has hung after
the suite passed.

## Make each spec pass on every platform

Tests run on Windows, macOS and Linux CI. Make each change and each spec work
on all three platforms.

For platform-specific APIs, prefer optional chaining and fallbacks to mocks:

```typescript
// PREFERRED — works on all platforms without mocks
const uid = process.getuid?.() ?? 1000;
const runtimeDir =
  process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 1000}`;
```

Mock only when defensive code is not possible. These POSIX-only APIs
(undefined on Windows) need it: `process.getuid()`, `process.getgid()`,
`process.geteuid()` and `process.getegid()`.

## Check UI changes at runtime

UI changes need a runtime or visual check, because component tests cannot
see paint. A clipped SVG passes every DOM assertion.

- Use the `dev-app-verify` skill
  ([skills/dev-app-verify/SKILL.md](../skills/dev-app-verify/SKILL.md)) to
  drive and screenshot the running `yarn start` app through the port-9339
  inspector.
- Use the Developer Mode menu items `Simulate Update Flow`,
  `Simulate Download` and `Simulate Disconnected` to run those flows without
  real downloads or updates.
- `Simulate Disconnected` is a Developer menu checkbox. It forces the presence
  connection of the active workspace to `disconnected` on the read side only,
  and the real connection stays up. Use it to check the disconnected tray icon
  and menu line without a network drop.

## Screen capture needs hardware GL

You CANNOT test screen capture, WebRTC or portal behavior in a
software-rendered VM. Chromium gates the PipeWire capture path on hardware GL,
and the gate moves between Electron versions. Test on hardware GL (GPU
passthrough or a physical machine). Assert at the dbus level
(`org.freedesktop.portal.ScreenCast` requests), not on dialog visibility,
which is flaky across portal and boot states. Full story:
[postmortem-screen-picker-startup-enumeration.md](postmortem-screen-picker-startup-enumeration.md).

## Web client events

The desktop app reads the web client's `window` events: `startup`,
`unread-changed*`, `status-changed`, `Custom_Script_Logged_In` and
`Custom_Script_Logged_Out`. Before you change code that reads them, run
`yarn probe:web-signals --server <url>` against a disposable server. The probe
checks the Meteor build and the Vite build. Follow the `web-signals-probe`
skill ([skills/web-signals-probe/SKILL.md](../skills/web-signals-probe/SKILL.md)).
Do not read `Custom_Script_On_Logout`, because the Meteor build does not fire
it on a forced logout.

## Test runner and CI speed

Read this before you change `jest.config.js`, the test runner, or the
`validate-pr` workflow. Full story:
[postmortem-validate-pr-ci-speed.md](postmortem-validate-pr-ci-speed.md).

- `@kayahr/jest-electron-runner` simulates the Electron environment. It forces
  `--maxWorkers=1` and spawns one Electron process per spec file. The only CI
  parallelism is the cross-job `--shard`, and since the transform fix that
  spawn is most of each shard's ~3 min. Do NOT try more workers, other runner
  classes or a faster transformer to cut that floor.
- ts-jest runs transpile-only (`tsconfig: { isolatedModules: true }` inline in
  `jest.config.js`, with `tsconfig.json` unchanged). Do NOT switch back to
  `preset: 'ts-jest'`. That default builds a type-checking Program per spec
  file, CI has no warm Jest cache, and the Test step became 4× slower.
  `tsc --noEmit` in `yarn lint` catches type errors in specs.
- Do NOT switch the transformer to `@swc/jest` before you fix the two spec
  patterns that it breaks. The measured gain is ~20 s per shard.
  - An assignment onto `require(mod).fn` fails, because swc emits read-only
    getters.
  - A read of a `const` inside a `jest.mock` factory fails, because swc's
    hoisting hits the temporal dead zone.
- `validate-pr` runs the ubuntu shards on `ubuntu-24.04-arm`.
  - Cache keys MUST include `runner.arch`, because both architectures report
    `runner.os == Linux`.
  - The test job sets `PUPPETEER_SKIP_DOWNLOAD`, because the puppeteer
    postinstall has no arm64 Linux Chromium. Only `yarn build-assets` uses
    puppeteer.
- Before you blame the CI runners for a slowdown, compare the per-step timings
  (`gh run view <id> --json jobs`) across months. In Sep 2026 the Windows Test
  step had grown from 1 min to 27 min only from suite growth and per-file
  type-checking. The runners did not change.
