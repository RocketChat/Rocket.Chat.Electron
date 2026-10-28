// Scale bench for the E2EE search index with chat-like text (LSE2EE-17,
// LSE2EE-25). It replaces the 30-word bench (bac9b6b10) with a seeded Zipf
// corpus (corpus.cjs), and it measures the store that the app uses now.
//
//   yarn build
//   node_modules/.bin/electron scripts/e2ee-search-scale/bench.cjs \
//     [--docs 200000] [--indexes 1] [--store file|snapshot] [--seed 42]
//     [--vocab 8000] [--zipf 1.0] [--reps 5] [--out file.json]
//
// --docs is per index. With --indexes 3, one worker holds 3 open indexes,
// as for a user with 3 servers. The bench times the searches on index 0.
// It prints one JSON line: timings in ms, worker RSS in MB, file sizes in
// MB, the raw text size and the 1-minute load average at start and end.
// Timings count at the load the machine has. The load is context only.
// It exits with 1 when the needle is not found after the reopen, or when
// a canary word is found in a file of the index folder.

const { randomBytes } = require('node:crypto');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  createSearchHost,
  listFiles,
  load1,
  makeSpawn,
  mb,
  peakRssDuring,
  readFlag,
  round,
  rssMB,
  runMain,
  stats,
  time,
} = require('./common.cjs');
const { createCorpus, queryClasses } = require('./corpus.cjs');
const { scanDirForCanary } = require('../../src/e2eeSearch/main/canaryScan.ts');

const DOCS = readFlag('--docs', 200_000);
const INDEXES = readFlag('--indexes', 1);
const STORE = readFlag('--store', 'file');
const SEED = readFlag('--seed', 42);
const VOCAB = readFlag('--vocab', 8000);
const ZIPF = readFlag('--zipf', 1.0);
const REPS = readFlag('--reps', 5);
const OUT = readFlag('--out', '');
const BATCH = 500;
const NEEDLE = 'zanzibarquokka';
// Long debounce: the bench decides when to save.
const BENCH_SAVES = { saveDelayMs: 3_600_000, saveMaxWaitMs: 3_600_000 };

const run = async () => {
  if (STORE !== 'file' && STORE !== 'snapshot') {
    throw new Error('--store must be file or snapshot');
  }
  const env = { ...process.env, ROCKETCHAT_E2EE_SEARCH_STORE: STORE };
  const root = await mkdtemp(path.join(os.tmpdir(), 'e2ee-scale-bench-'));
  const state = {};
  const result = {
    docsPerIndex: DOCS,
    indexes: INDEXES,
    store: STORE,
    corpus: { seed: SEED, vocab: VOCAB, zipfS: ZIPF },
    load1Start: load1(),
    cpus: os.cpus().length,
  };
  const indexes = Array.from({ length: INDEXES }, (_, i) => ({
    dir: path.join(root, `server${i}`, 'user'),
    args: undefined,
  }));
  for (const index of indexes) {
    index.args = {
      userId: 'bench-user',
      dir: index.dir,
      indexKey: { persistent: true, key: randomBytes(32), reset: false },
    };
  }
  const corpus = createCorpus({ seed: SEED, vocabSize: VOCAB, zipfS: ZIPF });
  const canaries = corpus.vocab.filter((w) => w.length >= 9).slice(0, 3);
  result.canaryWords = canaries.length + 1;
  let rawBytes = 0;
  const makeDoc = (i) => {
    const body =
      i === Math.floor(DOCS / 2) ? `${corpus.body()} ${NEEDLE}` : corpus.body();
    rawBytes += Buffer.byteLength(body);
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

  try {
    let host = createSearchHost({
      spawn: makeSpawn(state, env),
      ...BENCH_SAVES,
    });
    const opened = [];
    for (const index of indexes)
      opened.push(await host.open(index.dir, index.args));
    result.storeOpened = opened.map((o) => o.store);
    result.rssAfterOpenMB = rssMB(state.pid);

    const insert = await time(async () => {
      for (const index of indexes) {
        for (let start = 0; start < DOCS; start += BATCH) {
          const docs = [];
          for (let i = start; i < Math.min(DOCS, start + BATCH); i++)
            docs.push(makeDoc(i));
          await host.call(index.dir, 'upsert', docs);
        }
      }
    });
    result.insertMs = round(insert.ms);
    result.rawTextMB = mb(rawBytes);
    result.rssAfterInsertMB = rssMB(state.pid);

    // First save after the insert: the file store checkpoints the WAL, the
    // snapshot store writes the whole encrypted snapshot.
    const firstSave = await peakRssDuring(state.pid, () =>
      time(() => host.flush())
    );
    result.firstSaveMs = round(firstSave.value.ms);
    result.rssFirstSavePeakMB = firstSave.peak;

    const main = indexes[0].dir;
    const classes = queryClasses(corpus.vocab, NEEDLE);
    result.search = {};
    for (const order of ['relevance', 'recent']) {
      const all = [];
      const byClass = {};
      const searchRss = await peakRssDuring(state.pid, async () => {
        for (const [name, terms] of Object.entries(classes)) {
          const times = [];
          let hits = 0;
          for (let rep = 0; rep < REPS; rep++) {
            for (const text of terms) {
              const t = await time(() =>
                host.call(main, 'search', { text, order })
              );
              times.push(t.ms);
              hits = Math.max(hits, t.value.length);
            }
          }
          all.push(...times);
          byClass[name] = { ...stats(times), hits };
        }
      });
      result.search[order] = {
        all: stats(all),
        rssPeakMB: searchRss.peak,
        byClass,
      };
    }
    const terms = Object.values(classes).flat();
    result.searchTerms = terms.length;
    result.searchCalls = terms.length * REPS * 2;

    // One change and a save: what the debounce writes in the app.
    await host.call(main, 'upsert', [makeDoc(DOCS)]);
    const save = await peakRssDuring(state.pid, () => time(() => host.flush()));
    result.saveMs = round(save.value.ms);
    result.rssSavePeakMB = save.peak;

    await host.call(main, 'upsert', [makeDoc(DOCS + 1)]);
    result.quitFlushMs = round((await time(() => host.dispose())).ms);

    const files = await listFiles(root);
    result.filesMB = Object.fromEntries(
      Object.entries(files).map(([k, v]) => [k, mb(v)])
    );
    result.indexOnDiskMB = mb(Object.values(files).reduce((s, x) => s + x, 0));
    result.diskPerRawText = round(
      result.indexOnDiskMB / (result.rawTextMB * INDEXES)
    );

    // A new worker reopens every index.
    host = createSearchHost({ spawn: makeSpawn(state, env), ...BENCH_SAVES });
    const reopen = await time(async () => {
      for (const index of indexes) await host.open(index.dir, index.args);
    });
    result.reopenMs = round(reopen.ms);
    result.rssAfterReopenMB = rssMB(state.pid);
    const firstSearch = await time(() =>
      host.call(main, 'search', { text: corpus.vocab[0] })
    );
    result.firstSearchAfterReopenMs = round(firstSearch.ms);
    result.rssAfterReopenSearchMB = rssMB(state.pid);
    const hits = await host.call(main, 'search', { text: NEEDLE });
    result.needleFound = hits.some(
      ({ id }) => id === `m${Math.floor(DOCS / 2)}`
    );
    result.statsDocs = (await host.call(main, 'stats')).docs;
    await host.dispose();

    let canaryHits = 0;
    for (const token of [NEEDLE, ...canaries]) {
      canaryHits += (await scanDirForCanary(root, token)).hits.length;
    }
    result.canaryHits = canaryHits;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  result.load1End = load1();
  if (OUT) await writeFile(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
  return result.needleFound && result.canaryHits === 0 ? 0 : 1;
};

runMain(run);
