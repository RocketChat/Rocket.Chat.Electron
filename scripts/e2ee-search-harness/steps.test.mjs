// Self-test of the step helper (steps.mjs and the `step` function of
// common.sh). It uses a temporary state folder and a temporary timings file,
// so it never changes step-timings.json.
//
//   node --test scripts/e2ee-search-harness/steps.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const harnessDir = dirname(fileURLToPath(import.meta.url));
const stepsModule = join(harnessDir, 'steps.mjs');

const sandbox = () => {
  const dir = mkdtempSync(join(tmpdir(), 'harness-steps-'));
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
  return {
    dir,
    env: {
      ...process.env,
      HARNESS_STATE_DIR: dir,
      HARNESS_STEP_TIMINGS: join(dir, 'step-timings.json'),
      HARNESS_STEP_PLATFORM: 'testos',
      HARNESS_STEP_RUN_DIR: '',
    },
  };
};

const runNode = (env, code) =>
  spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    env,
    encoding: 'utf8',
  });

const timings = (env) =>
  JSON.parse(readFileSync(env.HARNESS_STEP_TIMINGS, 'utf8'));

test('a finished step records its time, and the median is the next expected time', () => {
  const { env } = sandbox();
  writeFileSync(
    env.HARNESS_STEP_TIMINGS,
    `{\n  "self/quick testos": {"expectedS":9,"runs":[1,2,3,10,20]}\n}\n`
  );
  const result = runNode(
    env,
    `
    import { readFileSync } from 'node:fs';
    import { createSteps, currentStepFile } from ${JSON.stringify(stepsModule)};
    const steps = createSteps({ script: 'self' });
    await steps.run('quick', async () => {
      const current = JSON.parse(readFileSync(currentStepFile(), 'utf8'));
      const entry = Object.values(current).find((e) => e.step === 'quick');
      console.log('CURRENT', entry.script, entry.step, entry.expectedS, entry.limitS, entry.pid === process.pid);
      await new Promise((r) => setTimeout(r, 300));
    }, { expectedS: 99, limitS: 5 });
    console.log('AFTER', readFileSync(currentStepFile(), 'utf8').includes('quick'));
    `
  );
  assert.equal(result.status, 0, result.stderr);
  // Median of 1, 2, 3, 10, 20 is 3; the limit is max(5, 4 x 3) = 12.
  assert.match(result.stdout, /CURRENT self quick 3 12 true/);
  assert.match(result.stdout, /AFTER false/);
  assert.match(
    result.stderr,
    /STEP start self\/quick \(expected ~3s, limit 12s\)/
  );
  assert.match(
    result.stderr,
    /STEP done self\/quick 0\.[34]s \(expected ~3s\)/
  );
  const entry = timings(env)['self/quick testos'];
  assert.equal(entry.runs.length, 6);
  assert.ok(entry.runs[5] >= 0.3 && entry.runs[5] < 1);
  // The new median of 0.3, 1, 2, 3, 10, 20 is 2.5.
  assert.equal(entry.expectedS, 2.5);
  // One entry per line.
  assert.match(
    readFileSync(env.HARNESS_STEP_TIMINGS, 'utf8'),
    /^\{\n {2}"self\/quick testos": \{"expectedS":2\.5,"runs":\[.*\]\}\n\}\n$/
  );
});

test('the history keeps the last 10 runs, keyed by platform and parameters', () => {
  const { env } = sandbox();
  for (let i = 0; i < 12; i++) {
    const result = runNode(
      env,
      `
      import { createSteps } from ${JSON.stringify(stepsModule)};
      const steps = createSteps({ script: 'self', params: { pause: 1 } });
      await steps.run('keyed', async () => {}, { expectedS: 1, limitS: 5 });
      `
    );
    assert.equal(result.status, 0, result.stderr);
  }
  const entry = timings(env)['self/keyed testos pause=1'];
  assert.equal(entry.runs.length, 10);
});

test('a step past its limit fails with the timeout line, runs the abort handlers and exits 124', () => {
  const { dir, env } = sandbox();
  const cleanupFile = join(dir, 'cleanup-ran');
  const result = runNode(
    {
      ...env,
      HARNESS_STEP_LIMIT_SCALE: '0.1',
      HARNESS_STEP_SLOW_EVERY_S: '0.2',
    },
    `
    import { writeFileSync } from 'node:fs';
    import { createSteps } from ${JSON.stringify(stepsModule)};
    const steps = createSteps({ script: 'self' });
    steps.onAbort(async () => writeFileSync(${JSON.stringify(cleanupFile)}, 'yes'));
    await steps.run('outer', async () => {
      await steps.run('hang', () => new Promise(() => setInterval(() => {}, 1000)), {
        expectedS: 0.1,
        limitS: 10,
      });
    }, { expectedS: 1, limitS: 600 });
    console.log('NOT REACHED');
    `
  );
  assert.equal(result.status, 124, result.stderr);
  assert.doesNotMatch(result.stdout, /NOT REACHED/);
  // HARNESS_STEP_LIMIT_SCALE=0.1 makes the limit of 10 s 1 s.
  assert.match(
    result.stderr,
    /STEP start self\/hang \(expected ~0\.1s, limit 1s\)/
  );
  assert.match(
    result.stderr,
    /STEP slow self\/hang 0\.\ds \(expected ~0\.1s, limit 1s\)/
  );
  assert.match(
    result.stderr,
    /STEP FAIL self\/hang timeout after 1s \(expected ~0\.1s\)/
  );
  assert.match(
    result.stderr,
    /STEP FAIL self\/outer the process exited with code 124/
  );
  assert.equal(readFileSync(cleanupFile, 'utf8'), 'yes');
  // A failed step records no time.
  assert.equal(existsSync(env.HARNESS_STEP_TIMINGS), false);
  // The state log has the same lines.
  const log = readFileSync(join(dir, 'steps.log'), 'utf8');
  assert.match(log, /STEP FAIL self\/hang timeout after 1s/);
  // The progress file has no step of the dead process.
  assert.doesNotMatch(
    readFileSync(join(dir, 'current-step.json'), 'utf8'),
    /hang/
  );
});

test('a script that exits inside a step gets a FAIL line', () => {
  const { env } = sandbox();
  const result = runNode(
    env,
    `
    import { createSteps } from ${JSON.stringify(stepsModule)};
    const steps = createSteps({ script: 'self' });
    await steps.run('exits', async () => process.exit(3), { expectedS: 1, limitS: 5 });
    `
  );
  assert.equal(result.status, 3);
  assert.match(
    result.stderr,
    /STEP FAIL self\/exits the process exited with code 3/
  );
});

test('the shell step logs, records, warns when slow, and stops a stuck step', () => {
  const { dir, env } = sandbox();
  const script = `
    set -uo pipefail
    STEP_SCRIPT=shell
    source ${JSON.stringify(join(harnessDir, 'common.sh'))}
    on_step_timeout() { echo cleanup >"${dir}/shell-cleanup"; }
    sleep 300 >/dev/null 2>&1 &
    protected_pid=$!
    echo "$protected_pid" >"${dir}/protected.pid"
    out="$(step capture 1 10 echo captured)"
    echo "OUT $out"
    STEP_PARAMS="pause=1" step quick 1 10 sleep 0.2
    step fails 1 10 false
    echo "FAILS rc=$?"
    step stuck 0.1 3 sleep 300
    echo "NOT REACHED"
  `;
  const result = spawnSync('bash', ['-c', script], {
    env: { ...env, HARNESS_STEP_SLOW_EVERY_S: '1' },
    encoding: 'utf8',
    timeout: 60_000,
  });
  const protectedPid = Number(readFileSync(join(dir, 'protected.pid'), 'utf8'));
  const protectedAlive = (() => {
    try {
      process.kill(protectedPid, 0);
      return true;
    } catch {
      return false;
    }
  })();
  try {
    process.kill(protectedPid, 'SIGKILL');
  } catch {
    // Gone.
  }
  assert.equal(result.status, 124, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /OUT captured\n/);
  assert.match(result.stdout, /FAILS rc=1/);
  assert.doesNotMatch(result.stdout, /NOT REACHED/);
  assert.match(result.stderr, /STEP done shell\/capture /);
  assert.match(
    result.stderr,
    /STEP start shell\/quick \(expected ~1s, limit 10s, pause=1\)/
  );
  assert.match(result.stderr, /STEP done shell\/quick 0\.\ds \(expected ~1s\)/);
  assert.match(result.stderr, /STEP FAIL shell\/fails exit code 1 after/);
  assert.match(
    result.stderr,
    /STEP slow shell\/stuck [12]\.?\d*s \(expected ~0\.1s, limit 3s\)/
  );
  assert.match(
    result.stderr,
    /STEP FAIL shell\/stuck timeout after 3\.\ds \(expected ~0\.1s\)/
  );
  assert.equal(readFileSync(join(dir, 'shell-cleanup'), 'utf8'), 'cleanup\n');
  // The watchdog stops the stuck command, and only that one.
  assert.equal(protectedAlive, true);
  const runs = timings(env);
  assert.equal(runs['shell/quick testos pause=1'].runs.length, 1);
  assert.equal(runs['shell/fails testos'], undefined);
  assert.equal(runs['shell/stuck testos'], undefined);
});

const bashTimeout = (body) => {
  const { dir, env } = sandbox();
  const script = `
    set -uo pipefail
    STEP_SCRIPT=shell
    source ${JSON.stringify(join(harnessDir, 'common.sh'))}
    on_step_timeout() { echo cleanup >"${dir}/shell-cleanup"; }
    ${body}
    echo "NOT REACHED"
  `;
  const started = Date.now();
  const result = spawnSync('bash', ['-c', script], {
    env,
    encoding: 'utf8',
    timeout: 60_000,
  });
  return { dir, result, seconds: (Date.now() - started) / 1000 };
};

test('a stuck step in a command substitution stops the script', () => {
  const { dir, result, seconds } = bashTimeout(
    'out="$(step stuck-capture 0.1 2 sleep 300)"'
  );
  assert.equal(result.status, 124, `${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(result.stdout, /NOT REACHED/);
  assert.match(result.stderr, /STEP FAIL shell\/stuck-capture timeout after/);
  assert.equal(readFileSync(join(dir, 'shell-cleanup'), 'utf8'), 'cleanup\n');
  assert.ok(seconds < 15, `took ${seconds}s`);
});

test('a stuck shell loop in a step stops the script', () => {
  const { dir, result, seconds } = bashTimeout(
    'spin() { while :; do sleep 0.5; done; }\n    step stuck-loop 0.1 2 spin'
  );
  assert.equal(result.status, 124, `${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(result.stdout, /NOT REACHED/);
  assert.match(result.stderr, /STEP FAIL shell\/stuck-loop timeout after/);
  assert.equal(readFileSync(join(dir, 'shell-cleanup'), 'utf8'), 'cleanup\n');
  assert.ok(seconds < 15, `took ${seconds}s`);
});
