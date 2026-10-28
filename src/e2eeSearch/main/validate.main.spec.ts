import { MAX_SEARCH_LIMIT } from '../engine';
import { validateQuery } from '../validate';

describe('e2eeSearch query validation', () => {
  it('clamps the search limit in the bridge to the engine cap', () => {
    expect(validateQuery({ text: 'x', limit: 10_000 }).limit).toBe(
      MAX_SEARCH_LIMIT
    );
    expect(MAX_SEARCH_LIMIT).toBe(100);
  });

  it('keeps a limit at or under the cap, and no limit when none is sent', () => {
    expect(validateQuery({ text: 'x', limit: 20 }).limit).toBe(20);
    expect(validateQuery({ text: 'x', limit: 100 }).limit).toBe(100);
    expect(validateQuery({ text: 'x' }).limit).toBeUndefined();
  });

  it('still rejects a limit that is not a finite number', () => {
    expect(() => validateQuery({ text: 'x', limit: Infinity })).toThrow(
      'query.limit must be a finite number'
    );
    expect(() => validateQuery({ text: 'x', limit: '5' })).toThrow(
      'query.limit must be a finite number'
    );
  });
});
