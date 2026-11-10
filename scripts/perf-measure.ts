// yarn perf:measure --config <file.json> [--out <dir>] [--rounds N] [--power]
//
// Runs built app checkouts under the same conditions and compares CPU, idle
// wakeups, memory, GPU utilization and (optional) power. Read
// docs/performance-measurement.md before you use it.

import type { ChildProcess } from 'child_process';
import { execFileSync, spawn } from 'child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { loadavg, tmpdir } from 'os';
import { dirname, join, resolve } from 'path';

import type {
  Condition,
  PerfConfig,
  PowerSample,
  ProcessSnapshot,
  RoundResult,
} from './perfMeasure.lib';
import {
  formatReport,
  mean,
  parseConfig,
  parseIoregGpuUtilization,
  parsePsCpuTime,
  parsePowermetrics,
  readFlag,
  roundOrder,
  summarize,
  totalUsage,
  usageBetween,
} from './perfMeasure.lib';

const FIRST_INSPECTOR_PORT = 9400;
const REQ = 'process.mainModule.require';
const ROOT_WINDOW = `${REQ}('electron').BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.getURL().includes('/app/index.html'))`;
const SNAPSHOT = `JSON.stringify(${REQ}('electron').app.getAppMetrics().map((m) => ({
  pid: m.pid, type: m.type, name: m.name,
  cumulativeCpuSeconds: m.cpu.cumulativeCPUUsage ?? null,
  percentCpu: m.cpu.percentCPUUsage,
  idleWakeupsPerSecond: m.cpu.idleWakeupsPerSecond,
  workingSetKilobytes: m.memory.workingSetSize,
})))`;

// The renderer reports `hidden` when macOS reports the window as occluded.
const PAGE_VISIBLE = `${ROOT_WINDOW}.webContents.executeJavaScript("document.visibilityState === 'visible'")`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const usage = `Usage: yarn perf:measure --config <file.json> [--out <dir>] [--rounds N] [--power]

  --config  JSON file with the conditions (see docs/performance-measurement.md)
  --out     folder for results.json and report.md (default: a new temp folder)
  --rounds  overrides "rounds" in the config
  --power   also record CPU and GPU power with powermetrics (macOS, needs
            passwordless sudo for /usr/bin/powermetrics)`;

type Inspector = {
  evaluate: (expression: string) => Promise<unknown>;
  close: () => void;
};

const connectInspector = async (port: number): Promise<Inspector> => {
  let url: string | undefined;
  for (let attempt = 0; attempt < 120 && !url; attempt++) {
    try {
      const targets = (await (
        await fetch(`http://127.0.0.1:${port}/json`)
      ).json()) as {
        webSocketDebuggerUrl: string;
      }[];
      url = targets[0]?.webSocketDebuggerUrl;
    } catch {
      await sleep(500);
    }
  }
  if (!url)
    throw new Error(`The app inspector on port ${port} did not start in 60 s.`);

  const socket = new WebSocket(url);
  await new Promise<void>((ok, fail) => {
    socket.addEventListener('open', () => ok(), { once: true });
    socket.addEventListener(
      'error',
      () => fail(new Error(`Could not connect to ${url}`)),
      { once: true }
    );
  });
  let nextId = 0;
  const pending = new Map<number, (message: any) => void>();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as { id?: unknown };
    // Only replies to our own calls carry a numeric id. CDP events have none.
    if (typeof message.id !== 'number') return;
    const resolveCall = pending.get(message.id);
    if (typeof resolveCall !== 'function') return;
    pending.delete(message.id);
    resolveCall(message);
  });

  const evaluate = (expression: string) =>
    new Promise<unknown>((ok, fail) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        fail(new Error(`Inspector call timed out: ${expression.slice(0, 80)}`));
      }, 15000);
      pending.set(id, (message) => {
        clearTimeout(timer);
        const details = message.result?.exceptionDetails;
        if (details) {
          fail(
            new Error(
              `Expression failed: ${details.exception?.description ?? details.text}`
            )
          );
          return;
        }
        ok(message.result?.result?.value);
      });
      socket.send(
        JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true },
        })
      );
    });

  return { evaluate, close: () => socket.close() };
};

const readGpuUtilization = (): number | null => {
  if (process.platform !== 'darwin') return null;
  try {
    return parseIoregGpuUtilization(
      execFileSync('ioreg', [
        '-r',
        '-d',
        '1',
        '-w',
        '0',
        '-c',
        'IOAccelerator',
      ]).toString()
    );
  } catch {
    return null;
  }
};

/**
 * Cumulative CPU seconds of the macOS compositor. Window effects such as
 * vibrancy cost CPU and GPU in WindowServer, not in the app's own processes.
 */
const readWindowServerCpuSeconds = (): number | null => {
  if (process.platform !== 'darwin') return null;
  try {
    const pid = execFileSync('pgrep', ['-x', 'WindowServer'])
      .toString()
      .trim()
      .split('\n')[0];
    return parsePsCpuTime(
      execFileSync('ps', ['-o', 'time=', '-p', pid]).toString()
    );
  } catch {
    return null;
  }
};

/**
 * Other things that change system-wide GPU and WindowServer numbers: another
 * Electron app (a second Rocket.Chat window adds the same window cost) and a
 * busy Spotlight indexer, which new worktrees start. Returns one line each.
 */
const findNoiseSources = (): string[] => {
  if (process.platform !== 'darwin') return [];
  const lines: string[] = [];
  try {
    const ps = execFileSync('ps', ['-Ao', 'pid=,pcpu=,command='])
      .toString()
      .split('\n');
    const electrons = ps.filter(
      (l) =>
        /\/Electron(\.app\/Contents\/MacOS\/Electron)?( |$)/.test(l) &&
        !/Helper/.test(l)
    );
    for (const line of electrons)
      lines.push(
        `another Electron app is running: ${line.trim().slice(0, 140)}`
      );
    const spotlight = ps
      .filter((l) => /\/(mds|mds_stores|mdworker_shared)( |$)/.test(l))
      .reduce((sum, l) => sum + Number(l.trim().split(/\s+/)[1] || 0), 0);
    if (spotlight > 20)
      lines.push(`Spotlight indexing uses ${spotlight.toFixed(0)}% CPU`);
  } catch {
    // ps is missing or failed: no warning
  }
  return lines;
};

const startPowermetrics = (seconds: number) => {
  const child = spawn(
    'sudo',
    [
      '-n',
      '/usr/bin/powermetrics',
      '--samplers',
      'cpu_power,gpu_power',
      '-i',
      '1000',
      '-n',
      String(seconds),
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  return new Promise<PowerSample[]>((ok) =>
    child.once('exit', () => ok(parsePowermetrics(output)))
  );
};

const checkPowermetrics = (): void => {
  if (process.platform !== 'darwin') {
    throw new Error('--power works only on macOS.');
  }
  try {
    execFileSync(
      'sudo',
      [
        '-n',
        '/usr/bin/powermetrics',
        '-n',
        '1',
        '-i',
        '100',
        '--samplers',
        'gpu_power',
      ],
      {
        stdio: 'ignore',
      }
    );
  } catch {
    throw new Error(
      '--power needs passwordless sudo for /usr/bin/powermetrics. Add this line with `sudo visudo -f /etc/sudoers.d/powermetrics`:\n' +
        `  ${process.env.USER ?? '<user>'} ALL=(root) NOPASSWD: /usr/bin/powermetrics`
    );
  }
};

const writeProfile = (profile: string, condition: Condition): void => {
  mkdirSync(profile, { recursive: true });
  if (condition.overriddenSettings) {
    writeFileSync(
      join(profile, 'overridden-settings.json'),
      JSON.stringify(condition.overriddenSettings)
    );
  }
  if (condition.config) {
    writeFileSync(
      join(profile, 'config.json'),
      JSON.stringify(condition.config)
    );
  }
};

const launchApp = (
  condition: Condition,
  profile: string,
  port: number
): ChildProcess => {
  const electron = join(
    condition.appDir!,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron.cmd' : 'electron'
  );
  if (!existsSync(electron))
    throw new Error(
      `No Electron in ${condition.appDir}. Run yarn install there.`
    );
  if (!existsSync(join(condition.appDir!, 'app', 'main.js'))) {
    throw new Error(
      `No build in ${condition.appDir}. Run NODE_ENV=production yarn build there.`
    );
  }
  return spawn(
    electron,
    [`--inspect=${port}`, `--user-data-dir=${profile}`, ...condition.args, '.'],
    {
      cwd: condition.appDir!,
      env: { ...process.env, ...condition.env },
      stdio: 'ignore',
    }
  );
};

const stopApp = async (
  child: ChildProcess,
  inspector: Inspector
): Promise<void> => {
  const exited = new Promise((ok) => child.once('exit', ok));
  await inspector
    .evaluate(`${REQ}('electron').app.quit()`)
    .catch(() => undefined);
  inspector.close();
  await Promise.race([exited, sleep(10000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
};

const measure = async (
  config: PerfConfig,
  condition: Condition,
  round: number,
  port: number,
  scratch: string,
  withPower: boolean
): Promise<RoundResult> => {
  let child: ChildProcess | undefined;
  let inspector: Inspector | undefined;
  let start: ProcessSnapshot[] = [];

  if (condition.appDir) {
    const profile = join(scratch, `profile-r${round}-${port}`);
    writeProfile(profile, condition);
    child = launchApp(condition, profile, port);
    inspector = await connectInspector(port);
    await sleep(config.settleSeconds * 1000);
    // macOS does not composite a covered window, so a covered window hides
    // the cost of window effects. Keep it on top for the whole sample, and
    // record below whether the page really was visible.
    await inspector.evaluate(`(() => { const { app } = ${REQ}('electron'); const w = ${ROOT_WINDOW};
      if (!w) throw new Error('no root window');
      w.setBounds({ x: 80, y: 80, width: ${config.window.width}, height: ${config.window.height} });
      w.setAlwaysOnTop(true, 'floating'); w.show(); w.focus();
      if (process.platform === 'darwin') app.focus({ steal: true });
      return true; })()`);
    if (condition.setup) await inspector.evaluate(condition.setup);
    await sleep(3000);
    if (condition.workload) await inspector.evaluate(condition.workload);
    start = JSON.parse(String(await inspector.evaluate(SNAPSHOT)));
  } else {
    await sleep(3000);
  }

  const power = withPower
    ? startPowermetrics(config.sampleSeconds)
    : Promise.resolve([]);
  const startedAt = Date.now();
  const windowServerStart = readWindowServerCpuSeconds();
  const gpu: number[] = [];
  const load: number[] = [];
  const visible: boolean[] = [];
  for (let second = 0; second < config.sampleSeconds; second++) {
    const value = readGpuUtilization();
    if (value !== null) gpu.push(value);
    load.push(loadavg()[0]);
    if (inspector && second % 5 === 0) {
      visible.push(
        (await inspector.evaluate(PAGE_VISIBLE).catch(() => false)) === true
      );
    }
    await sleep(1000);
  }

  const metrics: Record<string, number> = {};
  if (gpu.length) metrics['GPU utilization % (system)'] = mean(gpu);
  const windowServerEnd = readWindowServerCpuSeconds();
  if (windowServerStart !== null && windowServerEnd !== null) {
    metrics['WindowServer CPU % (system)'] =
      ((windowServerEnd - windowServerStart) /
        ((Date.now() - startedAt) / 1000)) *
      100;
  }
  const powerSamples = await power;
  for (const [key, label] of [
    ['gpuMilliwatts', 'GPU power mW (system)'],
    ['cpuMilliwatts', 'CPU power mW (system)'],
    ['combinedMilliwatts', 'CPU+GPU+ANE power mW (system)'],
    ['gpuActiveResidencyPercent', 'GPU active residency % (system)'],
  ] as const) {
    const series = powerSamples
      .map((s) => s[key])
      .filter((v): v is number => v !== undefined);
    if (series.length) metrics[label] = mean(series);
  }

  if (inspector && child) {
    const end: ProcessSnapshot[] = JSON.parse(
      String(await inspector.evaluate(SNAPSHOT))
    );
    const byType = usageBetween(start, end, (Date.now() - startedAt) / 1000);
    const total = totalUsage(byType);
    metrics['window visible % of checks'] =
      (visible.filter(Boolean).length / visible.length) * 100;
    metrics['app CPU % (all processes)'] = total.cpuPercent;
    metrics['app idle wakeups/s'] = total.idleWakeupsPerSecond;
    metrics['app memory MB (working set)'] = total.workingSetMegabytes;
    for (const [type, value] of Object.entries(byType)) {
      metrics[`CPU % ${type}`] = value.cpuPercent;
    }
    await stopApp(child, inspector);
  }

  return { condition: condition.name, round, metrics, loadAverage: mean(load) };
};

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const configPath = readFlag(argv, '--config');
  if (!configPath || argv.includes('--help')) {
    console.log(usage);
    process.exitCode = configPath ? 0 : 2;
    return;
  }

  const absoluteConfig = resolve(configPath);
  const config = parseConfig(
    JSON.parse(readFileSync(absoluteConfig, 'utf8')),
    dirname(absoluteConfig)
  );
  const rounds = readFlag(argv, '--rounds');
  if (rounds !== undefined) {
    const value = Number(rounds);
    if (!Number.isInteger(value) || value < 1)
      throw new Error(`--rounds must be a positive integer, got ${rounds}`);
    config.rounds = value;
  }
  const withPower = argv.includes('--power');
  if (withPower) checkPowermetrics();

  const out = resolve(
    readFlag(argv, '--out') ?? mkdtempSync(join(tmpdir(), 'rc-perf-'))
  );
  mkdirSync(out, { recursive: true });
  const scratch = mkdtempSync(join(tmpdir(), 'rc-perf-profiles-'));

  const noise = findNoiseSources();
  if (noise.length) {
    console.warn(
      `WARNING: these add to the system-wide GPU and WindowServer numbers:\n  - ${noise.join('\n  - ')}\n` +
        'Close them for a clean comparison, or keep them and compare only conditions from this run.\n'
    );
  }

  const results: RoundResult[] = [];
  let port = FIRST_INSPECTOR_PORT;
  const total = config.rounds * config.conditions.length;
  try {
    for (let round = 1; round <= config.rounds; round++) {
      for (const condition of roundOrder(config.conditions, round)) {
        console.log(
          `[${results.length + 1}/${total}] round ${round}: ${condition.name}`
        );
        const result = await measure(
          config,
          condition,
          round,
          port++,
          scratch,
          withPower
        );
        results.push(result);
        writeFileSync(
          join(out, 'results.json'),
          JSON.stringify({ config, results }, null, 2)
        );
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  const summary = summarize(
    results,
    config.conditions.map((c) => c.name)
  );
  const report = formatReport(summary, config.reference, {
    ...(noise.length ? { 'Noise at start': noise.join('; ') } : {}),
    'Date': new Date().toISOString(),
    'Machine': `${process.platform} ${process.arch}`,
    'Rounds': String(config.rounds),
    'Sample window': `${config.sampleSeconds} s after ${config.settleSeconds} s settle`,
    'Window': `${config.window.width}x${config.window.height}`,
  });
  const covered = results.filter(
    (r) =>
      r.metrics['window visible % of checks'] !== undefined &&
      r.metrics['window visible % of checks'] < 100
  );
  if (covered.length) {
    console.warn(
      `\nWARNING: the window was not visible for the whole sample in ${covered.length} run(s): ` +
        covered.map((r) => `${r.condition} (round ${r.round})`).join(', ') +
        '. Their window-effect numbers are too low. Do not use the machine during a run, and run again.'
    );
  }
  writeFileSync(join(out, 'report.md'), report);
  console.log(`\n${report}\n\nResults: ${out}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
