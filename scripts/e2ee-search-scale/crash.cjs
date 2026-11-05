// Crash test for the E2EE search index. It kills the real
// utility-process worker with SIGKILL at random points while it writes, and
// checks after each kill that the index opens again and is not corrupt.
//
//   yarn build
//   node_modules/.bin/electron scripts/e2ee-search-scale/crash.cjs \
//     [--docs 200000] [--kills 60] [--store file|snapshot] [--batches 5]
//     [--out file.json]
//
// One cycle: open the index (a new worker), check it, write `--batches`
// upserts of 500 docs and a save, and send SIGKILL to the worker at a random
// time in that window. Then:
//   - the file store: open index.db in this process with the key and run
//     PRAGMA quick_check and the FTS5 integrity-check;
//   - both stores: a new worker opens the index, the needle of the base
//     index is found, and the doc count is between the last checked count
//     and that count plus the docs of the killed cycle;
//   - the folder holds no plaintext: a canary word of the killed cycle and
//     the base needle are not in any file (scanDirForCanary).
// A reopen that starts empty is counted apart: the index is a cache, so the
// store may drop it, but it must never load a corrupt index.

const { randomBytes } = require('node:crypto');
const { mkdtemp, readdir, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  createSearchHost,
  listFiles,
  load1,
  makeSpawn,
  mb,
  readFlag,
  round,
  runMain,
  time,
} = require('./common.cjs');
const { createCorpus } = require('./corpus.cjs');
const { scanDirForCanary } = require('../../src/e2eeSearch/main/canaryScan.ts');

const DOCS = readFlag('--docs', 200_000);
const KILLS = readFlag('--kills', 60);
const STORE = readFlag('--store', 'file');
const BATCHES = readFlag('--batches', 5);
const OUT = readFlag('--out', '');
const BATCH = 500;
const NEEDLE = 'zanzibarquokka';
const NO_AUTO_SAVE = { saveDelayMs: 3_600_000, saveMaxWaitMs: 3_600_000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Opens index.db outside the worker and checks the pages and the FTS index.
const checkFile = (file, key) => {
  const Database = require('better-sqlite3-multiple-ciphers');
  const db = new Database(file);
  try {
    db.pragma("cipher='chacha20'");
    db.pragma(`hexkey='${key.toString('hex')}'`);
    const quick = db.pragma('quick_check', { simple: true });
    db.prepare(
      "INSERT INTO messages_fts(messages_fts) VALUES('integrity-check')"
    ).run();
    const rows = db.prepare('SELECT count(*) AS n FROM messages').get().n;
    return { quick, fts: 'ok', rows };
  } finally {
    db.close();
  }
};

const run = async () => {
  if (STORE !== 'file' && STORE !== 'snapshot') {
    throw new Error('--store must be file or snapshot');
  }
  const env = { ...process.env, ROCKETCHAT_E2EE_SEARCH_STORE: STORE };
  const root = await mkdtemp(path.join(os.tmpdir(), 'e2ee-crash-'));
  const dir = path.join(root, 'user');
  const key = randomBytes(32);
  const args = () => ({
    userId: 'crash-user',
    dir,
    indexKey: { persistent: true, key: Buffer.from(key), reset: false },
  });
  const corpus = createCorpus({ seed: 7 });
  let nextId = 0;
  const doc = (body) => {
    const i = nextId++;
    return {
      id: `m${i}`,
      rid: `r${i % 200}`,
      uid: `u${i % 50}`,
      username: `user${i % 50}`,
      ts: 1_700_000_000_000 + i * 1000,
      updatedAt: 1_700_000_000_000 + i * 1000,
      kind: 'text',
      body,
    };
  };
  const tmpBefore = new Set(await readdir(os.tmpdir()));
  const result = {
    store: STORE,
    baseDocs: DOCS,
    kills: KILLS,
    docsPerCycle: BATCHES * BATCH,
    load1Start: load1(),
  };
  const state = {};
  const cycles = [];
  try {
    // The base index, saved once.
    let host = createSearchHost({
      spawn: makeSpawn(state, env),
      ...NO_AUTO_SAVE,
    });
    await host.open(dir, args());
    const needleId = `m${Math.floor(DOCS / 2)}`;
    const base = await time(async () => {
      for (let start = 0; start < DOCS; start += BATCH) {
        const docs = [];
        for (let i = start; i < Math.min(DOCS, start + BATCH); i++) {
          docs.push(
            doc(
              i === Math.floor(DOCS / 2)
                ? `${corpus.body()} ${NEEDLE}`
                : corpus.body()
            )
          );
        }
        await host.call(dir, 'upsert', docs);
      }
      await host.flush();
    });
    result.baseBuildMs = round(base.ms);
    await host.dispose();
    let checkedDocs = DOCS;

    // Calibrates the window: one cycle with no kill.
    const cycleWork = async (h, canary) => {
      for (let b = 0; b < BATCHES; b++) {
        const docs = Array.from({ length: BATCH }, (_, j) =>
          doc(j === 0 ? `${corpus.body()} ${canary}` : corpus.body())
        );
        await h.call(dir, 'upsert', docs);
      }
      state.phase = 'save';
      const saveStart = performance.now();
      await h.flush();
      state.saveMs = performance.now() - saveStart;
      state.phase = 'after-save';
    };
    host = createSearchHost({ spawn: makeSpawn(state, env), ...NO_AUTO_SAVE });
    await host.open(dir, args());
    const calibration = await time(() => cycleWork(host, 'calibratecanary'));
    result.cycleMs = round(calibration.ms);
    const calibrationSaveMs = state.saveMs;
    result.saveMs = round(calibrationSaveMs);
    await host.dispose();
    checkedDocs += BATCHES * BATCH;

    const counts = {
      ok: 0,
      startedEmpty: 0,
      corrupt: 0,
      canaryHits: 0,
      phases: {},
    };
    for (let k = 0; k < KILLS; k++) {
      const canary = `crashcanary${k}x${randomBytes(3).toString('hex')}`;
      host = createSearchHost({
        spawn: makeSpawn(state, env),
        ...NO_AUTO_SAVE,
      });
      await host.open(dir, args());
      const pid = state.pid;
      // Even cycles: a random time in the whole cycle. Odd cycles: a random
      // time inside the save, so the kill hits the write itself.
      const inSave = k % 2 === 1;
      const delay =
        Math.random() * (inSave ? calibrationSaveMs : calibration.ms * 1.2);
      state.phase = 'upsert';
      const work = cycleWork(host, canary).catch(() => 'killed');
      if (inSave) {
        while (state.phase === 'upsert') await sleep(1);
      }
      await sleep(delay);
      const phase = state.phase;
      process.kill(pid, 'SIGKILL');
      await work;
      // No dispose: a flush on a dead worker would start a new one and save.
      counts.phases[phase] = (counts.phases[phase] ?? 0) + 1;

      const cycle = { k, delayMs: round(delay), phase };
      if (STORE === 'file') {
        try {
          cycle.file = checkFile(path.join(dir, 'index.db'), key);
        } catch (error) {
          cycle.file = { error: `${error.code ?? ''} ${error.message}` };
        }
      }
      host = createSearchHost({
        spawn: makeSpawn(state, env),
        ...NO_AUTO_SAVE,
      });
      const reopen = await time(() => host.open(dir, args()));
      cycle.reopenMs = round(reopen.ms);
      const docs = (await host.call(dir, 'stats')).docs;
      const hits = await host.call(dir, 'search', { text: NEEDLE });
      const needleFound = hits.some(({ id }) => id === needleId);
      await host.dispose();
      cycle.docs = docs;
      const fileOk =
        STORE !== 'file' ||
        (cycle.file.quick === 'ok' && cycle.file.fts === 'ok');
      if (docs === 0) {
        counts.startedEmpty++;
        checkedDocs = 0;
      } else if (
        fileOk &&
        needleFound &&
        docs >= checkedDocs &&
        docs <= checkedDocs + BATCHES * BATCH
      ) {
        counts.ok++;
        checkedDocs = docs;
      } else {
        counts.corrupt++;
        cycle.corrupt = { fileOk, needleFound, expectedMin: checkedDocs };
      }
      const scan = [
        ...(await scanDirForCanary(dir, canary)).hits,
        ...(await scanDirForCanary(dir, NEEDLE)).hits,
      ];
      cycle.canaryHits = scan.length;
      counts.canaryHits += scan.length;
      cycles.push(cycle);
    }
    result.counts = counts;
    result.files = Object.fromEntries(
      Object.entries(await listFiles(dir)).map(([k, v]) => [k, mb(v)])
    );
    result.reopenMs = {
      min: Math.min(...cycles.map((c) => c.reopenMs)),
      max: Math.max(...cycles.map((c) => c.reopenMs)),
    };
    // SQLite temp files (etilqs_*) would hold plaintext. temp_store=MEMORY
    // must keep them away.
    result.newTempSqliteFiles = (await readdir(os.tmpdir())).filter(
      (n) => !tmpBefore.has(n) && n.startsWith('etilqs_')
    ).length;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  result.load1End = load1();
  result.cycles = cycles;
  if (OUT) await writeFile(OUT, `${JSON.stringify(result, null, 2)}\n`);
  const { cycles: _omit, ...summary } = result;
  console.log(JSON.stringify(summary));
  return result.counts.corrupt === 0 && result.counts.canaryHits === 0 ? 0 : 1;
};

runMain(run);
