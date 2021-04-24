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

    return {
      pass: path.relative(received, fullExpectedPath) === '',
      message: () =>
        `${ this.utils.matcherHint('toMatchAppPath', undefined, undefined, options)
        }\n\n`
          + `Expected: ${ this.utils.printExpected(fullExpectedPath) }\n`
          + `Received: ${ this.utils.printReceived(received) }`,
    };
  },
});
