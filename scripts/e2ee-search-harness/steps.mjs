// Step log, expected time and watchdog of the E2EE search harness.
//
// Each step of a harness script prints a start line and an end line on
// stderr, and appends the same lines to the log of the state folder
// ($HARNESS_STATE_DIR/steps.log) and of the run folder ($HARNESS_STEP_RUN_DIR/
// steps.log, when it is set):
//
//   [12:01:02] STEP start seed-rooms/dm/send (expected ~29s, limit 600s, count=200)
//   [12:01:32] STEP slow seed-rooms/dm/send 30s (expected ~29s, limit 600s)
//   [12:01:34] STEP done seed-rooms/dm/send 31.6s (expected ~29s)
//   [12:01:40] STEP FAIL seed-rooms/dm/key-to-a timeout after 150s (expected ~4s)
//
// The expected time of a step is the median of its last runs in
// step-timings.json (next to this file, committed). Without runs, it is the
// `expectedS` of the entry in that file, else the default of the step in the
// code. The limit is max(default limit, 4 x expected) x
// HARNESS_STEP_LIMIT_SCALE. Past the limit the step fails, the abort handlers
// of the script run (they stop what the script started), and the process
// exits with code 124.
//
// $HARNESS_STATE_DIR/current-step.json holds every running step (script,
// step, start time, expected time, limit, pid), so a watcher can read where a
// run is.
//
// Node scripts import `createSteps`. Shell scripts use the `step` function of
// common.sh, which calls this file as a command:
//
//   node steps.mjs begin --script S --step N --expected E --limit L --pid P [--param k=v ...]
//       prints "<expected> <limit> <start ms>"
//   node steps.mjs slow  --script S --step N --start MS --expected E --limit L
//   node steps.mjs end   --script S --step N --start MS --expected E --pid P
//       --status done|fail|timeout [--reason R] [--param k=v ...]

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { stateDir } from './state.mjs';

const harnessDir = dirname(fileURLToPath(import.meta.url));

export const STEP_TIMEOUT_CODE = 124;
const RUNS_KEPT = 10;
const LIMIT_FACTOR = 4;
const LOG_ROTATE_BYTES = 5 * 1024 * 1024;

export const timingsFile = () =>
  process.env.HARNESS_STEP_TIMINGS ?? join(harnessDir, 'step-timings.json');
export const currentStepFile = () => join(stateDir(), 'current-step.json');
const stateLogFile = () => join(stateDir(), 'steps.log');
const runLogFile = () =>
  process.env.HARNESS_STEP_RUN_DIR
    ? join(process.env.HARNESS_STEP_RUN_DIR, 'steps.log')
    : undefined;

const positiveNumber = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
const limitScale = () => positiveNumber('HARNESS_STEP_LIMIT_SCALE', 1);
const slowEveryS = () => positiveNumber('HARNESS_STEP_SLOW_EVERY_S', 20);
const cleanupGraceS = () => positiveNumber('HARNESS_STEP_CLEANUP_S', 30);
export const platform = () =>
  process.env.HARNESS_STEP_PLATFORM || process.platform;

const round1 = (value) => Math.round(value * 10) / 10;
const seconds = (value) =>
  value < 100 ? `${round1(value)}s` : `${Math.round(value)}s`;

export const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const paramText = (params = {}) =>
  Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join(' ');

// The key of a step in step-timings.json: "<script>/<step> <platform> [k=v ...]".
export const timingKey = (script, step, params) =>
  [`${script}/${step}`, platform(), paramText(params)]
    .filter(Boolean)
    .join(' ');

const readJson = (file, fallback) => {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf8'));
};

// Writes to a temporary file first, so a reader never sees half a file.
const writeAtomic = (file, text) => {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, file);
};

export const readTimings = () => {
  try {
    return readJson(timingsFile(), {});
  } catch (error) {
    warn(`cannot read ${timingsFile()}: ${error.message}`);
    return undefined;
  }
};

// One entry per line, keys sorted, so that a diff shows only the changed steps.
export const formatTimings = (timings) => {
  const keys = Object.keys(timings).sort();
  const lines = keys.map(
    (key) =>
      `  ${JSON.stringify(key)}: ${JSON.stringify({
        expectedS: timings[key].expectedS,
        runs: timings[key].runs ?? [],
      })}`
  );
  return `{\n${lines.join(',\n')}\n}\n`;
};

const recordRun = (key, durationS) => {
  const timings = readTimings();
  // A file that does not parse (for example a merge conflict) stays as it is.
  if (!timings) return;
  const runs = [...(timings[key]?.runs ?? []), round1(durationS)].slice(
    -RUNS_KEPT
  );
  timings[key] = { expectedS: round1(median(runs)), runs };
  try {
    writeAtomic(timingsFile(), formatTimings(timings));
  } catch (error) {
    warn(`cannot write ${timingsFile()}: ${error.message}`);
  }
};

// The expected time and the limit of a step, from its history.
export const planStep = ({ script, step, params, expectedS, limitS }) => {
  const key = timingKey(script, step, params);
  const entry = readTimings()?.[key];
  const runs = entry?.runs ?? [];
  const expected = runs.length ? median(runs) : entry?.expectedS ?? expectedS;
  const limit = Math.max(limitS, LIMIT_FACTOR * expected) * limitScale();
  return {
    key,
    expectedS: round1(expected),
    limitS: round1(limit),
    history: runs.length,
  };
};

const clock = (date) => date.toTimeString().slice(0, 8);
const day = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Synchronous writes: the lines must also reach the log when the process
// exits at once.
const appendLog = (file, text) => {
  try {
    mkdirSync(dirname(file), { recursive: true });
    if (existsSync(file) && statSync(file).size > LOG_ROTATE_BYTES)
      renameSync(file, `${file}.1`);
    appendFileSync(file, text);
  } catch {
    // A log that cannot be written must not stop the run.
  }
};

export const emit = (text) => {
  const now = new Date();
  try {
    writeSync(2, `[${clock(now)}] ${text}\n`);
  } catch {
    // stderr is closed.
  }
  const line = `${day(now)} ${clock(now)} pid=${process.pid} ${text}\n`;
  appendLog(stateLogFile(), line);
  const runLog = runLogFile();
  if (runLog) appendLog(runLog, line);
};

function warn(text) {
  try {
    writeSync(2, `steps: warning: ${text}\n`);
  } catch {
    // stderr is closed.
  }
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

// Adds or removes one entry of current-step.json, and drops the entries of
// processes that are gone.
const updateCurrent = (id, entry) => {
  try {
    const file = currentStepFile();
    let current = {};
    try {
      current = readJson(file, {});
    } catch {
      // A broken file is replaced.
    }
    for (const [key, value] of Object.entries(current))
      if (!alive(value.pid)) delete current[key];
    if (entry) current[id] = entry;
    else delete current[id];
    writeAtomic(file, `${JSON.stringify(current, null, 2)}\n`);
  } catch {
    // The progress file is a help for a watcher only.
  }
};

const beginLine = (name, plan, params) =>
  `STEP start ${name} (expected ~${seconds(plan.expectedS)}, limit ${seconds(plan.limitS)}${paramText(params) ? `, ${paramText(params)}` : ''})`;

const registerCurrent = ({ script, step, pid, plan, startedAt }) => {
  const id = `${pid} ${script}/${step}`;
  updateCurrent(id, {
    script,
    step,
    startedAt: new Date(startedAt).toISOString(),
    expectedS: plan.expectedS,
    limitS: plan.limitS,
    pid,
    log: runLogFile() ?? stateLogFile(),
  });
  return id;
};

export class StepTimeoutError extends Error {
  constructor(name, limitS) {
    super(`step ${name} timed out after ${seconds(limitS)}`);
    this.name = 'StepTimeoutError';
  }
}

export const isStepTimeout = (error) => error instanceof StepTimeoutError;

// createSteps({ script, params, runDir }) returns:
//   start(step, { expectedS, limitS, params })  a handle with end(ok, reason),
//       signal (aborted at the limit) and elapsedS()
//   run(step, fn, options)  start + await fn(handle) + end; returns the result
//   onAbort(fn)  a handler that runs when a step passes its limit, before the
//       process exits with code 124 (for example: close the browsers)
//   failActive(reason)  ends every running step with STEP FAIL
export const createSteps = ({ script, params = {}, runDir } = {}) => {
  // Child processes (for example a driver) log to the same run folder.
  if (runDir) process.env.HARNESS_STEP_RUN_DIR = runDir;
  const active = new Set();
  const abortHandlers = [];
  let aborting = false;

  const abortRun = async () => {
    if (aborting) return;
    aborting = true;
    const grace = setTimeout(() => {
      emit(
        `STEP cleanup of ${script} did not end in ${seconds(cleanupGraceS())}: exit now`
      );
      process.exit(STEP_TIMEOUT_CODE);
    }, cleanupGraceS() * 1000);
    for (const handler of abortHandlers) {
      try {
        await handler();
      } catch (error) {
        warn(`abort handler failed: ${error?.message ?? error}`);
      }
    }
    clearTimeout(grace);
    process.exit(STEP_TIMEOUT_CODE);
  };

  const start = (step, options = {}) => {
    const stepParams = { ...params, ...options.params };
    const name = `${script}/${step}`;
    const plan = planStep({
      script,
      step,
      params: stepParams,
      expectedS: options.expectedS ?? 10,
      limitS: options.limitS ?? 300,
    });
    const startedAt = Date.now();
    const controller = new AbortController();
    emit(beginLine(name, plan, stepParams));
    const id = registerCurrent({
      script,
      step,
      pid: process.pid,
      plan,
      startedAt,
    });
    const elapsedS = () => (Date.now() - startedAt) / 1000;
    let ended = false;

    const finish = () => {
      ended = true;
      clearTimeout(limitTimer);
      clearInterval(slowTimer);
      active.delete(handle);
      updateCurrent(id);
    };

    const slowTimer = setInterval(() => {
      if (elapsedS() > plan.expectedS)
        emit(
          `STEP slow ${name} ${seconds(elapsedS())} (expected ~${seconds(plan.expectedS)}, limit ${seconds(plan.limitS)})`
        );
    }, slowEveryS() * 1000);
    slowTimer.unref();

    // Not unref'd: a step that waits on nothing else still fails at its
    // limit instead of a silent exit.
    const limitTimer = setTimeout(() => {
      if (ended) return;
      emit(
        `STEP FAIL ${name} timeout after ${seconds(plan.limitS)} (expected ~${seconds(plan.expectedS)})`
      );
      finish();
      controller.abort(new StepTimeoutError(name, plan.limitS));
      void abortRun();
    }, plan.limitS * 1000);

    const handle = {
      name,
      signal: controller.signal,
      elapsedS,
      // end(true) records the duration. end(false, reason) does not.
      end(ok = true, reason = 'check failed') {
        if (ended) return;
        const took = elapsedS();
        finish();
        if (ok) {
          emit(
            `STEP done ${name} ${seconds(took)} (expected ~${seconds(plan.expectedS)})`
          );
          recordRun(plan.key, took);
        } else {
          emit(
            `STEP FAIL ${name} ${reason} after ${seconds(took)} (expected ~${seconds(plan.expectedS)})`
          );
        }
      },
      // The reason of a failed step after process.exit: synchronous only.
      exited(code) {
        if (ended) return;
        const took = elapsedS();
        finish();
        emit(
          `STEP FAIL ${name} the process exited with code ${code} after ${seconds(took)} (expected ~${seconds(plan.expectedS)})`
        );
      },
    };
    active.add(handle);
    return handle;
  };

  const run = async (step, fn, options) => {
    const handle = start(step, options);
    try {
      const result = await fn(handle);
      handle.end(true);
      return result;
    } catch (error) {
      handle.end(
        false,
        String(error?.message ?? error)
          .split('\n')[0]
          .slice(0, 200)
      );
      throw error;
    }
  };

  const failActive = (reason) => {
    for (const handle of [...active].reverse()) handle.end(false, reason);
  };

  // A script that calls process.exit inside a step still gets its end line.
  process.on('exit', (code) => {
    for (const handle of [...active].reverse()) handle.exited(code);
  });

  return {
    start,
    run,
    failActive,
    onAbort: (handler) => abortHandlers.push(handler),
  };
};

// ---------------------------------------------------------------- command line
const cli = () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      script: { type: 'string' },
      step: { type: 'string' },
      expected: { type: 'string' },
      limit: { type: 'string' },
      start: { type: 'string' },
      pid: { type: 'string' },
      status: { type: 'string' },
      reason: { type: 'string' },
      param: { type: 'string', multiple: true },
    },
  });
  const command = positionals[0];
  const { script, step } = values;
  if (!script || !step) {
    console.error(
      'usage: node steps.mjs begin|slow|end --script S --step N ... (see the header of steps.mjs)'
    );
    process.exit(2);
  }
  const name = `${script}/${step}`;
  const params = Object.fromEntries(
    (values.param ?? []).map((pair) => {
      const at = pair.indexOf('=');
      return at > 0 ? [pair.slice(0, at), pair.slice(at + 1)] : [pair, 'true'];
    })
  );
  const pid = Number(values.pid ?? process.ppid);
  const expected = Number(values.expected);

  if (command === 'begin') {
    const plan = planStep({
      script,
      step,
      params,
      expectedS: expected,
      limitS: Number(values.limit),
    });
    const startedAt = Date.now();
    emit(beginLine(name, plan, params));
    registerCurrent({ script, step, pid, plan, startedAt });
    console.log(`${plan.expectedS} ${plan.limitS} ${startedAt}`);
  } else if (command === 'slow') {
    const took = (Date.now() - Number(values.start)) / 1000;
    emit(
      `STEP slow ${name} ${seconds(took)} (expected ~${seconds(expected)}, limit ${seconds(Number(values.limit))})`
    );
  } else if (command === 'end') {
    const took = (Date.now() - Number(values.start)) / 1000;
    updateCurrent(`${pid} ${name}`);
    if (values.status === 'done') {
      emit(
        `STEP done ${name} ${seconds(took)} (expected ~${seconds(expected)})`
      );
      recordRun(timingKey(script, step, params), took);
    } else if (values.status === 'timeout') {
      emit(
        `STEP FAIL ${name} timeout after ${seconds(took)} (expected ~${seconds(expected)})`
      );
    } else {
      emit(
        `STEP FAIL ${name} ${values.reason ?? 'failed'} after ${seconds(took)} (expected ~${seconds(expected)})`
      );
    }
  } else {
    console.error(`steps: unknown command '${command}'`);
    process.exit(2);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) cli();
