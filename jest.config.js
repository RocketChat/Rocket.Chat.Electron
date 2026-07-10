// @kayahr/jest-electron-runner executes tests directly in an Electron
// BrowserWindow's native V8 context (via vm.Script#runInThisContext, not a
// proper vm sandbox). That context enforces V8's AllowCodeGenerationFromStrings
// restriction, which Istanbul's coverage instrumentation trips over: it injects
// `new Function(...)` counter calls into every instrumented module. This is not
// configurable via webPreferences (contextIsolation/nodeIntegration/sandbox all
// verified to have no effect) or CSP (the runner's own bootstrap HTML already
// allows 'unsafe-eval') — it's enforced at V8 context-creation time, which has
// no exposed Electron or Node API. The suites below all load preload/renderer-
// context modules and fail with "EvalError: Code generation from strings
// disallowed for this context" only when --coverage is active; they pass
// cleanly under plain `yarn test`. Excluded here (coverage runs only) so CI's
// `yarn test:coverage` stays green; they still run and gate on pass/fail via
// plain `yarn test`.
const COVERAGE_INCOMPATIBLE_SPECS = [
  '<rootDir>/src/jitsi/__tests__/preload.spec.ts',
  '<rootDir>/src/screenSharing/__tests__/preload.spec.ts',
  '<rootDir>/src/servers/preload/__tests__/badge.spec.ts',
  '<rootDir>/src/servers/preload/__tests__/clipboard.spec.ts',
  '<rootDir>/src/servers/preload/__tests__/documentViewer.spec.ts',
  '<rootDir>/src/servers/preload/__tests__/favicon.spec.ts',
  '<rootDir>/src/servers/preload/__tests__/internalVideoChatWindow.spec.ts',
  '<rootDir>/src/servers/preload/__tests__/sidebar.spec.ts',
  '<rootDir>/src/servers/preload/__tests__/uniqueID.spec.ts',
  '<rootDir>/src/servers/preload/__tests__/userLoggedIn.spec.ts',
  '<rootDir>/src/servers/preload/userRoles-server-url.spec.ts',
  '<rootDir>/src/servers/preload/userRoles.spec.ts',
  '<rootDir>/src/store/__tests__/index.spec.ts',
  '<rootDir>/src/ui/components/utils/createAnchor.spec.ts',
  '<rootDir>/src/ui/preload/__tests__/messageBox.spec.ts',
  '<rootDir>/src/ui/preload/__tests__/sidebar.spec.ts',
  '<rootDir>/src/whenReady.spec.ts',
];

const isCoverageRun = process.argv.includes('--coverage');

module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/.jest/**',
    '!src/public/**',
  ],
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/app/', '/dist/'],
  projects: [
    {
      preset: 'ts-jest',
      errorOnDeprecated: true,
      runner: '@kayahr/jest-electron-runner',
      testEnvironment: '@kayahr/jest-electron-runner/environment',
      testMatch: [
        '<rootDir>/src/*/!(main)/**/*.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/**/renderer.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/whenReady.(spec|test).{js,ts,tsx}',
      ],
      testPathIgnorePatterns: isCoverageRun ? COVERAGE_INCOMPATIBLE_SPECS : [],
      setupFilesAfterEnv: ['./src/.jest/setup.ts'],
    },
    {
      preset: 'ts-jest',
      errorOnDeprecated: true,
      runner: '@kayahr/jest-electron-runner/main',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/*/main/**/*.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/**/main.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/systemCertificates.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/constants.(spec|test).{js,ts,tsx}',
      ],
      setupFilesAfterEnv: ['./src/.jest/setup.ts'],
    },
  ],
};
