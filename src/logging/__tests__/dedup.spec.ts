import { LogDeduplicator } from '../dedup';

describe('LogDeduplicator', () => {
  describe('shouldLog', () => {
    it('logs the first occurrence', () => {
      const d = new LogDeduplicator();
      expect(d.shouldLog('info', '[ctx]', ['hello'])).toBe(true);
    });

    it('suppresses an identical consecutive message', () => {
      const d = new LogDeduplicator();
      d.shouldLog('info', '[ctx]', ['hello']);
      expect(d.shouldLog('info', '[ctx]', ['hello'])).toBe(false);
    });

    it('treats messages differing only by a 4+ digit number as duplicates', () => {
      const d = new LogDeduplicator();
      expect(d.shouldLog('info', '[ctx]', ['msg 12345'])).toBe(true);
      expect(d.shouldLog('info', '[ctx]', ['msg 67890'])).toBe(false);
    });

    it('treats messages differing only by a decimal as duplicates', () => {
      const d = new LogDeduplicator();
      expect(d.shouldLog('info', '[c]', ['x 1.5'])).toBe(true);
      expect(d.shouldLog('info', '[c]', ['x 9.9'])).toBe(false);
    });

    it('logs messages that differ by content', () => {
      const d = new LogDeduplicator();
      expect(d.shouldLog('info', '[c]', ['alpha'])).toBe(true);
      expect(d.shouldLog('info', '[c]', ['beta'])).toBe(true);
    });

    it('keys include the level — same text at different levels both log', () => {
      const d = new LogDeduplicator();
      expect(d.shouldLog('info', '[c]', ['same'])).toBe(true);
      expect(d.shouldLog('warn', '[c]', ['same'])).toBe(true);
    });

    it('always returns true for error level, even repeated', () => {
      const d = new LogDeduplicator();
      expect(d.shouldLog('error', '[c]', ['boom'])).toBe(true);
      expect(d.shouldLog('error', '[c]', ['boom'])).toBe(true);
    });

    it('an error resets the last key so the prior message logs again', () => {
      const d = new LogDeduplicator();
      d.shouldLog('info', '[c]', ['a']);
      expect(d.shouldLog('info', '[c]', ['a'])).toBe(false);
      d.shouldLog('error', '[c]', ['e']);
      expect(d.shouldLog('info', '[c]', ['a'])).toBe(true);
    });

    it('serializes object args via JSON.stringify for the key', () => {
      const d = new LogDeduplicator();
      expect(d.shouldLog('info', '[c]', [{ x: 1 }])).toBe(true);
      expect(d.shouldLog('info', '[c]', [{ x: 1 }])).toBe(false);
    });

    it('falls back to String() for circular args without throwing', () => {
      const d = new LogDeduplicator();
      const circular: any = {};
      circular.self = circular;
      expect(d.shouldLog('info', '[c]', [circular])).toBe(true);
      expect(d.shouldLog('info', '[c]', [circular])).toBe(false);
    });

    it('different contextStr produces different keys', () => {
      const d = new LogDeduplicator();
      expect(d.shouldLog('info', '[a]', ['msg'])).toBe(true);
      expect(d.shouldLog('info', '[b]', ['msg'])).toBe(true);
    });
  });

  describe('createFileHook', () => {
    it('passes non-file transports through unchanged', () => {
      const hook = new LogDeduplicator().createFileHook();
      const msg = { level: 'info', data: ['x'] };
      expect(hook(msg, {}, 'console')).toBe(msg);
    });

    it('passes falsy messages through unchanged', () => {
      const hook = new LogDeduplicator().createFileHook();
      expect(hook(null, {}, 'file')).toBeNull();
    });

    it('returns the first file message and suppresses the duplicate', () => {
      const hook = new LogDeduplicator().createFileHook();
      const first = hook({ level: 'info', data: ['dup'] }, {}, 'file');
      expect(first).toEqual({ level: 'info', data: ['dup'] });
      expect(hook({ level: 'info', data: ['dup'] }, {}, 'file')).toBeNull();
    });

    it('never suppresses error messages and resets the key', () => {
      const hook = new LogDeduplicator().createFileHook();
      hook({ level: 'info', data: ['dup'] }, {}, 'file');
      const err = hook({ level: 'error', data: ['e'] }, {}, 'file');
      expect(err).toEqual({ level: 'error', data: ['e'] });
      // After the error reset, the previously-suppressed message logs again.
      expect(hook({ level: 'info', data: ['dup'] }, {}, 'file')).toEqual({
        level: 'info',
        data: ['dup'],
      });
    });

    it('normalizes 4+ digit numbers so they dedup', () => {
      const hook = new LogDeduplicator().createFileHook();
      expect(
        hook({ level: 'info', data: ['n 12345'] }, {}, 'file')
      ).not.toBeNull();
      expect(hook({ level: 'info', data: ['n 67890'] }, {}, 'file')).toBeNull();
    });

    it('handles messages with no data array', () => {
      const hook = new LogDeduplicator().createFileHook();
      const msg = { level: 'info' };
      expect(hook(msg, {}, 'file')).toBe(msg);
    });

    it('serializes object data items via JSON.stringify', () => {
      const hook = new LogDeduplicator().createFileHook();
      expect(
        hook({ level: 'info', data: [{ a: 1 }] }, {}, 'file')
      ).not.toBeNull();
      expect(hook({ level: 'info', data: [{ a: 1 }] }, {}, 'file')).toBeNull();
    });

    it('falls back to String() for circular data items', () => {
      const hook = new LogDeduplicator().createFileHook();
      const circular: any = {};
      circular.self = circular;
      expect(
        hook({ level: 'info', data: [circular] }, {}, 'file')
      ).not.toBeNull();
      expect(hook({ level: 'info', data: [circular] }, {}, 'file')).toBeNull();
    });

    it('tracks IPC and file keys independently', () => {
      const d = new LogDeduplicator();
      const hook = d.createFileHook();
      // shouldLog sets lastIpcKey only; file hook unaffected.
      d.shouldLog('info', '[c]', ['shared']);
      expect(
        hook({ level: 'info', data: ['shared'] }, {}, 'file')
      ).not.toBeNull();
    });
  });
});
