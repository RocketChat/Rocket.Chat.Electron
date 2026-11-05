// Adds the other rooms of the test world to a seeded harness world,
// resets the room key of the large room, and checks the result with a new
// login of user A. Run seed.mjs and seed-large.mjs first.
//
//   node seed-rooms.mjs [--port <port>] [--pt-count 1000] [--cjk-count 300]
//     [--dm-count 200] [--after-reset 50] [--lost-count 0] [--seed 27]
//     [--skip-verify]
//
// Each step is skipped when the state file already has its result, so a
// second run only does what is missing. `server.sh reset` and a new seed
// make the world again from the start.
//
// Rooms (each one also gets the needle "orçamento trimestral 2025"):
//   - pt: an encrypted group with --pt-count Portuguese messages with
//     accents, over 3 months, with thread replies, quotes, 2 encrypted files
//     (sent through the composer), edits and deletes.
//   - cjk: an encrypted group with --cjk-count Chinese and Japanese messages.
//   - dm: an encrypted direct message between A and B, --dm-count messages.
//   - reset: the room key of the large room (seed-large.mjs) is reset once
//     (e2eRoom.resetRoomKey + REST e2e.resetRoomKey, the path of the room
//     menu). The old messages keep the old kid. Then B sends --after-reset
//     messages with the new kid.
//   - lost (only when --lost-count > 0): an encrypted group
//     where A has the room key, but the messages are encrypted with a room
//     key that B makes in the page and then drops. No client can decrypt
//     them: the case of an old room key that is lost.
// Method: the web client of B encrypts each message (E2ERoom.encryptMessage
// through e2e-module.mjs) and sends it with REST
// chat.sendMessage, as in seed-large.mjs. ts and _updatedAt are rewritten in
// MongoDB, because the REST API cannot set an old ts.
// Verify: a new login of A (a new browser profile, the E2E password typed in
// the password dialog) decrypts the needle messages of each room with the
// client E2E path, and the oldest message of the large room (old kid).
// The script prints counts and ids only. Nothing secret is printed.
// Each step logs its time (steps.mjs). A step that passes its limit closes
// the browsers and exits with code 124.

import { randomInt } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  readState,
  stateDir,
  usersOf,
  worldKey,
  writeState,
} from './state.mjs';
import { installE2eModule } from './e2e-module.mjs';
import { createSteps } from './steps.mjs';

const harnessDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(harnessDir, '..', '..');
const require = createRequire(import.meta.url);
const { prng } = require('../e2ee-search-scale/corpus.cjs');

const { values } = parseArgs({
  options: {
    'port': { type: 'string' },
    'pt-count': { type: 'string', default: '1000' },
    'cjk-count': { type: 'string', default: '300' },
    'dm-count': { type: 'string', default: '200' },
    'after-reset': { type: 'string', default: '50' },
    'lost-count': { type: 'string', default: '0' },
    'seed': { type: 'string', default: '27' },
    'skip-verify': { type: 'boolean', default: false },
  },
});
const port = Number(values.port ?? process.env.HARNESS_PORT ?? 3500);
const base = `http://${process.env.HARNESS_HOST ?? 'localhost'}:${port}`;
const coreDir =
  process.env.ROCKETCHAT_CORE_DIR ?? resolve(repoRoot, '..', 'Rocket.Chat');
const random = prng(Number(values.seed));
const NEEDLE = 'orçamento trimestral 2025';
const DAY = 24 * 3600 * 1000;
// About 0.16 s per message was measured for the pt, cjk and dm rooms.
const SEND_S_PER_MESSAGE = 0.16;

const steps = createSteps({ script: 'seed-rooms' });
// Every browser that the script opens, so a stuck step can close them all.
const browsers = new Set();
steps.onAbort(() =>
  Promise.all([...browsers].map((browser) => browser.close().catch(() => {})))
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) =>
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m);
const fail = (m) => {
  console.error(`seed-rooms: ${m}`);
  process.exit(1);
};

const UNMISTAKABLE = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
const newId = () =>
  Array.from({ length: 17 }, () => UNMISTAKABLE[randomInt(UNMISTAKABLE.length)]).join('');
const pick = (list) => list[Math.floor(random() * list.length)];

const PT_WORDS = `reunião orçamento amanhã ação atenção revisão migração
explicação apresentação configuração informação permissão sessão versão
avaliação decisão função público código é está não já você também até só
três mês médio próximo último relatório análise número usuário serviço
página técnico lógica pré pós crédito débito câmbio índice saúde segurança
notificação conexão instalação atualização produção homologação`
  .split(/\s+/)
  .filter(Boolean);
const PT_GLUE =
  'a o de da do que e em para com por um uma os as no na se mas'.split(' ');
const ptLine = () => {
  const words = [];
  for (let n = 4 + Math.floor(random() * 10), i = 0; i < n; i++)
    words.push(random() < 0.45 ? pick(PT_GLUE) : pick(PT_WORDS));
  return words.join(' ');
};

const CJK_LINES = [
  '会议记录已经更新',
  '请检查服务器日志',
  '明天上午十点开会',
  '这个版本有一个错误',
  '数据库备份已经完成',
  '今日のデプロイは完了しました',
  '明日の会議は午後三時からです',
  'サーバーのログを確認してください',
  '新しいバージョンをリリースしました',
  'テストはすべて成功しました',
];
const cjkLine = () => `${pick(CJK_LINES)} ${pick(CJK_LINES)}`;
const EN_WORDS =
  'deploy server build test release issue fix review code update branch log'.split(
    ' '
  );
const dmLine = () =>
  Array.from({ length: 3 + Math.floor(random() * 8) }, () =>
    random() < 0.5 ? pick(EN_WORDS) : pick(PT_WORDS)
  ).join(' ');

const launch = async (puppeteer, profile, { fresh = false } = {}) => {
  if (fresh) rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: profile,
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  browsers.add(browser);
  const page = await browser.newPage();
  await installE2eModule(page, coreDir);
  await page.setViewport({ width: 1400, height: 900 });
  return { browser, page };
};

// REST from the page, with the login of the page.
const api = (page, path, method = 'GET', body) =>
  page.evaluate(
    async (path, method, body) => {
      const response = await fetch(`/api/v1/${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('Meteor.userId'),
          'X-Auth-Token': localStorage.getItem('Meteor.loginToken'),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json();
    },
    path,
    method,
    body
  );

// Waits until the client has the room key of the room. A timeout of 0 has no
// own timer: the signal of a step ends the wait.
const waitRoomReady = (page, rid, timeout, signal) =>
  page.waitForFunction(
    async (rid) => {
      const { e2e } = await window.__harnessE2e();
      if (!e2e.isReady()) return false;
      const room = await e2e.getInstanceByRoomId(rid);
      return Boolean(room?.isReady());
    },
    { timeout, polling: 1000, signal },
    rid
  );

// The wait for the room key as a step: its limit (180 s by default) ends the
// wait.
const roomReadyStep = (label, page, rid) =>
  steps.run(
    `${label}/room-ready`,
    ({ signal }) => waitRoomReady(page, rid, 0, signal),
    { expectedS: 5, limitS: 180 }
  );

// Encrypts and sends the docs in the page, `concurrency` at a time. With
// `lostKey`, the page makes a new room key and encrypts with it only.
const sendDocs = async (page, rid, docs, { lostKey = false } = {}) => {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < docs.length; i += 16) {
    const batch = docs.slice(i, i + 16);
    const errors = await page.evaluate(
      async (rid, batch, lostKey) => {
        const { e2e } = await window.__harnessE2e();
        const room = await e2e.getInstanceByRoomId(rid);
        // A lost key: an object on top of the room instance gets its own new
        // key fields, so the room instance keeps its real key. The page
        // keeps one lost key per room in window.__harnessLostKeys and never
        // saves or sends it.
        let encryptor = room;
        if (lostKey) {
          window.__harnessLostKeys ??= {};
          if (!window.__harnessLostKeys[rid]) {
            const lost = Object.create(room);
            await lost.createNewGroupKey();
            window.__harnessLostKeys[rid] = lost;
          }
          encryptor = window.__harnessLostKeys[rid];
        }
        const headers = {
          'Content-Type': 'application/json',
          'X-User-Id': localStorage.getItem('Meteor.userId'),
          'X-Auth-Token': localStorage.getItem('Meteor.loginToken'),
        };
        const messages = [];
        for (const { _id, msg, tmid } of batch) {
          const message = await encryptor.encryptMessage({ _id, rid, msg });
          if (tmid) message.tmid = tmid;
          messages.push(message);
        }
        const errors = [];
        await Promise.all(
          messages.map(async (message) => {
            const response = await fetch('/api/v1/chat.sendMessage', {
              method: 'POST',
              headers,
              body: JSON.stringify({ message }),
            });
            const body = await response.json().catch(() => ({}));
            if (!body.success) errors.push(body.error ?? response.status);
          })
        );
        return errors;
      },
      rid,
      batch,
      lostKey
    );
    failed += errors.length;
    sent += batch.length - errors.length;
    if (errors.length)
      log(`send errors: ${JSON.stringify(errors.slice(0, 2))}`);
    if (i % 1000 < 16 && i > 0) log(`sent ${sent}/${docs.length}`);
  }
  return { sent, failed };
};

// Builds the docs of a room: thread replies every `threadEvery`, quotes
// every `quoteEvery`, and the needle at the middle.
const makeDocs = ({ count, line, roomPath, threadEvery, quoteEvery }) => {
  const docs = [];
  for (let i = 0; i < count; i++) {
    let msg = line(i);
    if (i === Math.floor(count / 2)) msg = `${msg} ${NEEDLE}`;
    const doc = { _id: newId(), msg };
    if (threadEvery && i > 0 && i % threadEvery === 0)
      doc.tmid = docs[i - Math.floor(threadEvery / 2)]._id;
    else if (quoteEvery && i > 1 && i % quoteEvery === 0)
      doc.msg = `[ ](${base}/${roomPath}?msg=${docs[i - 2]._id}) ${msg}`;
    docs.push(doc);
  }
  return docs;
};

const withMongo = async (work) => {
  const { MongoClient } = createRequire(join(coreDir, 'package.json'))(
    'mongodb'
  );
  const mongo = new MongoClient(
    `mongodb://localhost:${port + 1}/?directConnection=true`
  );
  await mongo.connect();
  try {
    return await work(mongo.db('meteor'));
  } finally {
    await mongo.close();
  }
};

// Spreads the ts of the docs over `days` days, oldest first, and fixes the
// last reply time of the thread parents.
const backdate = (rid, docs, days) =>
  withMongo(async (db) => {
    const messages = db.collection('rocketchat_message');
    const now = Date.now();
    const first = now - days * DAY - 3600 * 1000;
    const step = (days * DAY) / docs.length;
    const res = await messages.bulkWrite(
      docs.map((d, i) => {
        const ts = new Date(first + i * step);
        return {
          updateOne: {
            filter: { _id: d._id, rid },
            update: { $set: { ts, _updatedAt: ts } },
          },
        };
      }),
      { ordered: false }
    );
    for (const tmid of new Set(docs.filter((d) => d.tmid).map((d) => d.tmid))) {
      const last = await messages
        .find({ tmid })
        .sort({ ts: -1 })
        .limit(1)
        .next();
      if (last)
        await messages.updateOne({ _id: tmid }, { $set: { tlm: last.ts } });
    }
    return res.modifiedCount;
  });

const roomCounts = (rid) =>
  withMongo(async (db) => {
    const messages = db.collection('rocketchat_message');
    const kids = await messages.distinct('content.kid', { rid, t: 'e2e' });
    return {
      inMongo: await messages.countDocuments({ rid, _hidden: { $ne: true } }),
      e2e: await messages.countDocuments({
        't': 'e2e',
        rid,
        'content.algorithm': 'rc.v2.aes-sha2',
        'msg': { $in: ['', null] },
        '_hidden': { $ne: true },
      }),
      kids: kids.length,
    };
  });

// The client of B gives the room key to A, from the queue of the room.
const waitForKeyOfA = async (pageA, rid) => {
  for (let i = 0; i < 60; i++) {
    const { subscription } = await api(
      pageA,
      `subscriptions.getOne?roomId=${rid}`
    );
    if (subscription?.E2ESuggestedKey || subscription?.E2EKey) return true;
    await sleep(2000);
  }
  return false;
};

// Creates the encrypted group, or reuses a group of that name that has no
// messages yet (a run that stopped after the create).
const createGroup = async (pageB, name) => {
  const info = await api(pageB, `groups.info?roomName=${name}`);
  if (info.success) {
    if (info.group.msgs > 0)
      fail(`group ${name} exists with messages: run server.sh reset first`);
    return info.group._id;
  }
  const created = await api(pageB, 'groups.create', 'POST', {
    name,
    extraData: { encrypted: true },
  });
  if (!created.success) fail(`groups.create ${name}: ${created.error}`);
  return created.group._id;
};

// The first open of a new encrypted room makes the room key. Two handshakes
// of one client can race there: one sets the key id on the server, the
// other gets "key already exists" and drops the key that the first one did
// not save yet. The room then has a key id and no member has the key. In
// that case the creator resets the room key (the path of the room menu).
const openRoom = async (label, page, path, rid) => {
  await page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded' });
  const ready = await waitRoomReady(page, rid, 45_000).then(
    () => true,
    () => false
  );
  if (!ready) {
    const fixed = await page.evaluate(async (rid) => {
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': localStorage.getItem('Meteor.userId'),
        'X-Auth-Token': localStorage.getItem('Meteor.loginToken'),
      };
      const sub = await (
        await fetch(`/api/v1/subscriptions.getOne?roomId=${rid}`, { headers })
      ).json();
      if (sub.subscription?.E2EKey) return 'has key';
      const { e2e } = await window.__harnessE2e();
      const room = await e2e.getInstanceByRoomId(rid);
      const keys = await room.resetRoomKey();
      const response = await fetch('/api/v1/e2e.resetRoomKey', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rid,
          e2eKeyId: keys.e2eKeyId,
          e2eKey: keys.e2eKey,
        }),
      });
      return (await response.json()).success ? 'reset' : 'reset failed';
    }, rid);
    log(`room ${rid}: no own room key after the first open (${fixed})`);
    await roomReadyStep(label, page, rid);
  }
};

// openRoom as a step. The first wait (45 s) and a reset can come before the
// wait for the room key.
const openRoomStep = (label, page, path, rid) =>
  steps.run(`${label}/open`, () => openRoom(label, page, path, rid), {
    expectedS: 8,
    limitS: 300,
  });

const sendFile = async (page, filePath, caption) => {
  await page.waitForSelector('textarea[name=msg]', { timeout: 180_000 });
  const input = await page.$('input[type=file]');
  if (!input) fail('no file input in the composer');
  await input.uploadFile(filePath);
  await sleep(2000);
  await page.focus('textarea[name=msg]');
  await page.keyboard.type(caption);
  await page.keyboard.press('Enter');
  const word = caption.split(' ')[0];
  const handle = await page.waitForFunction(
    (word) =>
      [...document.querySelectorAll('[role=listitem][data-id]')].find(
        (e) =>
          e.innerText.includes(word) && e.getAttribute('aria-busy') !== 'true'
      )?.dataset.id,
    { timeout: 120_000, polling: 500 },
    word
  );
  return handle.jsonValue();
};

// Edits and deletes messages through REST, with new encrypted content.
const editAndDelete = (page, rid, edits, deletes) =>
  page.evaluate(
    async (rid, edits, deletes) => {
      const { e2e } = await window.__harnessE2e();
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
      for (const { _id, msg } of edits) {
        const content = await room.encryptMessageContent({
          msg: `${msg} edição revisada`,
        });
        if (
          (await post('chat.update', { roomId: rid, msgId: _id, content }))
            .success
        )
          edited++;
      }
      for (const { _id } of deletes) {
        if ((await post('chat.delete', { roomId: rid, msgId: _id })).success)
          deleted++;
      }
      return { edited, deleted };
    },
    rid,
    edits,
    deletes
  );

// Seeds one room: create (or reuse the DM), give A the key, send, backdate.
const seedRoom = async ({
  b,
  a,
  key,
  name,
  path,
  rid,
  docs,
  days,
  lostKey,
}) => {
  await openRoomStep(key, b.page, path, rid);
  if (key === 'dm') {
    // A direct message has no invite. A asks for the room key when A opens the room, and B answers.
    await steps.run(
      'dm/a-open',
      () => a.page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded' }),
      { expectedS: 8, limitS: 120 }
    );
  }
  const keyed = await steps.run(
    `${key}/key-to-a`,
    () => waitForKeyOfA(a.page, rid),
    { expectedS: 10, limitS: 180 }
  );
  if (!keyed) fail(`B did not give A the key of ${key} in 120 s`);
  const started = Date.now();
  const result = await steps.run(
    `${key}/send`,
    () => sendDocs(b.page, rid, docs, { lostKey }),
    {
      expectedS: Math.ceil(docs.length * SEND_S_PER_MESSAGE),
      limitS: Math.max(300, docs.length * 0.6),
      params: { count: docs.length },
    }
  );
  const backdated = await steps.run(
    `${key}/backdate`,
    () => backdate(rid, docs, days),
    { expectedS: 2, limitS: 300 }
  );
  log(
    `${key}: sent ${result.sent}, failed ${result.failed}, backdated ${backdated}, in ${Date.now() - started} ms`
  );
  return { ...result, backdated };
};

// Opens the client and logs the user in when the profile has no login. A
// client with no local E2E key asks for the E2E password (banner, then
// dialog). Resolves true when E2E is ready.
const login = async (page, user) => {
  await page.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      localStorage.getItem('Meteor.loginToken') ||
      document.querySelector('input[name=usernameOrEmail]'),
    { timeout: 180_000, polling: 500 }
  );
  const loggedIn = await page.evaluate(
    () => !!localStorage.getItem('Meteor.loginToken')
  );
  if (!loggedIn) {
    await page.type('input[name=usernameOrEmail]', user.username);
    await page.type('input[name=password]', user.password);
    await page.evaluate(() => document.querySelector('form').requestSubmit());
    await page.waitForFunction(
      () => !!localStorage.getItem('Meteor.loginToken'),
      { timeout: 90_000 }
    );
  }
  for (let i = 0; i < 90; i++) {
    const step = await page.evaluate(async () => {
      let mod;
      try {
        mod = await window.__harnessE2e();
      } catch {
        return 'loading';
      }
      if (mod.e2e.isReady()) return 'ready';
      if (document.querySelector('.rcx-modal input[type=password]'))
        return 'dialog';
      [...document.querySelectorAll('.rcx-banner')]
        .find((x) => /E2E/i.test(x.innerText))
        ?.querySelector('.rcx-banner__content')
        ?.click();
      return 'waiting';
    });
    if (step === 'ready') return true;
    if (step === 'dialog') {
      await page.type('.rcx-modal input[type=password]', user.e2ePassword);
      await page.evaluate(() =>
        document.querySelector('.rcx-modal .rcx-button--primary')?.click()
      );
    }
    await sleep(2000);
  }
  return false;
};

const verifyWithNewLogin = async (puppeteer, users, world) => {
  const profile = join(
    stateDir(),
    `server-${port}`,
    'browser-profiles',
    `${users.a.username}-verify`
  );
  const { browser, page } = await launch(puppeteer, profile, { fresh: true });
  try {
    const ready = await steps.run('verify/login', () => login(page, users.a), {
      expectedS: 20,
      limitS: 480,
    });
    if (!ready) return { e2eReady: false };

    const checks = [
      ...Object.entries(world.rooms ?? {})
        .filter(([key]) => key !== 'lost')
        .map(([key, room]) => ({
          key,
          rid: room.rid,
          id: room.needleId,
          word: 'trimestral',
        })),
      {
        key: 'large-before-reset',
        rid: world.group.rid,
        id: world.large?.needles?.oldest?.id,
        word: world.large?.needles?.oldest?.word,
      },
      {
        key: 'large-after-reset',
        rid: world.group.rid,
        id: world.keyReset?.needleId,
        word: 'trimestral',
      },
    ].filter((c) => c.id);
    const results = {};
    for (const check of checks) {
      const verifyStep = steps.start(`verify/${check.key}`, {
        expectedS: 5,
        limitS: 180,
      });
      await waitRoomReady(page, check.rid, 120_000).catch(() => undefined);
      results[check.key] = await page.evaluate(async ({ rid, id, word }) => {
        const { e2e } = await window.__harnessE2e();
        const response = await fetch(`/api/v1/chat.getMessage?msgId=${id}`, {
          headers: {
            'X-User-Id': localStorage.getItem('Meteor.userId'),
            'X-Auth-Token': localStorage.getItem('Meteor.loginToken'),
          },
        });
        const { message } = await response.json();
        if (!message || message.rid !== rid) return 'missing';
        message.ts = new Date(message.ts);
        message._updatedAt = new Date(message._updatedAt);
        const decrypted = await e2e.decryptMessage(message);
        return decrypted.e2e === 'done' && (decrypted.msg ?? '').includes(word)
          ? 'decrypted'
          : `not decrypted (${decrypted.e2e})`;
      }, check);
      verifyStep.end(results[check.key] === 'decrypted', results[check.key]);
    }
    return { e2eReady: true, results };
  } finally {
    await browser.close();
  }
};

const main = async () => {
  const state = readState();
  const world = state.worlds?.[worldKey(port)];
  const users = usersOf(state);
  if (!world?.group?.rid || !users?.b) fail('no seeded world: run seed.mjs');
  if (!world.large) fail('no large room: run seed-large.mjs first');
  world.rooms ??= {};
  const save = () => {
    const fresh = readState();
    fresh.worlds[worldKey(port)] = world;
    writeState(fresh);
  };

  const puppeteer = require('puppeteer');
  const profiles = join(stateDir(), `server-${port}`, 'browser-profiles');
  const b = await launch(puppeteer, join(profiles, users.b.username));
  const a = await launch(puppeteer, join(profiles, users.a.username));
  const summary = {};
  try {
    for (const [client, user, label] of [
      [a, users.a, 'login-a'],
      [b, users.b, 'login-b'],
    ]) {
      // The limit covers the page timeouts of login one after the other.
      const ready = await steps.run(label, () => login(client.page, user), {
        expectedS: 20,
        limitS: 480,
      });
      if (!ready) fail(`E2E of ${user.username} is not ready`);
    }
    log('A and B logged in, E2E ready');

    const plan = [
      {
        key: 'pt',
        name: 'harness-pt-room',
        count: Number(values['pt-count']),
        line: ptLine,
        days: 90,
        threadEvery: 25,
        quoteEvery: 40,
      },
      {
        key: 'cjk',
        name: 'harness-cjk-room',
        count: Number(values['cjk-count']),
        line: cjkLine,
        days: 30,
        threadEvery: 50,
      },
      { key: 'dm', count: Number(values['dm-count']), line: dmLine, days: 60 },
      {
        key: 'lost',
        name: 'harness-lostkey-room',
        count: Number(values['lost-count']),
        line: dmLine,
        days: 30,
        lostKey: true,
      },
    ];

    for (const room of plan) {
      if (world.rooms[room.key] || room.count <= 0) continue;
      let rid;
      let path;
      if (room.key === 'dm') {
        rid = await steps.run(
          'dm/create',
          async () => {
            const im = await api(b.page, 'im.create', 'POST', {
              username: users.a.username,
            });
            if (!im.success) fail(`im.create: ${im.error}`);
            const encrypted = await api(
              b.page,
              'rooms.saveRoomSettings',
              'POST',
              { rid: im.room._id, encrypted: true }
            );
            if (!encrypted.success) fail(`DM encryption: ${encrypted.error}`);
            return im.room._id;
          },
          { expectedS: 2, limitS: 60 }
        );
        path = `direct/${rid}`;
      } else {
        rid = await steps.run(
          `${room.key}/create`,
          () => createGroup(b.page, room.name),
          { expectedS: 2, limitS: 60 }
        );
        path = `group/${room.name}`;
        await openRoomStep(room.key, b.page, path, rid);
        await steps.run(
          `${room.key}/invite`,
          async () => {
            const invited = await api(b.page, 'groups.invite', 'POST', {
              roomId: rid,
              username: users.a.username,
            });
            if (!invited.success)
              fail(`groups.invite ${room.name}: ${invited.error}`);
          },
          { expectedS: 2, limitS: 60 }
        );
      }
      const docs = makeDocs({ ...room, roomPath: path });
      const result = await seedRoom({
        b,
        a,
        key: room.key,
        name: room.name,
        path,
        rid,
        docs,
        days: room.days,
        lostKey: room.lostKey,
      });
      const entry = {
        rid,
        name: room.name ?? 'dm',
        count: room.count,
        needleId: docs[Math.floor(room.count / 2)]._id,
        ...result,
        threadReplies: docs.filter((d) => d.tmid).length,
        quotes: docs.filter((d) => d.msg.startsWith('[ ](')).length,
      };
      if (room.key === 'pt') {
        await openRoomStep('pt-files', b.page, path, rid);
        const attachment = join(profiles, 'harness-pt-anexo.txt');
        writeFileSync(attachment, 'anexo de teste da busca local\n');
        entry.files = await steps.run(
          'pt/files',
          async () => [
            await sendFile(
              b.page,
              attachment,
              'harnessptanexo relatório de ação'
            ),
            await sendFile(
              b.page,
              attachment,
              'harnessptplanilha orçamento médio'
            ),
          ],
          { expectedS: 10, limitS: 660 }
        );
        const first = Math.floor(room.count * 0.05);
        const changed = await steps.run(
          'pt/edit-delete',
          () =>
            editAndDelete(
              b.page,
              rid,
              docs.slice(first, first + 10),
              docs.slice(first + 11, first + 16)
            ),
          { expectedS: 5, limitS: 300 }
        );
        Object.assign(entry, changed);
        log(
          `pt: 2 files, edited ${changed.edited}, deleted ${changed.deleted}`
        );
      }
      world.rooms[room.key] = entry;
      save();
    }

    if (!world.keyReset) {
      const rid = world.group.rid;
      await openRoomStep('key-reset', b.page, `group/${world.group.name}`, rid);
      const resetStep = steps.start('key-reset/reset', {
        expectedS: 5,
        limitS: 180,
      });
      const before = await roomCounts(rid);
      const reset = await b.page.evaluate(async (rid) => {
        const { e2e } = await window.__harnessE2e();
        const room = await e2e.getInstanceByRoomId(rid);
        const oldKid = room.keyID;
        const keys = await room.resetRoomKey();
        const response = await fetch('/api/v1/e2e.resetRoomKey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': localStorage.getItem('Meteor.userId'),
            'X-Auth-Token': localStorage.getItem('Meteor.loginToken'),
          },
          body: JSON.stringify({
            rid,
            e2eKeyId: keys.e2eKeyId,
            e2eKey: keys.e2eKey,
          }),
        });
        return {
          oldKid,
          newKid: keys.e2eKeyId,
          ok: (await response.json()).success,
        };
      }, rid);
      if (!reset.ok || reset.oldKid === reset.newKid)
        fail('room key reset failed');
      resetStep.end(true);
      log('large room: room key reset');
      await roomReadyStep('key-reset', b.page, rid);
      const keyed = await steps.run(
        'key-reset/key-to-a',
        () => waitForKeyOfA(a.page, rid),
        { expectedS: 10, limitS: 180 }
      );
      if (!keyed) fail('B did not give A the new key of the large room');
      const docs = makeDocs({
        count: Number(values['after-reset']),
        line: dmLine,
        roomPath: `group/${world.group.name}`,
      });
      const sent = await steps.run(
        'key-reset/send',
        () => sendDocs(b.page, rid, docs),
        {
          expectedS: Math.ceil(docs.length * SEND_S_PER_MESSAGE),
          limitS: Math.max(300, docs.length * 0.6),
          params: { count: docs.length },
        }
      );
      const after = await roomCounts(rid);
      world.keyReset = {
        at: new Date().toISOString(),
        oldKid: reset.oldKid,
        newKid: reset.newKid,
        afterReset: sent,
        needleId: docs[Math.floor(docs.length / 2)]._id,
        kidsBefore: before.kids,
        kidsAfter: after.kids,
      };
      save();
      log(
        `large room: ${sent.sent} messages with the new kid, kids ${before.kids} -> ${after.kids}`
      );
    }

    await steps.run(
      'room-counts',
      async () => {
        for (const [key, room] of Object.entries(world.rooms))
          summary[key] = await roomCounts(room.rid);
        summary.large = await roomCounts(world.group.rid);
      },
      { expectedS: 3, limitS: 180 }
    );
  } finally {
    await a.browser.close().catch(() => undefined);
    await b.browser.close().catch(() => undefined);
  }

  if (!values['skip-verify']) {
    const verify = await verifyWithNewLogin(puppeteer, users, world);
    summary.verify = verify;
    world.verifiedAt = new Date().toISOString();
    world.verify = verify;
    save();
  }
  console.log(JSON.stringify(summary));
  const bad =
    summary.verify &&
    (!summary.verify.e2eReady ||
      Object.values(summary.verify.results).some((r) => r !== 'decrypted'));
  if (bad) process.exit(1);
};

main().catch((error) => fail(error?.stack ?? String(error)));
