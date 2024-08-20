import path from 'path';

import { app } from 'electron';

expect.extend({
  toMatchAppPath(received: string, expected: string) {
    const fullExpectedPath = path.join(app.getAppPath(), 'app', expected);

    const options = {
      comment: 'Paths should match',
      isNot: this.isNot,
      promise: this.promise,
    };

    const normalizedReceived = path.normalize(received);
    const normalizedExpected = path.normalize(fullExpectedPath);

    console.log('Normalized Received:', normalizedReceived);
    console.log('Normalized Expected:', normalizedExpected);

    return {
      pass: normalizedReceived === normalizedExpected,
      message: () =>
        `${this.utils.matcherHint('toMatchAppPath', undefined, undefined, options)}\n\n` +
        `Expected: ${this.utils.printExpected(normalizedExpected)}\n` +
        `Received: ${this.utils.printReceived(normalizedReceived)}`,
    };
  },
});

afterAll(() => {
  // Force cleanup of lingering processes or handles
  if (process.platform === 'win32') {
    require('child_process').execSync('taskkill /F /IM electron.exe || true');
  }
});
