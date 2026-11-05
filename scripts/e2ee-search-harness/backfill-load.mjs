// Load test of the chat.syncMessages backfill on a
// harness server with a large encrypted room (seed-large.mjs).
//
//   node backfill-load.mjs [--port <port>] [--clients 1] [--pause-ms 12000]
//     [--count 100] [--max-seconds 0] [--probe-ms 500] [--baseline-s 15]
//     [--user a|b] [--out file.json]
//
// Each simulated client walks the room like the core crawler
// (searchIndexCrawler.ts): GET chat.syncMessages type=UPDATED, count=100,
// `previous` = the last cursor (the start time for the first page), one
// request at a time, `--pause-ms` between pages (the crawler default is
// 12 s). The walk ends when the cursor is null or the page is empty. Then
// the client reads the deletes (type=DELETED, `next` from the oldest message)
// like the catch-up does. `--max-seconds` stops a slow-pace run early.
//
// While the clients run, a normal-user probe (user B) calls groups.history
// (50 messages) and subscriptions.get every `--probe-ms`, and the script
// samples the CPU and RSS of mongod and of the meteor node process every
// second. A baseline of `--baseline-s` seconds runs first, with no backfill.
// MongoDB profiling (level 1, slowms 100) counts slow operations on the
// message collection during the run.
//
// Completeness (full walks only): the ids that each client saw against the
// MongoDB count of the room, the duplicate ids, and the deleted ids against
// the ids that seed-large.mjs deleted. It prints one JSON summary. Nothing
// secret is printed.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { readState, usersOf, worldKey } from './state.mjs';

const harnessDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(harnessDir, '..', '..');
const { values } = parseArgs({
  options: {
    'port': { type: 'string' },
    'clients': { type: 'string', default: '1' },
    'pause-ms': { type: 'string', default: '12000' },
    'count': { type: 'string', default: '100' },
    'max-seconds': { type: 'string', default: '0' },
    'probe-ms': { type: 'string', default: '500' },
    'baseline-s': { type: 'string', default: '15' },
    'user': { type: 'string', default: 'a' },
    'out': { type: 'string' },
  },
});
const port = Number(values.port ?? process.env.HARNESS_PORT ?? 3500);
const base = `http://${process.env.HARNESS_HOST ?? 'localhost'}:${port}`;
const CLIENTS = Number(values.clients);
const PAUSE = Number(values['pause-ms']);
const COUNT = Number(values.count);
const MAX_S = Number(values['max-seconds']);
const PROBE_MS = Number(values['probe-ms']);
const BASELINE_S = Number(values['baseline-s']);
const coreDir =
  process.env.ROCKETCHAT_CORE_DIR ?? resolve(repoRoot, '..', 'Rocket.Chat');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n) => Math.round(n * 10) / 10;
const pct = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
const summary = (xs) => {
  if (!xs.length) return { n: 0 };
  const s = [...xs].sort((a, b) => a - b);
  return {
    n: s.length,
    avg: round(s.reduce((a, b) => a + b, 0) / s.length),
    p50: round(pct(s, 0.5)),
    p95: round(pct(s, 0.95)),
    max: round(s[s.length - 1]),
  };
};

const rest = async (path, auth, init = {}) => {
  const started = performance.now();
  const response = await fetch(`${base}/api/v1/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && { 'X-User-Id': auth.userId, 'X-Auth-Token': auth.authToken }),
    },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body, ms: performance.now() - started };
};

const login = async (user) => {
  const { body } = await rest('login', undefined, {
    method: 'POST',
    body: JSON.stringify({ user: user.username, password: user.password }),
  });
  if (body.status !== 'success')
    throw new Error(`login ${user.username} failed`);
  return body.data;
};

// One client: the backfill walk, then the deletes.
const runClient = async (auth, rid, deadline, oldestTs) => {
  const seen = new Map();
  const times = [];
  const statuses = {};
  let requests = 0;
  let cursor = `${Date.now()}`;
  let complete = false;
  for (;;) {
    if (deadline && Date.now() > deadline) break;
    const q = new URLSearchParams({
      roomId: rid,
      type: 'UPDATED',
      count: `${COUNT}`,
      previous: cursor,
    });
    const { status, body, ms } = await rest(`chat.syncMessages?${q}`, auth);
    requests++;
    times.push(ms);
    statuses[status] = (statuses[status] ?? 0) + 1;
    if (status !== 200) {
      await sleep(PAUSE || 1000);
      continue;
    }
    const updated = body.result?.updated ?? [];
    for (const m of updated) seen.set(m._id, (seen.get(m._id) ?? 0) + 1);
    const previous = body.result?.cursor?.previous;
    if (!previous || updated.length === 0) {
      complete = true;
      break;
    }
    cursor = previous;
    if (PAUSE) await sleep(PAUSE);
  }
  // The deletes since the oldest message, like the catch-up (type DELETED).
  const deleted = new Set();
  if (complete) {
    let next = `${oldestTs - 1}`;
    for (;;) {
      const q = new URLSearchParams({
        roomId: rid,
        type: 'DELETED',
        count: `${COUNT}`,
        next,
      });
      const { body } = await rest(`chat.syncMessages?${q}`, auth);
      requests++;
      for (const m of body.result?.deleted ?? []) deleted.add(m._id);
      if (!body.result?.cursor?.next) break;
      next = body.result.cursor.next;
    }
  }
  return { seen, times, statuses, requests, complete, deleted };
};

// CPU % and RSS (MB) of a pid, from ps.
const sample = (pid) => {
  try {
    const [cpu, rss] = execFileSync(
      'ps',
      ['-o', '%cpu=,rss=', '-p', `${pid}`],
      { encoding: 'utf8' }
    )
      .trim()
      .split(/\s+/)
      .map(Number);
    return { cpu, rss: Math.round(rss / 1024) };
  } catch {
    return undefined;
  }
};

const pidOn = (p) => {
  try {
    return Number(
      execFileSync('lsof', ['-ti', `tcp:${p}`, '-sTCP:LISTEN'], {
        encoding: 'utf8',
      })
        .trim()
        .split('\n')[0]
    );
  } catch {
    return undefined;
  }
};

const main = async () => {
  const state = readState();
  const world = state.worlds?.[worldKey(port)];
  const users = usersOf(state);
  const rid = world?.group?.rid;
  if (!rid || !world.large)
    throw new Error('run seed.mjs and seed-large.mjs first');
  const crawler = users[values.user];
  const probeUser = users.b;

  const { MongoClient } = createRequire(join(coreDir, 'package.json'))(
    'mongodb'
  );
  const mongo = new MongoClient(
    `mongodb://localhost:${port + 1}/?directConnection=true`
  );
  await mongo.connect();
  const db = mongo.db('meteor');
  const messages = db.collection('rocketchat_message');
  const inRoom = await messages.countDocuments({ rid });
  const oldest = await messages.find({ rid }).sort({ ts: 1 }).limit(1).next();

  // In dev mode, the process on the port is the Meteor proxy. The app
  // server is its child process.
  const proxyPid = pidOn(port);
  const meteorPid = (() => {
    try {
      return Number(
        execFileSync('pgrep', ['-P', `${proxyPid}`], { encoding: 'utf8' })
          .trim()
          .split('\n')[0]
      );
    } catch {
      return proxyPid;
    }
  })();
  const mongoPid = pidOn(port + 1);
  const procs = { meteor: [], mongod: [] };
  let phase = 'baseline';
  const sampler = setInterval(() => {
    for (const [name, pid] of [
      ['meteor', meteorPid],
      ['mongod', mongoPid],
    ]) {
      const s = pid && sample(pid);
      if (s) procs[name].push({ phase, ...s });
    }
  }, 1000);

  const probe = { baseline: [], backfill: [] };
  let probing = true;
  const probeAuth = await login(probeUser);
  const probeLoop = (async () => {
    while (probing) {
      const a = await rest(`groups.history?roomId=${rid}&count=50`, probeAuth);
      const b = await rest('subscriptions.get', probeAuth);
      probe[phase === 'baseline' ? 'baseline' : 'backfill'].push(a.ms, b.ms);
      await sleep(PROBE_MS);
    }
  })();

  await sleep(BASELINE_S * 1000);
  await db.command({ profile: 1, slowms: 100 });
  const profileStart = new Date();
  phase = 'backfill';

  const auths = [];
  for (let i = 0; i < CLIENTS; i++) auths.push(await login(crawler));
  const started = Date.now();
  const deadline = MAX_S ? started + MAX_S * 1000 : 0;
  // Each client starts at a random time within the first page pause, like
  // the start jitter of the scheduler.
  const results = await Promise.all(
    auths.map(async (auth) => {
      await sleep(Math.random() * Math.min(PAUSE, 12_000));
      return runClient(auth, rid, deadline, oldest.ts.getTime());
    })
  );
  const wallMs = Date.now() - started;
  phase = 'after';
  probing = false;
  await probeLoop;
  clearInterval(sampler);

  const slow = await db
    .collection('system.profile')
    .find({ ts: { $gte: profileStart }, ns: 'meteor.rocketchat_message' })
    .project({ millis: 1, op: 1 })
    .toArray();
  await db.command({ profile: 0 });
  const deletedInTrash = await db
    .collection('rocketchat_trash')
    .countDocuments({ rid });
  await mongo.close();

  const largeDeleted = new Set(world.large.deletedIds ?? []);
  const perClient = results.map((r) => {
    const dup = [...r.seen.values()].filter((n) => n > 1).length;
    return {
      complete: r.complete,
      requests: r.requests,
      unique: r.seen.size,
      duplicates: dup,
      deletedSeen: [...largeDeleted].filter((id) => r.deleted.has(id)).length,
      statuses: r.statuses,
    };
  });
  const cpu = (name, ph) =>
    summary(procs[name].filter((s) => s.phase === ph).map((s) => s.cpu));
  const rss = (name) => Math.max(0, ...procs[name].map((s) => s.rss));
  const allTimes = results.flatMap((r) => r.times);
  const out = {
    clients: CLIENTS,
    pauseMs: PAUSE,
    pageSize: COUNT,
    maxSeconds: MAX_S,
    roomMessagesInMongo: inRoom,
    deletedInTrash,
    wallMs,
    requestsTotal: perClient.reduce((s, c) => s + c.requests, 0),
    requestsPerSecond: round(
      perClient.reduce((s, c) => s + c.requests, 0) / (wallMs / 1000)
    ),
    syncMessagesMs: summary(allTimes),
    clientsComplete: perClient.filter((c) => c.complete).length,
    uniqueMin: Math.min(...perClient.map((c) => c.unique)),
    uniqueMax: Math.max(...perClient.map((c) => c.unique)),
    duplicatesMax: Math.max(...perClient.map((c) => c.duplicates)),
    deletedSeenMin: Math.min(...perClient.map((c) => c.deletedSeen)),
    deletedExpected: largeDeleted.size,
    statuses: perClient.reduce((acc, c) => {
      for (const [k, v] of Object.entries(c.statuses))
        acc[k] = (acc[k] ?? 0) + v;
      return acc;
    }, {}),
    probeMs: {
      baseline: summary(probe.baseline),
      backfill: summary(probe.backfill),
    },
    cpu: {
      meteor: {
        baseline: cpu('meteor', 'baseline'),
        backfill: cpu('meteor', 'backfill'),
      },
      mongod: {
        baseline: cpu('mongod', 'baseline'),
        backfill: cpu('mongod', 'backfill'),
      },
    },
    rssMaxMB: { meteor: rss('meteor'), mongod: rss('mongod') },
    slowMongoOps: { count: slow.length, ...summary(slow.map((s) => s.millis)) },
    load1: execFileSync('sysctl', ['-n', 'vm.loadavg'], {
      encoding: 'utf8',
    }).trim(),
  };
  if (values.out)
    writeFileSync(
      values.out,
      `${JSON.stringify({ ...out, perClient }, null, 2)}\n`
    );
  console.log(JSON.stringify(out));
};

main().catch((error) => {
  console.error(`backfill-load: ${error?.stack ?? error}`);
  process.exit(1);
});
