import {
  countBy,
  getEntryDay,
  getEntryTime,
  parseLogLines,
} from '../parseLogs';

describe('parseLogLines', () => {
  it('returns nothing for empty input', () => {
    expect(parseLogLines('')).toEqual([]);
    expect(parseLogLines('   \n  ')).toEqual([]);
  });

  it('parses timestamp, level and context tags', () => {
    const [entry] = parseLogLines(
      '[2026-08-07 18:28:38.848] [warn]  [main] Update check failed'
    );

    expect(entry.timestamp).toBe('2026-08-07 18:28:38.848');
    expect(entry.level).toBe('warn');
    expect(entry.contextTags).toEqual(['main']);
    expect(entry.context).toBe('main');
    expect(entry.message).toBe('Update check failed');
  });

  it('keeps every bracketed tag as its own context tag', () => {
    const [entry] = parseLogLines(
      '[2026-08-07 18:28:38.804] [warn]  [renderer:webview] [localhost:3000] [preload] Insecure CSP'
    );

    expect(entry.contextTags).toEqual([
      'renderer:webview',
      'localhost:3000',
      'preload',
    ]);
    expect(entry.message).toBe('Insecure CSP');
  });

  it('treats a message without context tags as all message', () => {
    const [entry] = parseLogLines('[2026-08-07 18:28:38.848] [info]  hello');

    expect(entry.contextTags).toEqual([]);
    expect(entry.message).toBe('hello');
  });

  it('folds continuation lines into the previous entry', () => {
    const entries = parseLogLines(
      [
        '[2026-08-07 18:28:38.847] [warn]  [main] Error: No published versions',
        '    at newError (error.js:5:19)',
        '    at GitHubProvider.getLatestVersion (GitHubProvider.js:100:55)',
      ].join('\n')
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].message.split('\n')).toHaveLength(3);
    expect(entries[0].raw).toContain('at newError');
  });

  it('orders entries newest first', () => {
    const entries = parseLogLines(
      [
        '[2026-08-07 10:00:00.000] [info]  [main] first',
        '[2026-08-07 11:00:00.000] [info]  [main] second',
      ].join('\n')
    );

    expect(entries.map((entry) => entry.message)).toEqual(['second', 'first']);
  });

  it('namespaces ids per call so merged reads never collide', () => {
    const head = parseLogLines('[2026-08-07 10:00:00.000] [info]  [main] a');
    const tail = parseLogLines(
      '[2026-08-07 11:00:00.000] [info]  [main] b',
      'g2'
    );

    expect(head[0].id).not.toBe(tail[0].id);
    expect(tail[0].id).toBe('g2-0');
  });

  it('falls back to info for unknown levels', () => {
    const [entry] = parseLogLines(
      '[2026-08-07 10:00:00.000] [shout] [main] loud'
    );

    expect(entry.level).toBe('info');
  });

  it('precomputes searchText and rawLower', () => {
    const [entry] = parseLogLines(
      '[2026-08-07 10:00:00.000] [info] [Main] [Server-1] HELLO World'
    );

    expect(entry.searchText).toBe(
      `${entry.message} ${entry.context}`.toLowerCase()
    );
    expect(entry.rawLower).toBe(entry.raw.toLowerCase());
    expect(entry.contextTags).toEqual(['Main', 'Server-1']);
  });

  it('updates searchText when continuation lines are folded in', () => {
    const [entry] = parseLogLines(
      [
        '[2026-08-07 10:00:00.000] [error] [main] Boom',
        '    at foo (foo.js:1:1)',
      ].join('\n')
    );

    expect(entry.searchText).toContain('at foo');
    expect(entry.rawLower).toContain('at foo');
  });
});

describe('timestamp helpers', () => {
  it('extracts the wall clock time', () => {
    expect(getEntryTime('2026-08-07 18:28:38.848')).toBe('18:28:38.848');
    expect(getEntryTime('nonsense')).toBe('nonsense');
  });

  it('groups entries by calendar day', () => {
    expect(getEntryDay('2026-08-07 18:28:38.848')).toBe(
      new Date('2026-08-07 18:28:38.848').toDateString()
    );
    expect(getEntryDay('2026-08-07 18:28:38.848')).toBe(
      getEntryDay('2026-08-07 01:00:00.000')
    );
    expect(getEntryDay('2026-08-07 18:28:38.848')).not.toBe(
      getEntryDay('2026-08-08 18:28:38.848')
    );
  });
});

describe('countBy', () => {
  it('counts every key an item contributes', () => {
    expect(
      countBy(
        [{ tags: ['main', 'ipc'] }, { tags: ['main'] }, { tags: [] }],
        (item) => item.tags
      )
    ).toEqual({ main: 2, ipc: 1 });
  });
});
