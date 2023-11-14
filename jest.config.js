module.exports = {
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
