import { MAX_SEARCH_LIMIT } from '../engine';
import { MAX_QUERY_TOKENS } from '../sanitize';
import {
  E2EESearchInputError,
  MAX_ID_LENGTH,
  MAX_QUERY_TEXT_LENGTH,
  validateQuery,
  validateRecentQuery,
} from '../validate';

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

describe('e2eeSearch recent query validation', () => {
  it('preserves all query filters and copies a bounded cursor without an order', () => {
    const cursor = { ts: 1500.5, id: '😀' };
    const input = {
      text: 'needle',
      rid: 'room-1',
      uid: 'user-1',
      from: 1000,
      to: 2000,
      limit: 20,
      cursor,
    };
    const query = validateRecentQuery(input);
    expect(query).toEqual(input);
    expect(query).not.toHaveProperty('order');
    expect(query.cursor).not.toBe(cursor);
    cursor.id = 'changed';
    expect(query.cursor?.id).toBe('😀');
    expect(validateRecentQuery({ text: 'needle' })).not.toHaveProperty(
      'cursor'
    );
  });

  it('uses the existing ID, text, word and result limits', () => {
    const id = 'x'.repeat(MAX_ID_LENGTH);
    const text = 'x'.repeat(MAX_QUERY_TEXT_LENGTH);
    expect(
      validateRecentQuery({ text, rid: id, uid: id, cursor: { ts: 0, id } })
    ).toMatchObject({ text, rid: id, uid: id, cursor: { ts: 0, id } });
    expect(
      validateRecentQuery({ text: 'word '.repeat(MAX_QUERY_TOKENS) }).text
    ).toBe('word '.repeat(MAX_QUERY_TOKENS));
    expect(validateRecentQuery({ text: 'x', limit: 10_000 }).limit).toBe(
      MAX_SEARCH_LIMIT
    );
    expect(validateRecentQuery({ text: 'x', limit: 100 }).limit).toBe(100);
    expect(validateRecentQuery({ text: 'x', limit: 20 }).limit).toBe(20);
    expect(validateRecentQuery({ text: 'x' }).limit).toBeUndefined();
    expect(() =>
      validateRecentQuery({ text: 'word '.repeat(MAX_QUERY_TOKENS + 1) })
    ).toThrow(`query.text has more than ${MAX_QUERY_TOKENS} words`);
  });

  it.each([-1, 0, 0.5, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE])(
    'keeps the finite timestamp contract for a cursor (%s)',
    (ts) => {
      expect(
        validateRecentQuery({ text: 'x', cursor: { ts, id: 'a' } }).cursor
      ).toEqual({
        ts,
        id: 'a',
      });
    }
  );

  it.each([
    null,
    [],
    'cursor',
    1,
    false,
    {},
    { ts: 1000 },
    { id: 'a' },
    { ts: null, id: 'a' },
    { ts: '1000', id: 'a' },
    { ts: NaN, id: 'a' },
    { ts: Infinity, id: 'a' },
    { ts: -Infinity, id: 'a' },
    { ts: 1000, id: null },
    { ts: 1000, id: 1 },
    { ts: 1000, id: '' },
    { ts: 1000, id: 'a'.repeat(MAX_ID_LENGTH + 1) },
  ])('rejects a malformed or nonfinite cursor (%j)', (cursor) => {
    expect(() => validateRecentQuery({ text: 'x', cursor })).toThrow(
      E2EESearchInputError
    );
  });

  it.each([
    undefined,
    null,
    [],
    'query',
    {},
    { text: null },
    { text: 'x'.repeat(MAX_QUERY_TEXT_LENGTH + 1) },
    { text: 'x', rid: '' },
    { text: 'x', rid: 'a'.repeat(MAX_ID_LENGTH + 1) },
    { text: 'x', uid: [] },
    { text: 'x', uid: 'a'.repeat(MAX_ID_LENGTH + 1) },
    { text: 'x', from: NaN },
    { text: 'x', to: Infinity },
    { text: 'x', limit: Infinity },
    { text: 'x', limit: NaN },
    { text: 'x', limit: '5' },
  ])('applies existing query input checks (%j)', (query) => {
    expect(() => validateRecentQuery(query)).toThrow(E2EESearchInputError);
  });

  it.each(['relevance', 'recent', null])(
    'rejects an order on the recent-only method (%j)',
    (order) => {
      expect(() => validateRecentQuery({ text: 'x', order })).toThrow(
        'query.order is not valid'
      );
    }
  );
});
