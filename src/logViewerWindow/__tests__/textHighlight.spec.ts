import {
  MAX_COLLAPSED_MESSAGE_LINES,
  splitMessageForCollapse,
  splitTextForHighlight,
} from '../textHighlight';

describe('splitTextForHighlight', () => {
  it('returns a single unmatched segment when query is empty', () => {
    expect(splitTextForHighlight('hello world', '')).toEqual([
      { text: 'hello world', matched: false },
    ]);
  });

  it('returns a single unmatched segment when there is no match', () => {
    expect(splitTextForHighlight('hello world', 'xyz')).toEqual([
      { text: 'hello world', matched: false },
    ]);
  });

  it('splits and marks a single case-insensitive match', () => {
    const result = splitTextForHighlight('Hello World', 'world');
    expect(result).toEqual([
      { text: 'Hello ', matched: false },
      { text: 'World', matched: true },
    ]);
  });

  it('marks all occurrences of the query', () => {
    const result = splitTextForHighlight('foo bar foo', 'foo');
    expect(result).toEqual([
      { text: 'foo', matched: true },
      { text: ' bar ', matched: false },
      { text: 'foo', matched: true },
    ]);
  });

  it('escapes regex special characters in the query', () => {
    const result = splitTextForHighlight('a.b*c', '.b*');
    expect(result).toEqual([
      { text: 'a', matched: false },
      { text: '.b*', matched: true },
      { text: 'c', matched: false },
    ]);
  });
});

describe('splitMessageForCollapse', () => {
  it('returns all lines with zero hidden count when under the threshold', () => {
    const message = Array.from({ length: 3 }, (_, i) => `line ${i}`).join('\n');
    const { visibleLines, hiddenLineCount } = splitMessageForCollapse(message);
    expect(visibleLines).toHaveLength(3);
    expect(hiddenLineCount).toBe(0);
  });

  it('returns exactly the threshold with zero hidden count at the boundary', () => {
    const message = Array.from(
      { length: MAX_COLLAPSED_MESSAGE_LINES },
      (_, i) => `line ${i}`
    ).join('\n');
    const { visibleLines, hiddenLineCount } = splitMessageForCollapse(message);
    expect(visibleLines).toHaveLength(MAX_COLLAPSED_MESSAGE_LINES);
    expect(hiddenLineCount).toBe(0);
  });

  it('truncates to the threshold and reports the hidden count when over it', () => {
    const totalLines = MAX_COLLAPSED_MESSAGE_LINES + 4;
    const message = Array.from(
      { length: totalLines },
      (_, i) => `line ${i}`
    ).join('\n');
    const { visibleLines, hiddenLineCount } = splitMessageForCollapse(message);
    expect(visibleLines).toHaveLength(MAX_COLLAPSED_MESSAGE_LINES);
    expect(visibleLines).toEqual([
      'line 0',
      'line 1',
      'line 2',
      'line 3',
      'line 4',
      'line 5',
    ]);
    expect(hiddenLineCount).toBe(4);
  });
});
