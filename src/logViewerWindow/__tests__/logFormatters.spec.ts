import { formatFileSize, parseLogLines } from '../logFormatters';

describe('logFormatters', () => {
  describe('formatFileSize', () => {
    it('formats bytes, KB and MB', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
    });
  });

  describe('parseLogLines', () => {
    it('returns empty array for blank input', () => {
      expect(parseLogLines('')).toEqual([]);
      expect(parseLogLines('   \n  ')).toEqual([]);
    });

    it('parses timestamp, level, context and message', () => {
      const logs = [
        '[2026-01-01T00:00:00.000Z] [info] [main] [app] hello',
        '[2026-01-01T00:00:01.000Z] [error] boom',
      ].join('\n');
      const entries = parseLogLines(logs);
      expect(entries).toHaveLength(2);
      // reversed so newest first
      expect(entries[0].level).toBe('error');
      expect(entries[0].message).toContain('boom');
      expect(entries[1].level).toBe('info');
      expect(entries[1].message).toContain('hello');
    });

    it('appends continuation lines to the current entry', () => {
      const logs = [
        '[2026-01-01T00:00:00.000Z] [info] first line',
        'stack frame 1',
        'stack frame 2',
      ].join('\n');
      const [entry] = parseLogLines(logs);
      expect(entry.message).toContain('first line');
      expect(entry.message).toContain('stack frame 1');
      expect(entry.message).toContain('stack frame 2');
    });
  });
});
