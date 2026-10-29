import { MAX_SEARCH_LIMIT } from '../engine';
import { MAX_QUERY_TOKENS } from '../sanitize';
import { E2EESearchInputError, validateQuery } from '../validate';

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

  it('rejects a text with more words than the engine cap', () => {
    const words = (count: number) => 'palavra '.repeat(count);
    expect(validateQuery({ text: words(MAX_QUERY_TOKENS) }).text).toBe(
      words(MAX_QUERY_TOKENS)
    );
    const tooLong = () => validateQuery({ text: words(MAX_QUERY_TOKENS + 1) });
    expect(tooLong).toThrow(E2EESearchInputError);
    expect(tooLong).toThrow(
      `query.text has more than ${MAX_QUERY_TOKENS} words`
    );
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
