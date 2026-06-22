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
  coverageThreshold: {
    global: {
      lines: 21,
      statements: 21,
      branches: 19,
      functions: 15,
    },
  },
  projects: [
    {
      preset: 'ts-jest',
      errorOnDeprecated: true,
      runner: '@kayahr/jest-electron-runner',
      testEnvironment: '@kayahr/jest-electron-runner/environment',
      testMatch: [
        '<rootDir>/src/*/!(main)/**/*.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/**/renderer.(spec|test).{js,ts,tsx}',
      ],
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
      ],
      setupFilesAfterEnv: ['./src/.jest/setup.ts'],
    },
  ],
};
