---
name: new-spec
description: Scaffold a Jest spec for a source file in the correct Electron-runner path (*.main.spec.ts vs nested renderer spec) and verify discovery with --listTests
---

# New Spec

Scaffold a Jest spec file for a given source file, placing it where the
`@kayahr/jest-electron-runner` project config in `jest.config.js` will
actually discover it, then prove discovery before writing any test bodies.

## Arguments (required)

- `source`: path to the source file to test, e.g.
  `src/downloads/main.ts` or `src/ui/components/TopBar/UpdateLabel.tsx`.

## Steps

### 1. Classify the source file

Determine which of the two Jest `projects` in `jest.config.js` the spec
belongs to:

- **Main process** — the file lives under `src/*/main/**` or is named
  `src/**/main.ts`, or it imports main-process-only Electron APIs
  (`app`, `BrowserWindow`, `ipcMain`, `session`, `dialog`, etc. from
  `'electron'`). These use the runner: `@kayahr/jest-electron-runner/main`.
- **Renderer** — everything else: React components (`.tsx`), Redux
  reducers/actions, preload-adjacent renderer helpers, hooks. These use
  `@kayahr/jest-electron-runner/environment`.
- **Preload** — preload scripts (`src/**/preload/**`, `src/**/preload.ts`)
  are tested as renderer-project specs (see existing examples under
  `src/servers/preload/__tests__/*.spec.ts`) even though they run in a
  preload context at runtime.

### 2. Derive the exact spec path from the real `testMatch`

Quote directly from `jest.config.js` — do not paraphrase:

Main-process project:

```
'<rootDir>/src/*/main/**/*.(spec|test).{js,ts,tsx}',
'<rootDir>/src/**/main.(spec|test).{js,ts,tsx}',
'<rootDir>/src/systemCertificates.(spec|test).{js,ts,tsx}',
'<rootDir>/src/constants.(spec|test).{js,ts,tsx}',
```

Renderer project:

```
'<rootDir>/src/*/!(main)/**/*.(spec|test).{js,ts,tsx}',
'<rootDir>/src/**/renderer.(spec|test).{js,ts,tsx}',
'<rootDir>/src/whenReady.(spec|test).{js,ts,tsx}',
```

Consequences for naming/placement:

- Main-process spec for `src/downloads/main.ts` → sibling file
  `src/downloads/main.spec.ts` (matches the `src/**/main.(spec|test).*`
  pattern), OR a file under `src/downloads/main/**` if that subfolder
  pattern applies instead.
- Renderer spec for a file directly under `src/<module>/` → **flat
  `src/<module>/*.spec.ts(x)` is NOT matched** by
  `src/*/!(main)/**/*.(spec|test).*` (that pattern requires at least one
  extra path segment after `src/<module>/`). Per `AGENTS.md` (Testing),
  nest it instead:
  - `src/<module>/__tests__/<Name>.spec.ts(x)` (existing convention, see
    `src/logViewerWindow/__tests__/LogTimeline.spec.tsx`), or
  - colocated next to a component in its own subfolder, e.g.
    `src/ui/components/TopBar/UpdateLabel.spec.tsx` (the component itself
    lives one segment deep under `src/ui/components/`, satisfying the
    `**` in the pattern), or
  - `src/<module>/renderer.spec.tsx` if the module exposes a single
    renderer entry point.
- When in doubt, mirror the nearest existing sibling spec's location
  rather than inventing a new layout.

### 3. Scaffold boilerplate

**Main-process spec** (`*.main.spec.ts` convention — note some existing
files use `.main.spec.ts` explicitly even though the `testMatch` pattern
only requires `main.spec.ts`; follow the sibling files in that directory):

```typescript
import { someElectronApi } from 'electron';

import { handle } from '../../ipc/main';
import { functionUnderTest } from '../moduleUnderTest';

jest.mock('electron', () => ({
  someElectronApi: {
    someMethod: jest.fn(),
  },
}));

jest.mock('../../ipc/main', () => ({
  handle: jest.fn(),
}));

const someMethodMock = someElectronApi.someMethod as jest.MockedFunction<
  typeof someElectronApi.someMethod
>;

describe('functionUnderTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does the expected thing', () => {
    // ...
  });
});
```

**Renderer spec** (React component, using the project's `test-utils`):

```tsx
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockDispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (action: unknown) => mockDispatch(action),
}));

import { renderWithStore, screen, userEvent } from '../../test-utils';
import { ComponentUnderTest } from './ComponentUnderTest';

describe('ComponentUnderTest', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders the expected content', () => {
    renderWithStore(<ComponentUnderTest />, { preloadedState: {} as any });

    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

`renderWithStore`/`screen`/`userEvent` come from `src/ui/test-utils.tsx`
— adjust the relative import depth to match the spec's location. The
`react-i18next` mock block above MUST be copied into every spec file
(it cannot live in the shared helper — `jest.mock` only hoists inside
the module that declares it; see the comment at the top of
`src/ui/test-utils.tsx`).

**Fuselage component mocks** — only mock the specific Fuselage component
that breaks under jsdom (no real layout engine); keep everything else
real via `jest.requireActual`:

```tsx
// Select: jsdom has no native <Select> option rendering path for
// Fuselage's custom listbox, so swap it for a plain <select>.
jest.mock('@rocket.chat/fuselage', () => {
  const actual = jest.requireActual('@rocket.chat/fuselage');
  return {
    ...actual,
    Select: ({
      options,
      value,
      onChange,
    }: {
      options: [string, string][];
      value: string;
      onChange: (key: string) => void;
    }) => (
      <select
        data-testid='my-select'
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
    ),
  };
});
```

```tsx
// Dropdown: Fuselage's <Dropdown> positions itself with usePosition,
// which under jsdom has no real layout and so renders its children as
// null. Replace only that component with an inline passthrough.
jest.mock('@rocket.chat/fuselage', () => {
  const actual = jest.requireActual('@rocket.chat/fuselage');
  return {
    __esModule: true,
    ...actual,
    Dropdown: ({ children }: { children: React.ReactNode }) => (
      <div data-testid='dropdown'>{children}</div>
    ),
  };
});
```

Fuselage `Dialog` renders correctly under jsdom without a mock in most
existing specs (see `src/ui/components/OutlookCredentialsDialog/index.spec.tsx`)
— only add a `Dialog` mock if a real failure shows it needs one; don't
mock it preemptively.

**`Date.now` pinning** — if the spec seeds a timestamp close to the
component's own mount-time `Date.now()` call (e.g. comparing a
`startTime`/`seenAt` prop against a later user-driven `Date.now()`
call), pin the clock instead of relying on wall-clock ordering:

```typescript
const NOW = Date.now();
const spy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
try {
  // render + interact; anything that reads Date.now() sees NOW
} finally {
  spy.mockRestore();
}
```

Unpinned specs that seed timestamps "near" mount time are flaky by a
race of 1ms — see `src/ui/components/TopBar/DownloadsIndicator.spec.tsx`
for the canonical example and comment.

### 4. Prove discovery, then run only that file

```bash
yarn test --listTests --runTestsByPath <spec-path>
yarn test --runTestsByPath <spec-path>
```

`--listTests` must print the exact spec path back; if it prints nothing,
the path does not match `testMatch` — revisit step 2 before writing test
bodies.

### 5. Never run the full suite

Do not run bare `yarn test` for this task. Scope every run to the new
spec's path with `--runTestsByPath`.

## Traps (from AGENTS.md Testing)

- Flat `src/<module>/*.spec.ts` renderer specs are silently not
  discovered — no error, just zero tests collected.
- Main-process specs must avoid renderer-only APIs (DOM, React) since
  they run under `testEnvironment: 'node'`, not the Electron renderer
  environment.
- UI/paint correctness cannot be proven by a component spec — a clipped
  SVG or mispositioned element still passes every DOM assertion. Specs
  verify behavior/markup; use `dev-app-verify` for visual verification.
- Screen-capture / WebRTC / portal behavior cannot be validated in
  software-rendered test environments at all — do not attempt to spec
  around that; see `docs/postmortem-screen-picker-startup-enumeration.md`.
- Platform-specific APIs (`process.getuid()`, `process.getgid()`,
  `process.geteuid()`, `process.getegid()`) should be exercised via
  optional chaining and fallbacks in the source, not mocked in the spec,
  unless defensive coding genuinely isn't possible.
- `--coverage` runs exclude a fixed list of specs
  (`COVERAGE_INCOMPATIBLE_SPECS` in `jest.config.js`) that fail only
  under Istanbul instrumentation inside the Electron V8 context. Plain
  `yarn test` still runs and gates them — don't assume a coverage-run
  pass/fail reflects the plain-run result for those files.
