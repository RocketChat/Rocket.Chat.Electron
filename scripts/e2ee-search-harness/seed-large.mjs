// Adds a large history to the encrypted group of a seeded harness world.
// Run seed.mjs first.
//
//   node seed-large.mjs [--port <port>] [--count 10000] [--months 12]
//     [--concurrency 16] [--edits 20] [--deletes 10] [--thread-every 100]
//     [--seed 26]
//
// Method (record it with the results):
//   1. The real web client of user B (headless Chrome, the profile that
//      seed.mjs made) encrypts each message with the room key:
//      E2ERoom.encryptMessage() from client/lib/e2ee/rocketchat.e2e.room.ts,
//      reached through the Meteor client `require`. So each stored document
//      is real rc.v2.aes-sha2 ciphertext, with the kid of the room key.
//   2. The page sends each message with REST chat.sendMessage (the server
//      path of a normal send). Every `--thread-every`-th message is a thread
//      reply (tmid) to an older message.
//   3. The REST API cannot set an old `ts`, so the script then rewrites `ts`
//      and `_updatedAt` in MongoDB directly: the messages cover `--months`
//      months, the first one is the oldest, and the order stays the send
//      order. The thread parents get `tlm` and `tcount` back to valid values.
//   4. Then the page edits `--edits` old messages (chat.update with new
//      encrypted content), so they are old by `ts` and new by `_updatedAt`,
//      and deletes `--deletes` old messages (chat.delete).
// The text comes from the seeded chat corpus (scripts/e2ee-search-scale/
// corpus.cjs): English and Portuguese chat words, Zipf distributed, with
// diacritics and some CJK phrases. Known needle words sit at known places.
// The script prints counts only. It writes the needle ids and the counts to
// the state file under `large`. Nothing secret is printed.

import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  readState,
  stateDir,
  usersOf,
  worldKey,
  writeState,
} from './state.mjs';

const harnessDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(harnessDir, '..', '..');
const require = createRequire(import.meta.url);
const { createCorpus } = require('../e2ee-search-scale/corpus.cjs');

const { values } = parseArgs({
  options: {
    'port': { type: 'string' },
    'count': { type: 'string', default: '10000' },
    'months': { type: 'string', default: '12' },
    'concurrency': { type: 'string', default: '16' },
    'edits': { type: 'string', default: '20' },
    'deletes': { type: 'string', default: '10' },
    'thread-every': { type: 'string', default: '100' },
    'seed': { type: 'string', default: '26' },
  },
});
const port = Number(values.port ?? process.env.HARNESS_PORT ?? 3500);
const base = `http://${process.env.HARNESS_HOST ?? 'localhost'}:${port}`;
const COUNT = Number(values.count);
const MONTHS = Number(values.months);
const CONCURRENCY = Number(values.concurrency);
const EDITS = Number(values.edits);
const DELETES = Number(values.deletes);
const THREAD_EVERY = Number(values['thread-every']);
const coreDir =
  process.env.ROCKETCHAT_CORE_DIR ?? resolve(repoRoot, '..', 'Rocket.Chat');

const log = (...m) =>
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m);
const fail = (m) => {
  console.error(`seed-large: ${m}`);
  process.exit(1);
};

// A Meteor-style id: 17 characters.
const UNMISTAKABLE = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
const newId = () =>
  [...randomBytes(17)]
    .map((b) => UNMISTAKABLE[b % UNMISTAKABLE.length])
    .join('');

const PT = [
  'a reunião de orçamento foi adiada para amanhã',
  'não esqueça a apresentação de ação e atenção',
  'você já viu a revisão do código',
  'obrigado pela explicação da migração',
];
const CJK = [
  '会议记录已经更新',
  '今日のデプロイは完了しました',
  '请检查服务器日志',
];

// The words that the tests search for, and where they go (0 = the oldest).
const needles = (count) => [
  { key: 'oldest', word: 'harnesslargeoldest', at: 0 },
  { key: 'quarter', word: 'harnesslargequarter', at: Math.floor(count / 4) },
  { key: 'middle', word: 'harnesslargemiddle', at: Math.floor(count / 2) },
  { key: 'newest', word: 'harnesslargenewest', at: count - 1 },
  { key: 'diacritic', word: 'harnesslargeação', at: Math.floor(count / 3) },
];

const main = async () => {
  const state = readState();
  const world = state.worlds?.[worldKey(port)];
  const users = usersOf(state);
  if (!world?.group?.rid || !users?.b)
    fail('no seeded world for this port: run seed.mjs first');
  const rid = world.group.rid;

  const corpus = createCorpus({ seed: Number(values.seed) });
  const placed = needles(COUNT);
  const docs = [];
  for (let i = 0; i < COUNT; i++) {
    let msg = corpus.body();
    if (i % 50 === 7) msg = `${PT[i % PT.length]} ${msg}`;
    if (i % 100 === 13) msg = `${CJK[i % CJK.length]} ${msg}`;
    const needle = placed.find((n) => n.at === i);
    if (needle) msg = `${msg} ${needle.word}`;
    const doc = { _id: newId(), msg };
    if (THREAD_EVERY > 0 && i > 0 && i % THREAD_EVERY === 0) {
      doc.tmid = docs[i - Math.floor(THREAD_EVERY / 2)]._id;
    }
    docs.push(doc);
  }

  const puppeteer = require('puppeteer');
  const profile = join(
    stateDir(),
    `server-${port}`,
    'browser-profiles',
    users.b.username
  );
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: profile,
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const stats = { sent: 0, failed: 0, threadReplies: 0, edits: 0, deletes: 0 };
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/group/${world.group.name}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('textarea[name=msg]', { timeout: 180_000 });
    const ready = await page.waitForFunction(
      async (rid) => {
        // The Meteor client require: the module of the E2E client.
        const { e2e } = window.require('/client/lib/e2ee/rocketchat.e2e.ts');
        const room = await e2e.getInstanceByRoomId(rid);
        return Boolean(room?.isReady());
      },
      { timeout: 120_000, polling: 1000 },
      rid
    );
    if (!(await ready.jsonValue())) fail('the room key of B is not ready');
    log(`room key of B ready in ${rid}`);

    // Encrypts and sends one batch in the page. Returns the failed ids.
    const sendBatch = (batch) =>
      page.evaluate(
        async (rid, batch) => {
          const { e2e } = window.require('/client/lib/e2ee/rocketchat.e2e.ts');
          const room = await e2e.getInstanceByRoomId(rid);
          const headers = {
            'Content-Type': 'application/json',
            'X-User-Id': localStorage.getItem('Meteor.userId'),
            'X-Auth-Token': localStorage.getItem('Meteor.loginToken'),
          };
          const failed = [];
          await Promise.all(
            batch.map(async ({ _id, msg, tmid }) => {
              const message = await room.encryptMessage({ _id, rid, msg });
              if (tmid) message.tmid = tmid;
              const response = await fetch('/api/v1/chat.sendMessage', {
                method: 'POST',
                headers,
                body: JSON.stringify({ message }),
              });
              const body = await response.json().catch(() => ({}));
              if (!body.success)
                failed.push({ _id, error: body.error ?? response.status });
            })
          );
          return failed;
        },
        rid,
        batch
      );

    const started = Date.now();
    for (let i = 0; i < docs.length; i += CONCURRENCY) {
      const batch = docs.slice(i, i + CONCURRENCY);
      const failed = await sendBatch(batch);
      stats.failed += failed.length;
      stats.sent += batch.length - failed.length;
      if (failed.length)
        log(`failed in batch ${i}: ${JSON.stringify(failed.slice(0, 2))}`);
      if (i % 1000 < CONCURRENCY) log(`sent ${stats.sent}/${COUNT}`);
    }
    stats.threadReplies = docs.filter((d) => d.tmid).length;
    stats.sendMs = Date.now() - started;
    log(`sent ${stats.sent}, failed ${stats.failed}, in ${stats.sendMs} ms`);

    // Rewrites ts and _updatedAt in MongoDB: the REST API cannot set them.
    const { MongoClient } = createRequire(join(coreDir, 'package.json'))(
      'mongodb'
    );
    const mongo = new MongoClient(
      `mongodb://localhost:${port + 1}/?directConnection=true`
    );
    await mongo.connect();
    try {
      const messages = mongo.db('meteor').collection('rocketchat_message');
      const now = Date.now();
      const span = MONTHS * 30 * 24 * 3600 * 1000;
      const first = now - span - 3600 * 1000;
      const step = span / COUNT;
      const ops = docs.map((d, i) => {
        const ts = new Date(first + i * step);
        return {
          updateOne: {
            filter: { _id: d._id, rid },
            update: { $set: { ts, _updatedAt: ts } },
          },
        };
      });
      const res = await messages.bulkWrite(ops, { ordered: false });
      stats.backdated = res.modifiedCount;
      // Thread parents: the last reply time must not be older than the
      // replies, and not newer than now.
      const parents = [
        ...new Set(docs.filter((d) => d.tmid).map((d) => d.tmid)),
      ];
      for (const tmid of parents) {
        const last = await messages
          .find({ tmid })
          .sort({ ts: -1 })
          .limit(1)
          .next();
        if (last)
          await messages.updateOne({ _id: tmid }, { $set: { tlm: last.ts } });
      }
      stats.inMongo = await messages.countDocuments({ rid });
      stats.inMongoSeeded = await messages.countDocuments({
        rid,
        _id: { $in: docs.map((d) => d._id) },
      });
      stats.ciphertextOnly = await messages.countDocuments({
        rid,
        '_id': { $in: docs.map((d) => d._id) },
        't': 'e2e',
        'content.algorithm': 'rc.v2.aes-sha2',
        'msg': { $in: ['', null] },
      });
      const oldest = await messages
        .find({ rid })
        .sort({ ts: 1 })
        .limit(1)
        .next();
      stats.oldestTs = oldest?.ts?.toISOString();
    } finally {
      await mongo.close();
    }

    // Old messages edited now, and old messages deleted now.
    // In the oldest 10 % of the room, away from the needles.
    const first = Math.max(1, Math.floor(COUNT * 0.01));
    const editTargets = docs.slice(first, first + EDITS);
    const deleteTargets = docs.slice(
      first + EDITS + 1,
      first + EDITS + 1 + DELETES
    );
    const changed = await page.evaluate(
      async (rid, edits, deletes) => {
        const { e2e } = window.require('/client/lib/e2ee/rocketchat.e2e.ts');
        const room = await e2e.getInstanceByRoomId(rid);
        const headers = {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('Meteor.userId'),
          'X-Auth-Token': localStorage.getItem('Meteor.loginToken'),
        };
        const post = (path, body) =>
          fetch(`/api/v1/${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          }).then((r) => r.json());
        let edited = 0;
        let deleted = 0;
        let editError;
        for (const { _id, msg } of edits) {
          const content = await room.encryptMessageContent({
            msg: `${msg} harnesslargeedited`,
          });
          const result = await post('chat.update', {
            roomId: rid,
            msgId: _id,
            content,
          });
          if (result.success) edited++;
          else editError ??= String(result.error).slice(0, 200);
        }
        for (const { _id } of deletes) {
          if ((await post('chat.delete', { roomId: rid, msgId: _id })).success)
            deleted++;
        }
        return { edited, deleted, editError };
      },
      rid,
      editTargets,
      deleteTargets
    );
    stats.edits = changed.edited;
    stats.deletes = changed.deleted;
    log(
      `edited ${stats.edits} old messages, deleted ${stats.deletes}${changed.editError ? `, edit error: ${changed.editError}` : ''}`
    );

    world.large = {
      count: COUNT,
      months: MONTHS,
      seededAt: new Date().toISOString(),
      needles: Object.fromEntries(
        placed.map((n) => [n.key, { word: n.word, id: docs[n.at]._id }])
      ),
      editedWord: 'harnesslargeedited',
      editedIds: editTargets.map((d) => d._id),
      deletedIds: deleteTargets.map((d) => d._id),
      stats,
    };
    writeState(state);
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(stats));
  if (
    stats.failed ||
    stats.inMongoSeeded !== COUNT ||
    stats.edits !== EDITS ||
    stats.deletes !== DELETES
  )
    process.exit(1);
};

main().catch((error) => fail(error?.stack ?? String(error)));
