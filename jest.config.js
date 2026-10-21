const fs = require('fs');
const path = require('path');

// Specs that declare `@jest-environment jsdom` run in plain Node, not in the
// Electron runner. jsdom builds its own Node vm context, and since Electron 43
// running code in that context inside an Electron renderer aborts Blink
// ("Check failed: ToExecutionContext(context)"). The runner does not notice
// the dead renderer, so the whole suite hangs. Found by docblock, so a new
// jsdom spec can never land in the Electron project by accident.
const findJsdomSpecs = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return findJsdomSpecs(entryPath);
    if (!/\.(spec|test)\.tsx?$/.test(entry.name)) return [];
    const source = fs.readFileSync(entryPath, 'utf8');
    return /@jest-environment\s+jsdom\b/.test(source)
      ? [
          `<rootDir>/${path.relative(__dirname, entryPath).split(path.sep).join('/')}`,
        ]
      : [];
  });

const JSDOM_SPECS = findJsdomSpecs(path.join(__dirname, 'src'));

// Transpile-only ts-jest: every spec is compiled as an isolated module instead
// of building a full type-checking Program per file. Cold-cache transform time
// drops by roughly 60%, and CI always runs cold. Type errors in specs are still
// caught by `tsc --noEmit` in `yarn lint`, which covers src/** including specs.
// Passed as inline compiler options so tsconfig.json itself is unchanged.
const tsJestTransform = {
  '^.+\\.tsx?$': ['ts-jest', { tsconfig: { isolatedModules: true } }],
};

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
      transform: tsJestTransform,
      errorOnDeprecated: true,
      runner: '@kayahr/jest-electron-runner',
      testEnvironment: '@kayahr/jest-electron-runner/environment',
      testMatch: [
        '<rootDir>/src/*/!(main)/**/*.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/**/renderer.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/whenReady.(spec|test).{js,ts,tsx}',
      ],
      testPathIgnorePatterns: JSDOM_SPECS,
      setupFilesAfterEnv: ['./src/.jest/setup.ts'],
    },
    {
      transform: tsJestTransform,
      errorOnDeprecated: true,
      testEnvironment: 'jsdom',
      testMatch: JSDOM_SPECS,
      setupFilesAfterEnv: ['./src/.jest/setup.ts'],
    },
    {
      transform: tsJestTransform,
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
    {
      transform: tsJestTransform,
      errorOnDeprecated: true,
      testEnvironment: 'node',
      testMatch: ['<rootDir>/scripts/**/*.(spec|test).ts'],
    },
  ],
};
