module.exports = {
  projects: [
    {
      preset: 'ts-jest',
      errorOnDeprecated: true,
      runner: '@jest-runner/electron',
      testEnvironment: '@jest-runner/electron/environment',
      testMatch: [
        '<rootDir>/src/*/!(main)/**/*.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/**/renderer.(spec|test).{js,ts,tsx}',
      ],
      globals: {
        'ts-jest': {
          tsConfig: {
            noUnusedLocals: false,
            noUnusedParameters: false,
          },
        },
      },
    },
    {
      preset: 'ts-jest',
      errorOnDeprecated: true,
      runner: '@jest-runner/electron/main',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/*/main/**/*.(spec|test).{js,ts,tsx}',
        '<rootDir>/src/**/main.(spec|test).{js,ts,tsx}',
      ],
      globals: {
        'ts-jest': {
          tsConfig: {
            noUnusedLocals: false,
            noUnusedParameters: false,
          },
        },
      },
    },
  ],
};
