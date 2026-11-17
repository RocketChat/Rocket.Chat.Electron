import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

import {
  createSearchEngine,
  MAX_INDEX_BYTES,
  MAX_INDEX_DOCS,
  MAX_INDEX_ROOMS,
} from '../engine';
import type { SearchEngine } from '../engine';
import { MAX_QUERY_TOKENS, toMatch } from '../sanitize';
import { SCHEMA_VERSION } from '../schema';
import type {
  E2EESearchDoc,
  E2EESearchRecentCursor,
  E2EESearchRecentPage,
  E2EESearchRecentQuery,
} from '../types';
import {
  E2EESearchInputError,
  E2EESearchQuotaError,
  MAX_ID_LENGTH,
} from '../validate';

// Loaded at runtime: the Jest resolver does not know the prefix-only
// `node:sqlite` builtin. This also proves that the Electron main process has it.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

const doc = (
  overrides: Partial<E2EESearchDoc> & Pick<E2EESearchDoc, 'id' | 'body'>
): E2EESearchDoc => ({
  rid: 'r1',
  uid: 'u1',
  username: 'ana',
  ts: 1000,
  updatedAt: 1000,
  kind: 'text',
  ...overrides,
});

const ids = (engine: SearchEngine, text: string, extra = {}) =>
  engine
    .search({ text, ...extra })
    .map((hit) => hit.id)
    .sort();

describe('e2eeSearch engine', () => {
  let db: DatabaseSyncType;
  let engine: SearchEngine;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    engine = createSearchEngine(db, { userId: 'me' });
    engine.upsert([
      doc({ id: 'a', body: 'Reunião de orçamento amanhã', ts: 1000 }),
      doc({
        id: 'b',
        body: 'Ação "urgente" no contrato',
        uid: 'u2',
        username: 'bob',
        ts: 2000,
        tmid: 'a',
      }),
      doc({
        id: 'c',
        rid: 'r2',
        body: 'relatorio-financeiro.pdf orçamento',
        kind: 'file',
        ts: 3000,
      }),
    ]);
  });

  afterEach(() => {
    db.close();
  });

  it('finds an upserted message and returns a marked snippet', () => {
    const [hit] = engine.search({ text: 'contrato' });
    expect(hit).toEqual({
      id: 'b',
      rid: 'r1',
      tmid: 'a',
      uid: 'u2',
      username: 'bob',
      ts: 2000,
      snippet: expect.stringContaining('<mark>contrato</mark>'),
    });
  });

  it.each([
    ['relevance, no filter', {}],
    ['relevance, with a filter', { rid: 'r1' }],
    ['recent', { order: 'recent' as const }],
  ])('returns the author of each hit (%s)', (_path, extra) => {
    const hits = engine.search({ text: 'contrato', ...extra });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ id: 'b', uid: 'u2', username: 'bob' });
  });

  it('escapes the message text in a snippet and adds only its own marks', () => {
    engine.upsert([
      doc({
        id: 'x',
        body: `<img src=x onerror=alert(1)> payload & "q" 'q'`,
        ts: 4000,
      }),
    ]);

    const [hit] = engine.search({ text: 'payload' });

    expect(hit.id).toBe('x');
    expect(hit.snippet).not.toContain('<img');
    expect(hit.snippet).toContain('&lt;img');
    expect(hit.snippet).toContain('&amp; &quot;q&quot; &#39;q&#39;');
    expect(hit.snippet).toContain('<mark>payload</mark>');
    expect(hit.snippet.replace(/<\/?mark>/g, '')).not.toMatch(/[<>]/);
  });

  it('does not turn marker characters in the text into marks', () => {
    engine.upsert([
      doc({ id: 'y', body: 'fake mark aqui pagamento', ts: 5000 }),
    ]);

    const [hit] = engine.search({ text: 'pagamento' });

    expect(hit.snippet.match(/<mark>/g)).toHaveLength(1);
    expect(hit.snippet).toContain('<mark>pagamento</mark>');
  });

  it('matches a word prefix', () => {
    expect(ids(engine, 'orcam')).toEqual(['a', 'c']);
  });

  it('ignores accents in the query and in the text', () => {
    expect(ids(engine, 'acao')).toEqual(['b']);
    expect(ids(engine, 'REUNIAO')).toEqual(['a']);
    expect(ids(engine, 'relatório')).toEqual(['c']);
  });

  it('filters by room', () => {
    expect(ids(engine, 'orcamento', { rid: 'r1' })).toEqual(['a']);
    expect(ids(engine, 'orcamento', { rid: 'r2' })).toEqual(['c']);
  });

  it('filters by sender', () => {
    expect(ids(engine, 'urgente', { uid: 'u1' })).toEqual([]);
    expect(ids(engine, 'urgente', { uid: 'u2' })).toEqual(['b']);
  });

  it('filters by date range and orders by recent', () => {
    expect(ids(engine, 'orcamento', { from: 2500 })).toEqual(['c']);
    expect(ids(engine, 'orcamento', { to: 1500 })).toEqual(['a']);
    expect(
      engine.search({ text: 'orcamento', order: 'recent' }).map((hit) => hit.id)
    ).toEqual(['c', 'a']);
  });

  it('ranks a query with no filter like the same query with a filter', () => {
    engine.upsert(
      Array.from({ length: 120 }, (_, i) =>
        doc({
          id: `p${i}`,
          body: `${'palavra '.repeat(1 + (i % 7))}outra ${i}`,
          ts: 10_000 + i,
        })
      )
    );
    const filtered = engine.search({ text: 'palavra', from: 0, limit: 60 });
    const unfiltered = engine.search({ text: 'palavra', limit: 60 });
    expect(unfiltered).toHaveLength(60);
    expect(unfiltered).toEqual(filtered);
    expect(unfiltered[0].snippet).toContain('<mark>palavra</mark>');
  });

  it('returns the newest matches first past the limit, with snippets', () => {
    // Insert order differs from ts order, as with a backfill of old history.
    const tsOf = (i: number) => 10_000 + ((i * 37) % 120);
    engine.upsert(
      Array.from({ length: 120 }, (_, i) =>
        doc({
          id: `p${i}`,
          rid: i % 2 === 0 ? 'r1' : 'r2',
          body: `palavra outra ${i}`,
          ts: tsOf(i),
        })
      )
    );
    const newest = (rid?: string) =>
      Array.from({ length: 120 }, (_, i) => i)
        .filter((i) => rid === undefined || (i % 2 === 0) === (rid === 'r1'))
        .sort((x, y) => tsOf(y) - tsOf(x))
        .slice(0, 10)
        .map((i) => `p${i}`);

    const hits = engine.search({ text: 'palavra', order: 'recent', limit: 10 });
    expect(hits.map((hit) => hit.id)).toEqual(newest());
    for (const hit of hits) {
      expect(hit.snippet).toContain('<mark>palavra</mark>');
    }
    expect(
      engine
        .search({ text: 'palavra', order: 'recent', limit: 10, rid: 'r2' })
        .map((hit) => hit.id)
    ).toEqual(newest('r2'));
  });

  it('returns the same hits as a full sort by ts for every filter', () => {
    // Pseudo-random ts, insert order and ms ties, as with a backfill.
    const tsOf = (i: number) => 50_000 + ((i * 7919) % 400) * 10 + (i % 3);
    const words = ['alfa', 'beta', 'gama'];
    const docs = Array.from({ length: 400 }, (_, i) =>
      doc({
        id: `q${i}`,
        rid: `r${i % 3}`,
        uid: `u${i % 4}`,
        body: `${words[i % 3]} ${i % 5 === 0 ? 'beta' : 'delta'} nota ${i}`,
        ts: tsOf(i),
      })
    );
    engine.upsert([...docs].reverse());
    const expected = (
      word: string,
      filter: { rid?: string; uid?: string; from?: number; to?: number }
    ) =>
      docs
        .filter(
          (d) =>
            d.body.split(' ').some((w) => w.startsWith(word)) &&
            (filter.rid === undefined || d.rid === filter.rid) &&
            (filter.uid === undefined || d.uid === filter.uid) &&
            d.ts >= (filter.from ?? 0) &&
            d.ts <= (filter.to ?? Number.MAX_SAFE_INTEGER)
        )
        .map((d) => d.ts)
        .sort((x, y) => y - x)
        .slice(0, 25);

    for (const word of ['alfa', 'beta', 'nota', 'not']) {
      for (const filter of [
        {},
        { rid: 'r1' },
        { uid: 'u2' },
        { from: 51_000, to: 52_500 },
        { from: 51_000.5, to: 52_500.5, rid: 'r2' },
      ]) {
        const hits = engine.search({
          text: word,
          order: 'recent',
          limit: 25,
          ...filter,
        });
        expect(hits.map((hit) => hit.ts)).toEqual(expected(word, filter));
      }
    }
  });

  it('moves a message in the newest-first order when an edit changes its ts', () => {
    engine.upsert([
      doc({ id: 'x1', body: 'mover', ts: 100, updatedAt: 100 }),
      doc({ id: 'x2', body: 'mover', ts: 200, updatedAt: 200 }),
    ]);
    const recent = () =>
      engine.search({ text: 'mover', order: 'recent' }).map((hit) => hit.id);
    expect(recent()).toEqual(['x2', 'x1']);

    engine.upsert([doc({ id: 'x1', body: 'mover', ts: 300, updatedAt: 300 })]);
    expect(recent()).toEqual(['x1', 'x2']);
    expect(engine.stats().docs).toBe(5);

    // An older version with another ts changes nothing.
    engine.upsert([doc({ id: 'x1', body: 'mover', ts: 50, updatedAt: 10 })]);
    expect(recent()).toEqual(['x1', 'x2']);
  });

  it('keeps messages with the same ms and far ts values', () => {
    engine.upsert([
      doc({ id: 't1', body: 'limite', ts: 7000 }),
      doc({ id: 't2', body: 'limite', ts: 7000 }),
      doc({ id: 't3', body: 'limite', ts: 0.5 }),
      doc({ id: 't4', body: 'limite', ts: 2 ** 50 }),
    ]);
    const hits = engine.search({ text: 'limite', order: 'recent' });
    expect(hits.map((hit) => hit.id).sort()).toEqual(['t1', 't2', 't3', 't4']);
    expect(hits[0].id).toBe('t4');
    expect(hits[3].id).toBe('t3');
  });

  it('keeps messages of neighbour ms at real dates when the newer ms comes first', () => {
    // A real ts times 2^20 is past 2^53. The rowid range of one ms must not
    // reach the next ms, or the next free rowid hits a row of the next ms.
    const now = Date.parse('2026-10-28T19:46:36.296Z');
    engine.upsert([
      doc({ id: 'n1', body: 'vizinho', ts: now + 1 }),
      doc({ id: 'n2', body: 'vizinho', ts: now + 1 }),
    ]);
    engine.upsert([
      doc({ id: 'o1', body: 'vizinho', ts: now }),
      doc({ id: 'o2', body: 'vizinho', ts: now }),
    ]);
    const hits = engine.search({ text: 'vizinho', order: 'recent' });
    expect(hits.map((hit) => hit.ts)).toEqual([now + 1, now + 1, now, now]);
  });

  it('replaces the text on an edit and ignores an older version', () => {
    engine.upsert([
      doc({ id: 'a', body: 'Reunião cancelada', updatedAt: 5000 }),
    ]);
    expect(ids(engine, 'orcamento')).toEqual(['c']);
    expect(ids(engine, 'cancelada')).toEqual(['a']);

    engine.upsert([doc({ id: 'a', body: 'texto antigo', updatedAt: 4000 })]);
    expect(ids(engine, 'antigo')).toEqual([]);
    expect(ids(engine, 'cancelada')).toEqual(['a']);
    expect(() => engine.checkIntegrity()).not.toThrow();
  });

  it('changes no row when the same version of a message is upserted again', () => {
    const totalChanges = () =>
      (db.prepare('SELECT total_changes() AS n').get() as { n: number }).n;
    const before = totalChanges();

    engine.upsert([doc({ id: 'a', body: 'Reunião de orçamento amanhã' })]);
    expect(totalChanges()).toBe(before);

    engine.upsert([doc({ id: 'a', body: 'Reunião movida' })]);
    expect(totalChanges()).toBeGreaterThan(before);
    expect(ids(engine, 'movida')).toEqual(['a']);
    expect(() => engine.checkIntegrity()).not.toThrow();
  });

  it('removes messages by id and by room', () => {
    engine.setRoomState('r2', { lastUpdate: 3000, backfillDone: false });

    engine.remove(['b']);
    expect(ids(engine, 'contrato')).toEqual([]);

    engine.removeRoom('r2');
    expect(ids(engine, 'orcamento')).toEqual(['a']);
    expect(engine.getRoomState('r2')).toBeUndefined();
    expect(engine.stats()).toMatchObject({ docs: 1, rooms: 1 });
    expect(() => engine.checkIntegrity()).not.toThrow();
  });

  it('lists each room that has messages or a room state, once', () => {
    engine.setRoomState('r3', { backfillDone: true });

    expect(engine.listRooms()).toEqual(['r1', 'r2', 'r3']);

    engine.removeRoom('r2');
    engine.removeRoom('r3');
    expect(engine.listRooms()).toEqual(['r1']);
  });

  it('treats FTS5 operators in the input as text', () => {
    const search = (text: string) => () => engine.search({ text });
    ['NEAR( OR ) * "', 'contrato OR acao', '"', '*', '-a']
      .map(search)
      .forEach((run) => expect(run).not.toThrow());
    expect(ids(engine, 'NEAR( OR ) * "')).toEqual([]);
    expect(ids(engine, 'contrato OR xyz')).toEqual([]);
    expect(toMatch('a"b')).toBe('"a"* "b"*');
  });

  it('returns no results for a query with no words', () => {
    expect(toMatch('  ?! ')).toBe('');
    expect(engine.search({ text: '' })).toEqual([]);
    expect(engine.search({ text: '  ?! ' })).toEqual([]);
  });

  it('lists the newest messages of the filters for an empty text, within the limit', () => {
    engine.upsert(
      Array.from({ length: 30 }, (_, i) =>
        doc({
          id: `f${i}`,
          body: `mensagem ${i}`,
          uid: i % 3 === 0 ? 'u2' : 'u1',
          ts: 10_000 + ((i * 7) % 30),
        })
      )
    );
    const expected = (keep: (ts: number, uid: string) => boolean) =>
      Array.from({ length: 30 }, (_, i) => ({
        id: `f${i}`,
        ts: 10_000 + ((i * 7) % 30),
        uid: i % 3 === 0 ? 'u2' : 'u1',
      }))
        .filter(({ ts, uid }) => keep(ts, uid))
        .sort((x, y) => y.ts - x.ts)
        .map(({ id }) => id);

    const byAuthorAndDate = engine.search({
      text: '',
      rid: 'r1',
      uid: 'u1',
      from: 10_005,
      to: 10_025,
      order: 'recent',
      limit: 5,
    });
    expect(byAuthorAndDate.map((hit) => hit.id)).toEqual(
      expected((ts, uid) => uid === 'u1' && ts >= 10_005 && ts <= 10_025).slice(
        0,
        5
      )
    );

    expect(
      engine.search({ text: '  ', uid: 'u2', limit: 100 }).map((hit) => hit.id)
    ).toEqual([...expected((_, uid) => uid === 'u2'), 'b']);
    expect(engine.search({ text: '', rid: 'r2' }).map((hit) => hit.id)).toEqual(
      ['c']
    );
  });

  it('returns no results for an empty text with no filter, or a text with no words', () => {
    expect(engine.search({ text: '' })).toEqual([]);
    expect(engine.search({ text: '   ', order: 'recent', limit: 10 })).toEqual(
      []
    );
    expect(engine.search({ text: '  ?! ', rid: 'r1' })).toEqual([]);
  });

  it('gives a filter-only hit the escaped start of the body, with no marks', () => {
    const long = `<b>"Tom" & 'Ana'</b> ${'palavra '.repeat(30)}`;
    engine.upsert([
      doc({ id: 'x', rid: 'r9', body: long, ts: 9000 }),
      doc({ id: 'y', rid: 'r9', body: 'curta mark', ts: 8000 }),
    ]);

    const [first, second] = engine.search({ text: '', rid: 'r9' });

    expect(first.snippet).toBe(
      `${long
        .slice(0, 80)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')}…`
    );
    expect(
      first.snippet.startsWith('&lt;b&gt;&quot;Tom&quot; &amp; &#39;Ana')
    ).toBe(true);
    expect(second.snippet).toBe('curta mark');
    expect(`${first.snippet}${second.snippet}`).not.toContain('<mark>');
  });

  it('caps the result count', () => {
    engine.upsert(
      Array.from({ length: 150 }, (_, i) =>
        doc({ id: `bulk${i}`, body: `palavra ${i}` })
      )
    );
    expect(engine.search({ text: 'palavra', limit: 1000 })).toHaveLength(100);
    expect(engine.search({ text: 'palavra' })).toHaveLength(50);
  });

  // A query cut to its first words would find messages that lack the rest.
  it('refuses a query with more words than the cap, and drops no word', () => {
    const words = Array.from({ length: MAX_QUERY_TOKENS + 1 }, (_, i) =>
      i === 0 ? 'orçamento' : `ausente${i}`
    );
    expect(toMatch(words.slice(0, MAX_QUERY_TOKENS).join(' '))).toBe(
      words
        .slice(0, MAX_QUERY_TOKENS)
        .map((word) => `"${word}"*`)
        .join(' ')
    );
    expect(() => toMatch(words.join(' '))).toThrow(
      `more than ${MAX_QUERY_TOKENS} words`
    );
    expect(() => engine.search({ text: words.join(' ') })).toThrow(
      `more than ${MAX_QUERY_TOKENS} words`
    );
  });

  it('keeps room state and reports stats', () => {
    expect(engine.getRoomState('r1')).toBeUndefined();
    engine.setRoomState('r1', {
      lastUpdate: 2000,
      backfillCursor: 'cursor-1',
      backfillDone: false,
    });
    engine.setRoomState('r1', { lastUpdate: 2500, backfillDone: true });
    expect(engine.getRoomState('r1')).toEqual({
      lastUpdate: 2500,
      backfillDone: true,
    });
    const stats = engine.stats();
    expect(stats).toMatchObject({ docs: 3, rooms: 2 });
    expect(stats.bytes).toBeGreaterThan(0);
  });

  it('reports schema recreation only when an open replaces existing index tables', () => {
    expect(engine.recreated).toBe(false);
    expect(createSearchEngine(db, { userId: 'me' }).recreated).toBe(false);
    db.exec('DROP TABLE meta');
    const recreated = createSearchEngine(db, { userId: 'me' });
    expect(recreated.recreated).toBe(true);
    expect(recreated.stats().docs).toBe(0);
    recreated.wipe();
    expect(recreated.recreated).toBe(true);
    expect(createSearchEngine(db, { userId: 'me' }).recreated).toBe(false);
  });

  it('wipes everything and rebuilds an index of another user or version', () => {
    expect(engine.recreated).toBe(false);
    engine.wipe();
    expect(engine.recreated).toBe(false);
    expect(engine.stats()).toMatchObject({ docs: 0, rooms: 0 });
    expect(ids(engine, 'orcamento')).toEqual([]);

    engine.upsert([doc({ id: 'z', body: 'segredo' })]);
    const sameUser = createSearchEngine(db, { userId: 'me' });
    expect(sameUser.schemaVersion).toBe(SCHEMA_VERSION);
    expect(sameUser.recreated).toBe(false);
    expect(ids(sameUser, 'segredo')).toEqual(['z']);

    const otherUser = createSearchEngine(db, { userId: 'someone-else' });
    expect(otherUser.recreated).toBe(true);
    expect(ids(otherUser, 'segredo')).toEqual([]);

    db.prepare(
      "UPDATE meta SET value = '0' WHERE key = 'schema_version'"
    ).run();
    otherUser.upsert([doc({ id: 'y', body: 'segredo' })]);
    const upgraded = createSearchEngine(db, { userId: 'someone-else' });
    expect(upgraded.recreated).toBe(true);
    expect(ids(upgraded, 'segredo')).toEqual([]);
    expect(() => upgraded.checkIntegrity()).not.toThrow();
  });

  it('rolls back a batch that fails half way', () => {
    expect(() =>
      engine.upsert([
        doc({ id: 'ok', body: 'parcial' }),
        { ...doc({ id: 'bad', body: 'x' }), uid: null as unknown as string },
      ])
    ).toThrow();
    expect(ids(engine, 'parcial')).toEqual([]);
  });
});

describe('e2eeSearch recent pagination', () => {
  let db: DatabaseSyncType;
  let engine: SearchEngine;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    engine = createSearchEngine(db, { userId: 'contract-user' });
  });

  afterEach(() => db.close());

  const collectPages = (
    query: E2EESearchRecentQuery
  ): E2EESearchRecentPage[] => {
    const pages: E2EESearchRecentPage[] = [];
    let cursor: E2EESearchRecentCursor | undefined;
    for (let index = 0; index < 210; index++) {
      const page = engine.searchRecentPage({ ...query, cursor });
      pages.push(page);
      if (!page.nextCursor) return pages;
      const last = page.hits[page.hits.length - 1];
      expect(page.nextCursor).toEqual({ ts: last.ts, id: last.id });
      expect(page.nextCursor).not.toEqual(cursor);
      cursor = page.nextCursor;
    }
    throw new Error('Recent pagination did not finish');
  };

  // These IDs, timestamps and page sizes follow the B1 recent-pages fixture.
  it('visits 205 matching timestamp ties once and preserves the room filter', () => {
    const documents = Array.from({ length: 205 }, (_, index) =>
      doc({
        id: `message-${String(index).padStart(3, '0')}`,
        rid: 'room-1',
        uid: 'user-1',
        username: 'user',
        body: 'needle',
      })
    );
    engine.upsert([
      ...[...documents].reverse(),
      { ...documents[0], id: 'excluded', rid: 'room-2' },
    ]);

    const pages = collectPages({ text: 'needle', rid: 'room-1', limit: 100 });
    const visited = pages.flatMap(({ hits }) => hits.map(({ id }) => id));
    expect(pages.map(({ hits }) => hits.length)).toEqual([100, 100, 5]);
    expect(visited).toEqual(documents.map(({ id }) => id).reverse());
    expect(new Set(visited).size).toBe(205);
    expect(pages[2]).not.toHaveProperty('nextCursor');
  });

  it.each(['needle', ''])(
    'uses UTF-8 binary ID order for timestamp ties (%j)',
    (text) => {
      const messageIds = ['a', 'z', 'é', '', '😀'];
      engine.upsert(
        [...messageIds]
          .reverse()
          .map((id) => doc({ id, rid: 'unicode-room', body: 'needle' }))
      );
      const expected = [...messageIds].sort((left, right) =>
        Buffer.compare(Buffer.from(right), Buffer.from(left))
      );
      expect(expected).not.toEqual([...messageIds].sort().reverse());
      const pages = collectPages({ text, rid: 'unicode-room', limit: 1 });
      expect(pages.flatMap(({ hits }) => hits.map(({ id }) => id))).toEqual(
        expected
      );
      expect(pages).toHaveLength(messageIds.length);
    }
  );

  it.each(['needle', ''])(
    'applies room, sender and inclusive date filters to every page (%j)',
    (text) => {
      const matching = [
        doc({ id: 'lower', body: 'needle', ts: 1000 }),
        doc({ id: 'tie-a', body: 'needle', ts: 1500 }),
        doc({ id: 'tie-z', body: 'needle', ts: 1500, tmid: 'thread' }),
        doc({ id: 'upper', body: 'needle', ts: 2000 }),
      ];
      engine.upsert([
        ...matching,
        doc({ id: 'wrong-room', body: 'needle', rid: 'r2', ts: 1490 }),
        doc({ id: 'wrong-sender', body: 'needle', uid: 'u2', ts: 1490 }),
        doc({ id: 'too-old', body: 'needle', ts: 999 }),
        doc({ id: 'too-new', body: 'needle', ts: 2001 }),
        doc({ id: 'z-nonmatch', body: 'other', ts: 1490 }),
      ]);
      const pages = collectPages({
        text,
        rid: 'r1',
        uid: 'u1',
        from: 1000,
        to: 2000,
        limit: 2,
      });
      expect(pages.flatMap(({ hits }) => hits.map(({ id }) => id))).toEqual(
        text
          ? ['upper', 'tie-z', 'tie-a', 'lower']
          : ['upper', 'tie-z', 'tie-a', 'z-nonmatch', 'lower']
      );
      const threaded = pages[0].hits[1];
      expect(threaded).toMatchObject({
        tmid: 'thread',
        uid: 'u1',
        username: 'ana',
      });
      expect(threaded.snippet).toBe(text ? '<mark>needle</mark>' : 'needle');
      expect(pages[pages.length - 1]).not.toHaveProperty('nextCursor');
    }
  );

  it('continues strictly at and between timestamp and ID boundaries', () => {
    engine.upsert([
      doc({ id: 'older-z', body: 'needle', ts: 999.5 }),
      doc({ id: 'a', body: 'needle', ts: 1000.5 }),
      doc({ id: 'z', body: 'needle', ts: 1000.5 }),
      doc({ id: 'newer-a', body: 'needle', ts: 1001.5 }),
    ]);
    const nextIds = (cursor: E2EESearchRecentCursor) =>
      engine
        .searchRecentPage({ text: 'needle', cursor })
        .hits.map(({ id }) => id);
    expect(nextIds({ ts: 1000.5, id: 'z' })).toEqual(['a', 'older-z']);
    expect(nextIds({ ts: 1000.5, id: 'm' })).toEqual(['a', 'older-z']);
    expect(nextIds({ ts: 1000.5, id: 'a' })).toEqual(['older-z']);
    expect(nextIds({ ts: 1000, id: 'z' })).toEqual(['older-z']);
    expect(nextIds({ ts: 999.5, id: 'older-z' })).toEqual([]);
    expect(
      engine.searchRecentPage({ text: 'needle', from: 1001, to: 1000 })
    ).toEqual({ hits: [] });
  });

  it('orders exact timestamps outside the rowid timestamp range', () => {
    const documents = [
      doc({ id: 'far-z', body: 'needle', ts: 2 ** 50 }),
      doc({ id: 'far-a', body: 'needle', ts: 2 ** 50 + 1 }),
      doc({ id: 'negative', body: 'needle', ts: -0.5 }),
      doc({ id: 'zero', body: 'needle', ts: 0 }),
    ];
    engine.upsert(documents);
    const pages = collectPages({ text: 'needle', from: -1, limit: 1 });
    expect(pages.flatMap(({ hits }) => hits.map(({ id }) => id))).toEqual([
      'far-a',
      'far-z',
      'zero',
      'negative',
    ]);
  });

  it('uses limit plus one only to detect another matching hit', () => {
    engine.upsert(
      Array.from({ length: 101 }, (_, index) =>
        doc({ id: `message-${index}`, body: 'needle' })
      )
    );
    const capped = engine.searchRecentPage({ text: 'needle', limit: 10_000 });
    expect(capped.hits).toHaveLength(100);
    expect(capped.nextCursor).toBeDefined();
    const final = engine.searchRecentPage({
      text: 'needle',
      limit: 100,
      cursor: capped.nextCursor,
    });
    expect(final.hits).toHaveLength(1);
    expect(final).not.toHaveProperty('nextCursor');
    expect(engine.searchRecentPage({ text: 'needle' }).hits).toHaveLength(50);
    for (const limit of [0, -5, 1, 1.9]) {
      expect(
        engine.searchRecentPage({ text: 'needle', limit }).hits
      ).toHaveLength(1);
    }
    expect(
      engine.searchRecentPage({ text: 'needle', limit: 2.9 }).hits
    ).toHaveLength(2);

    engine.remove(final.hits.map(({ id }) => id));
    const exact = engine.searchRecentPage({ text: 'needle', limit: 100 });
    expect(exact.hits).toHaveLength(100);
    expect(exact).not.toHaveProperty('nextCursor');
  });

  it('returns no cursor for no matches or an empty query without filters', () => {
    engine.upsert([doc({ id: 'a', body: 'needle' })]);
    for (const query of [
      { text: 'absent' },
      { text: '' },
      { text: '', cursor: { ts: 1000, id: 'z' } },
      { text: '?!', rid: 'r1' },
      { text: 'needle', rid: 'absent' },
    ]) {
      expect(engine.searchRecentPage(query)).toEqual({ hits: [] });
    }
  });

  it.each([
    null,
    [],
    'cursor',
    {},
    { ts: Infinity, id: 'a' },
    { ts: NaN, id: 'a' },
    { ts: 1000, id: '' },
    { ts: 1000, id: 'a'.repeat(MAX_ID_LENGTH + 1) },
  ])('rejects an invalid cursor before running a search (%j)', (cursor) => {
    expect(() =>
      engine.searchRecentPage({
        text: '',
        cursor: cursor as E2EESearchRecentCursor,
      })
    ).toThrow(E2EESearchInputError);
  });

  it('escapes snippets and leaves legacy timestamp-tie order unchanged', () => {
    engine.upsert([
      doc({ id: 'z', body: '<img> needle & "quote"' }),
      doc({ id: 'a', body: 'needle' }),
    ]);
    expect(
      engine.search({ text: 'needle', order: 'recent' }).map(({ id }) => id)
    ).toEqual(['a', 'z']);
    const page = engine.searchRecentPage({ text: 'needle' });
    expect(page.hits.map(({ id }) => id)).toEqual(['z', 'a']);
    expect(page.hits[0].snippet).toBe(
      '&lt;img&gt; <mark>needle</mark> &amp; &quot;quote&quot;'
    );
    expect(
      engine.searchRecentPage({ text: '', rid: 'r1' }).hits[0].snippet
    ).toBe('&lt;img&gt; needle &amp; &quot;quote&quot;');
  });
});

// A server page fills the index through the bridge. Each upsert
// call is size-checked, but the index needs a total cap too, or one page
// fills the memory of the worker and the snapshot on disk.
describe('e2eeSearch engine caps', () => {
  let db: DatabaseSyncType | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  const bulk = (prefix: string, count: number, body = 'texto') =>
    Array.from({ length: count }, (_, i) =>
      doc({ id: `${prefix}${i}`, body: `${body} ${i}` })
    );

  it('rejects an upsert that takes the index past maxDocs and keeps the docs before it', () => {
    db = new DatabaseSync(':memory:');
    const engine = createSearchEngine(db, { userId: 'me', maxDocs: 3 });
    engine.upsert(bulk('a', 3));
    expect(() => engine.upsert(bulk('b', 1))).toThrow(E2EESearchQuotaError);
    expect(engine.stats().docs).toBe(3);
    expect(ids(engine, 'texto')).toEqual(['a0', 'a1', 'a2']);
    // An update of a doc that is in the index adds no doc.
    engine.upsert([doc({ id: 'a0', body: 'novo', updatedAt: 2000 })]);
    expect(ids(engine, 'novo')).toEqual(['a0']);
    // A remove makes room again.
    engine.remove(['a1']);
    engine.upsert(bulk('c', 1));
    expect(engine.stats().docs).toBe(3);
  });

  it('rejects an upsert that takes the index past maxBytes, and freed pages count as room', () => {
    const memory = new DatabaseSync(':memory:');
    db = memory;
    const empty = createSearchEngine(memory, { userId: 'me' }).stats().bytes;
    const engine = createSearchEngine(memory, {
      userId: 'me',
      maxBytes: empty + 256 * 1024,
    });
    const big = (id: string) =>
      doc({ id, body: `${id} ${'x'.repeat(60 * 1024)}` });
    engine.upsert([big('k1')]);
    expect(() =>
      engine.upsert([big('k2'), big('k3'), big('k4'), big('k5')])
    ).toThrow(E2EESearchQuotaError);
    expect(engine.stats().docs).toBe(1);
    engine.remove(['k1']);
    engine.upsert([big('k6')]);
    expect(engine.stats().docs).toBe(1);
  });

  it('rejects a setRoomState for a new rid past maxRooms and keeps the rows before it', () => {
    db = new DatabaseSync(':memory:');
    const engine = createSearchEngine(db, { userId: 'me', maxRooms: 2 });
    engine.setRoomState('r1', { backfillDone: false });
    engine.setRoomState('r2', { backfillDone: false });
    expect(() => engine.setRoomState('r3', { backfillDone: false })).toThrow(
      E2EESearchQuotaError
    );
    const { rooms } = db
      .prepare('SELECT count(*) AS rooms FROM room_state')
      .get() as { rooms: number };
    expect(rooms).toBe(2);
    expect(engine.getRoomState('r3')).toBeUndefined();
    // An update of a room that has a row adds no row.
    engine.setRoomState('r1', { lastUpdate: 5, backfillDone: true });
    expect(engine.getRoomState('r1')).toEqual({
      lastUpdate: 5,
      backfillDone: true,
    });
    // A removeRoom makes room again.
    engine.removeRoom('r2');
    engine.setRoomState('r3', { backfillDone: false });
    expect(engine.getRoomState('r3')).toEqual({ backfillDone: false });
  });

  it('counts room_state in the maxBytes cap', () => {
    const memory = new DatabaseSync(':memory:');
    db = memory;
    const empty = createSearchEngine(memory, { userId: 'me' }).stats().bytes;
    const engine = createSearchEngine(memory, {
      userId: 'me',
      maxBytes: empty + 64 * 1024,
    });
    const cursor = 'c'.repeat(1024);
    let accepted = 0;
    expect(() => {
      for (let i = 0; i < 1000; i++) {
        engine.setRoomState(`room-${i}`, {
          backfillCursor: cursor,
          backfillDone: false,
        });
        accepted++;
      }
    }).toThrow(E2EESearchQuotaError);
    expect(accepted).toBeGreaterThan(0);
    expect(engine.getRoomState(`room-${accepted}`)).toBeUndefined();
    expect(engine.stats().bytes).toBeLessThanOrEqual(empty + 64 * 1024);
  });

  it('has default caps above a 500,000-doc index', () => {
    expect(MAX_INDEX_DOCS).toBeGreaterThanOrEqual(500_000);
    expect(MAX_INDEX_BYTES).toBeGreaterThanOrEqual(145 * 1024 * 1024);
    expect(MAX_INDEX_ROOMS).toBeGreaterThanOrEqual(10_000);
  });
});
