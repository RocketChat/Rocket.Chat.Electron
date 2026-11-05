// Shared helpers for the E2EE search scale scripts. They run as an Electron
// main process, so each call takes the production path: the search host
// (src/e2eeSearch/host.ts) -> utilityProcess -> app/e2eeSearchWorker.js.
// Run `yarn build` first, so app/e2eeSearchWorker.js exists.

const { readdir, stat } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { app, utilityProcess } = require('electron');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' },
});
const { createSearchHost } = require('../../src/e2eeSearch/host.ts');

const WORKER = path.join(__dirname, '..', '..', 'app', 'e2eeSearchWorker.js');

const readFlag = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return typeof fallback === 'number' ? Number(value) : value;
};

// A spawn function for createSearchHost. `state.child` is the worker that
// runs now, so a script can read its pid or kill it.
const makeSpawn =
  (state, env = process.env) =>
  () => {
    const child = utilityProcess.fork(WORKER, [], {
      serviceName: 'E2EE Search Scale',
      env,
    });
    state.child = child;
    child.once('spawn', () => {
      state.pid = child.pid;
    });
    return {
      postMessage: (request) => child.postMessage(request),
      onMessage: (listener) => child.on('message', listener),
      onExit: (listener) => child.on('exit', listener),
      kill: () => {
        child.kill();
      },
    };
  };

// The worker RSS in MB, from app.getAppMetrics() workingSetSize (KB).
const rssMB = (pid) => {
  const metric = app.getAppMetrics().find((m) => m.pid === pid);
  return metric ? Math.round(metric.memory.workingSetSize / 1024) : undefined;
};

// Samples the RSS every 20 ms while `work` runs. Returns the peak.
const peakRssDuring = async (pid, work) => {
  let peak = rssMB(pid) ?? 0;
  const timer = setInterval(() => {
    peak = Math.max(peak, rssMB(pid) ?? 0);
  }, 20);
  let value;
  try {
    value = await work();
  } finally {
    clearInterval(timer);
  }
  return { peak: Math.max(peak, rssMB(pid) ?? 0), value };
};

const time = async (work) => {
  const start = performance.now();
  const value = await work();
  return { ms: performance.now() - start, value };
};

const round = (n) => Math.round(n * 10) / 10;
const mb = (bytes) => Math.round((bytes / 1048576) * 10) / 10;

const stats = (times) => {
  const sorted = [...times].sort((a, b) => a - b);
  const avg = sorted.reduce((s, x) => s + x, 0) / sorted.length;
  return {
    avg: round(avg),
    p95: round(sorted[Math.ceil(sorted.length * 0.95) - 1]),
    max: round(sorted[sorted.length - 1]),
  };
};

// Every file under `dir` with its size in bytes.
const listFiles = async (dir) => {
  const out = {};
  const visit = async (p) => {
    const s = await stat(p);
    if (s.isDirectory()) {
      for (const name of await readdir(p)) await visit(path.join(p, name));
    } else {
      out[path.relative(dir, p)] = s.size;
    }
  };
  await visit(dir);
  return out;
};

const load1 = () => round(os.loadavg()[0]);

const runMain = (run) => {
  app.dock?.hide();
  app.whenReady().then(async () => {
    let code = 0;
    try {
      code = (await run()) ?? 0;
    } catch (error) {
      console.log(JSON.stringify({ error: String(error?.stack ?? error) }));
      code = 1;
    }
    app.exit(code);
  });
};

module.exports = {
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
};
