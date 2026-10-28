import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

import {
  createSearchEngine,
  MAX_INDEX_BYTES,
  MAX_INDEX_DOCS,
  MAX_INDEX_ROOMS,
} from '../engine';
import type { SearchEngine } from '../engine';
import { toMatch } from '../sanitize';
import { SCHEMA_VERSION } from '../schema';
import type { E2EESearchDoc } from '../types';
import { E2EESearchQuotaError } from '../validate';

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

  it('caps the result count and the query tokens', () => {
    engine.upsert(
      Array.from({ length: 150 }, (_, i) =>
        doc({ id: `bulk${i}`, body: `palavra ${i}` })
      )
    );
    expect(engine.search({ text: 'palavra', limit: 1000 })).toHaveLength(100);
    expect(engine.search({ text: 'palavra' })).toHaveLength(50);
    expect(toMatch('w '.repeat(40)).split(' ')).toHaveLength(16);
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

  it('wipes everything and rebuilds an index of another user or version', () => {
    engine.wipe();
    expect(engine.stats()).toMatchObject({ docs: 0, rooms: 0 });
    expect(ids(engine, 'orcamento')).toEqual([]);

    engine.upsert([doc({ id: 'z', body: 'segredo' })]);
    const sameUser = createSearchEngine(db, { userId: 'me' });
    expect(sameUser.schemaVersion).toBe(SCHEMA_VERSION);
    expect(ids(sameUser, 'segredo')).toEqual(['z']);

    const otherUser = createSearchEngine(db, { userId: 'someone-else' });
    expect(ids(otherUser, 'segredo')).toEqual([]);

    db.prepare(
      "UPDATE meta SET value = '0' WHERE key = 'schema_version'"
    ).run();
    otherUser.upsert([doc({ id: 'y', body: 'segredo' })]);
    const upgraded = createSearchEngine(db, { userId: 'someone-else' });
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

  it('has default caps above the 500,000-doc design bench', () => {
    expect(MAX_INDEX_DOCS).toBeGreaterThanOrEqual(500_000);
    expect(MAX_INDEX_BYTES).toBeGreaterThanOrEqual(145 * 1024 * 1024);
    expect(MAX_INDEX_ROOMS).toBeGreaterThanOrEqual(10_000);
  });
});
