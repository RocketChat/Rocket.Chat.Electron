import path from 'path';

import { joinAsarPath } from '../mainProcess/joinAsarPath';

expect.extend({
  toMatchAppPath(received: string, expected: string) {
    const fullExpectedPath = joinAsarPath(expected);

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
