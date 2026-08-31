import { parseActivationArguments } from '../parseActivationArguments';

describe('parseActivationArguments', () => {
  it('parses type and tag from a raw activation arguments string', () => {
    expect(parseActivationArguments('type=reply&tag=abc123')).toEqual({
      type: 'reply',
      tag: 'abc123',
    });
  });

  it('URL-decodes the tag value', () => {
    expect(parseActivationArguments('type=reply&tag=abc%20123%3D456')).toEqual({
      type: 'reply',
      tag: 'abc 123=456',
    });
  });

  it('returns an empty object for an empty string', () => {
    expect(parseActivationArguments('')).toEqual({});
  });

  it('returns an object without a tag for garbage input without a tag', () => {
    expect(parseActivationArguments('some=garbage&without=tag')).toEqual({
      type: undefined,
      tag: undefined,
    });
  });

  it('returns tag without type when type is missing', () => {
    expect(parseActivationArguments('tag=abc123')).toEqual({
      type: undefined,
      tag: 'abc123',
    });
  });

  it('returns an empty object for undefined input', () => {
    expect(parseActivationArguments(undefined)).toEqual({});
  });
});
