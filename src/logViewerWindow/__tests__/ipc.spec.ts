import {
  countLogEntries,
  getLastNEntries,
  trimBufferToLastNewline,
} from '../ipc';

describe('trimBufferToLastNewline', () => {
  it('returns nothing consumed when the buffer has no newline', () => {
    const buf = Buffer.from('partial line without newline');
    const { consumed, bytesConsumed } = trimBufferToLastNewline(buf);
    expect(bytesConsumed).toBe(0);
    expect(consumed.length).toBe(0);
  });

  it('consumes up to and including the last newline mid-buffer', () => {
    const buf = Buffer.from('line one\nline two\npartial line three');
    const { consumed, bytesConsumed } = trimBufferToLastNewline(buf);

    expect(consumed.toString('utf-8')).toBe('line one\nline two\n');
    expect(bytesConsumed).toBe(Buffer.byteLength('line one\nline two\n'));
    expect(buf.subarray(bytesConsumed).toString('utf-8')).toBe(
      'partial line three'
    );
  });

  it('consumes the entire buffer when it ends with a newline', () => {
    const buf = Buffer.from('line one\nline two\n');
    const { consumed, bytesConsumed } = trimBufferToLastNewline(buf);

    expect(bytesConsumed).toBe(buf.length);
    expect(consumed.equals(buf)).toBe(true);
  });

  it('does not split a multi-byte UTF-8 character across the cut point', () => {
    // "café" ends with a 2-byte UTF-8 char (é = 0xC3 0xA9); make sure the
    // cut happens strictly after a newline, never inside a multi-byte char.
    const completeLine = 'café logged\n';
    const partialMultiByteTail = 'café'; // "café" without trailing newline
    const buf = Buffer.concat([
      Buffer.from(completeLine, 'utf-8'),
      Buffer.from(partialMultiByteTail, 'utf-8'),
    ]);

    const { consumed, bytesConsumed } = trimBufferToLastNewline(buf);

    expect(bytesConsumed).toBe(Buffer.byteLength(completeLine, 'utf-8'));
    expect(consumed.toString('utf-8')).toBe(completeLine);

    const remainder = buf.subarray(bytesConsumed);
    expect(remainder.toString('utf-8')).toBe(partialMultiByteTail);
  });

  it('returns an empty consumed buffer for an empty input', () => {
    const { consumed, bytesConsumed } = trimBufferToLastNewline(
      Buffer.alloc(0)
    );
    expect(bytesConsumed).toBe(0);
    expect(consumed.length).toBe(0);
  });
});

describe('getLastNEntries', () => {
  const buildLog = (count: number): string =>
    Array.from(
      { length: count },
      (_, i) =>
        `[2024-01-01 10:00:${String(i).padStart(2, '0')}.000] [info] [main] Entry ${i}`
    ).join('\n');

  it('returns all content and correct total when limit exceeds entry count', () => {
    const log = buildLog(3);
    const { content, totalEntries } = getLastNEntries(log, 10);
    expect(totalEntries).toBe(3);
    expect(content).toBe(log);
  });

  it('returns only the last N entries', () => {
    const log = buildLog(5);
    const { content, totalEntries } = getLastNEntries(log, 2);
    expect(totalEntries).toBe(5);
    expect(content.split('\n')).toHaveLength(2);
    expect(content).toContain('Entry 3');
    expect(content).toContain('Entry 4');
    expect(content).not.toContain('Entry 2');
  });

  it('returns empty content and zero entries for a non-positive limit', () => {
    const { content, totalEntries } = getLastNEntries(buildLog(3), 0);
    expect(content).toBe('');
    expect(totalEntries).toBe(0);
  });

  it('falls back to the last N lines when no entries match the log pattern', () => {
    const content = 'plain line 1\nplain line 2\nplain line 3';
    const result = getLastNEntries(content, 2);
    expect(result.totalEntries).toBe(0);
    expect(result.content).toBe('plain line 2\nplain line 3');
  });
});

describe('countLogEntries', () => {
  it('counts entry-start lines and ignores continuation lines', () => {
    const content = [
      '[2024-01-01 10:00:00.000] [info] [main] First',
      '    continuation line',
      '[2024-01-01 10:00:01.000] [warn] [main] Second',
    ].join('\n');

    expect(countLogEntries(content)).toBe(2);
  });

  it('returns 0 for content with no matching entries', () => {
    expect(countLogEntries('just some text\nanother line')).toBe(0);
  });
});
