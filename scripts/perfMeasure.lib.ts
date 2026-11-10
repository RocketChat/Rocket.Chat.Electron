// Pure parts of `yarn perf:measure`: config parsing, round order, metric
// parsing and the report. The CLI in perf-measure.ts does the I/O.

import { isAbsolute, resolve } from 'path';

export type Condition = {
  name: string;
  /** A checkout with `app/` built and `node_modules` installed. `null` means no app runs (system baseline). */
  appDir: string | null;
  /** Written to the profile's `overridden-settings.json`. */
  overriddenSettings?: Record<string, unknown>;
  /** Written to the profile's `config.json`, the persisted user settings. */
  config?: Record<string, unknown>;
  /** Extra Electron command-line arguments. */
  args: string[];
  env: Record<string, string>;
  /** Main-process expression that runs once after the settle time. */
  setup?: string;
  /** Main-process expression that starts the workload when sampling starts. */
  workload?: string;
};

export type PerfConfig = {
  rounds: number;
  settleSeconds: number;
  sampleSeconds: number;
  window: { width: number; height: number };
  /** Name of the condition that the report compares against. */
  reference: string;
  conditions: Condition[];
};

export const BASELINE_NAME = 'no app (system baseline)';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const positiveInteger = (
  value: unknown,
  fallback: number,
  field: string
): number => {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(
      `${field} must be a positive integer, got ${JSON.stringify(value)}`
    );
  }
  return value;
};

/**
 * Validate a config object and fill the defaults. Relative `appDir` values
 * resolve against `baseDir`, the folder of the config file.
 */
export const parseConfig = (raw: unknown, baseDir: string): PerfConfig => {
  if (!isRecord(raw)) throw new Error('The config must be a JSON object.');
  if (!Array.isArray(raw.conditions) || raw.conditions.length === 0) {
    throw new Error('The config must have a non-empty "conditions" array.');
  }

  const names = new Set<string>();
  const conditions: Condition[] = raw.conditions.map((entry, index) => {
    const where = `conditions[${index}]`;
    if (!isRecord(entry)) throw new Error(`${where} must be an object.`);
    if (typeof entry.name !== 'string' || entry.name.trim() === '') {
      throw new Error(`${where}.name must be a non-empty string.`);
    }
    if (names.has(entry.name)) {
      throw new Error(`${where}.name "${entry.name}" is used twice.`);
    }
    names.add(entry.name);

    for (const key of ['overriddenSettings', 'config', 'env'] as const) {
      if (entry[key] !== undefined && !isRecord(entry[key])) {
        throw new Error(`${where}.${key} must be an object.`);
      }
    }
    for (const key of ['setup', 'workload'] as const) {
      if (entry[key] !== undefined && typeof entry[key] !== 'string') {
        throw new Error(
          `${where}.${key} must be a string (a main-process expression).`
        );
      }
    }
    if (
      entry.args !== undefined &&
      !(
        Array.isArray(entry.args) &&
        entry.args.every((a) => typeof a === 'string')
      )
    ) {
      throw new Error(`${where}.args must be an array of strings.`);
    }

    const appDir = typeof entry.appDir === 'string' ? entry.appDir : '.';
    return {
      name: entry.name,
      appDir: isAbsolute(appDir) ? appDir : resolve(baseDir, appDir),
      overriddenSettings: entry.overriddenSettings as
        | Record<string, unknown>
        | undefined,
      config: entry.config as Record<string, unknown> | undefined,
      args: (entry.args as string[] | undefined) ?? [],
      env: (entry.env as Record<string, string> | undefined) ?? {},
      setup: entry.setup as string | undefined,
      workload: entry.workload as string | undefined,
    };
  });

  if (raw.baseline !== false) {
    conditions.unshift({
      name: BASELINE_NAME,
      appDir: null,
      args: [],
      env: {},
    });
  }

  const reference =
    typeof raw.reference === 'string'
      ? raw.reference
      : conditions.find((c) => c.appDir !== null)!.name;
  if (!conditions.some((c) => c.name === reference)) {
    throw new Error(`reference "${reference}" is not the name of a condition.`);
  }

  const window = isRecord(raw.window) ? raw.window : {};
  return {
    rounds: positiveInteger(raw.rounds, 3, 'rounds'),
    settleSeconds: positiveInteger(raw.settleSeconds, 15, 'settleSeconds'),
    sampleSeconds: positiveInteger(raw.sampleSeconds, 30, 'sampleSeconds'),
    window: {
      width: positiveInteger(window.width, 1200, 'window.width'),
      height: positiveInteger(window.height, 800, 'window.height'),
    },
    reference,
    conditions,
  };
};

/**
 * The conditions in the order for one round (1-based). Each round starts one
 * condition later, so slow drift in machine load spreads over all of them.
 */
export const roundOrder = <T>(conditions: T[], round: number): T[] =>
  conditions.map(
    (_, index) => conditions[(index + round - 1) % conditions.length]
  );

/** `Device Utilization %` from `ioreg -r -d 1 -w 0 -c IOAccelerator` (macOS). */
export const parseIoregGpuUtilization = (output: string): number | null => {
  const match = output.match(/"Device Utilization %"\s*=\s*(\d+)/);
  return match ? Number(match[1]) : null;
};

/**
 * Seconds from the `TIME` column of `ps -o time=` (`[[dd-]hh:]mm:ss[.cc]`),
 * the cumulative CPU time of a process. `null` when it does not parse.
 */
export const parsePsCpuTime = (value: string): number | null => {
  const match = value
    .trim()
    .match(/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86400 +
    Number(hours ?? 0) * 3600 +
    Number(minutes) * 60 +
    Number(seconds)
  );
};

export type PowerSample = {
  cpuMilliwatts?: number;
  gpuMilliwatts?: number;
  combinedMilliwatts?: number;
  /** Share of time that the GPU was active, in percent. */
  gpuActiveResidencyPercent?: number;
};

/** One sample per `powermetrics` block, with `--samplers cpu_power,gpu_power`. */
export const parsePowermetrics = (output: string): PowerSample[] =>
  output
    .split(/\*\*\* Sampled system activity/)
    .slice(1)
    .map((block) => {
      const read = (label: string): number | undefined => {
        const match = block.match(
          new RegExp(`^${label}:\\s*([\\d.]+)\\s*mW`, 'm')
        );
        return match ? Number(match[1]) : undefined;
      };
      return {
        cpuMilliwatts: read('CPU Power'),
        gpuMilliwatts: read('GPU Power'),
        combinedMilliwatts: read('Combined Power \\(CPU \\+ GPU \\+ ANE\\)'),
        gpuActiveResidencyPercent: (() => {
          const match = block.match(/^GPU HW active residency:\s*([\d.]+)%/m);
          return match ? Number(match[1]) : undefined;
        })(),
      };
    });

export type ProcessSnapshot = {
  pid: number;
  type: string;
  name?: string;
  /** `cpu.cumulativeCPUUsage`, or `null` where Electron does not report it. */
  cumulativeCpuSeconds: number | null;
  /** `cpu.percentCPUUsage`: the average since the previous `getAppMetrics()` call. */
  percentCpu: number;
  idleWakeupsPerSecond: number;
  workingSetKilobytes: number;
};

export type ProcessTypeUsage = {
  /** Average CPU over the sample window, in percent of one core. */
  cpuPercent: number;
  /** From the second snapshot: wakeups per second since the first one. */
  idleWakeupsPerSecond: number;
  workingSetMegabytes: number;
  processes: number;
};

const processKey = (p: ProcessSnapshot): string =>
  p.type === 'Utility' && p.name ? `Utility: ${p.name}` : p.type;

/**
 * CPU per process type from two `getAppMetrics()` snapshots, from the
 * difference of `cpu.cumulativeCPUUsage`. A process that starts during the
 * window counts from zero. Without a cumulative value, it uses
 * `percentCPUUsage` of the second snapshot, which is the average since the
 * first one unless other code called `getAppMetrics()` in between.
 */
export const usageBetween = (
  start: ProcessSnapshot[],
  end: ProcessSnapshot[],
  seconds: number
): Record<string, ProcessTypeUsage> => {
  const startByPid = new Map(start.map((p) => [p.pid, p]));
  const usage: Record<string, ProcessTypeUsage> = {};
  for (const p of end) {
    const key = processKey(p);
    const before = startByPid.get(p.pid)?.cumulativeCpuSeconds ?? 0;
    const cpuPercent =
      p.cumulativeCpuSeconds === null
        ? p.percentCpu
        : ((p.cumulativeCpuSeconds - before) / seconds) * 100;
    const entry = (usage[key] ??= {
      cpuPercent: 0,
      idleWakeupsPerSecond: 0,
      workingSetMegabytes: 0,
      processes: 0,
    });
    entry.cpuPercent += cpuPercent;
    entry.idleWakeupsPerSecond += p.idleWakeupsPerSecond;
    entry.workingSetMegabytes += p.workingSetKilobytes / 1024;
    entry.processes += 1;
  }
  return usage;
};

export const totalUsage = (
  usage: Record<string, ProcessTypeUsage>
): ProcessTypeUsage =>
  Object.values(usage).reduce(
    (sum, u) => ({
      cpuPercent: sum.cpuPercent + u.cpuPercent,
      idleWakeupsPerSecond: sum.idleWakeupsPerSecond + u.idleWakeupsPerSecond,
      workingSetMegabytes: sum.workingSetMegabytes + u.workingSetMegabytes,
      processes: sum.processes + u.processes,
    }),
    {
      cpuPercent: 0,
      idleWakeupsPerSecond: 0,
      workingSetMegabytes: 0,
      processes: 0,
    }
  );

/** One condition in one round: every metric is a number, or absent when unavailable. */
export type RoundResult = {
  condition: string;
  round: number;
  metrics: Record<string, number>;
  /** Machine load (1-minute average) during the window, for context. */
  loadAverage: number;
};

export const mean = (values: number[]): number =>
  values.reduce((a, b) => a + b, 0) / values.length;

export const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export type MetricSummary = {
  median: number;
  min: number;
  max: number;
  rounds: number;
};

export type Summary = {
  conditions: string[];
  metrics: string[];
  values: Record<string, Record<string, MetricSummary>>;
  loadAverage: Record<string, number>;
};

/** Median, min and max of the per-round values, for each condition and metric. */
export const summarize = (
  results: RoundResult[],
  conditionOrder: string[]
): Summary => {
  const metrics = [...new Set(results.flatMap((r) => Object.keys(r.metrics)))];
  const values: Summary['values'] = {};
  const loadAverage: Summary['loadAverage'] = {};
  for (const condition of conditionOrder) {
    const rows = results.filter((r) => r.condition === condition);
    values[condition] = {};
    loadAverage[condition] = rows.length
      ? mean(rows.map((r) => r.loadAverage))
      : NaN;
    for (const metric of metrics) {
      const series = rows
        .map((r) => r.metrics[metric])
        .filter(
          (v): v is number => typeof v === 'number' && Number.isFinite(v)
        );
      if (series.length) {
        values[condition][metric] = {
          median: median(series),
          min: Math.min(...series),
          max: Math.max(...series),
          rounds: series.length,
        };
      }
    }
  }
  return { conditions: conditionOrder, metrics, values, loadAverage };
};

const formatNumber = (value: number): string =>
  Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);

/** `+12%` against the reference, or an empty string when it cannot be computed. */
export const formatDelta = (
  value: number,
  reference: number | undefined
): string => {
  if (reference === undefined || reference === 0) return '';
  const percent = ((value - reference) / reference) * 100;
  return ` (${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%)`;
};

/**
 * A Markdown report: one row per metric, one column per condition, with
 * "median [min–max]" and the change against the reference condition.
 */
export const formatReport = (
  summary: Summary,
  reference: string,
  meta: Record<string, string>
): string => {
  const lines: string[] = ['# Performance measurement', ''];
  for (const [key, value] of Object.entries(meta))
    lines.push(`- ${key}: ${value}`);
  lines.push(`- Reference for the change in %: ${reference}`, '');
  lines.push(`| Metric | ${summary.conditions.join(' | ')} |`);
  lines.push(`| --- | ${summary.conditions.map(() => '---').join(' | ')} |`);
  for (const metric of summary.metrics) {
    const ref = summary.values[reference]?.[metric]?.median;
    const cells = summary.conditions.map((condition) => {
      const s = summary.values[condition][metric];
      if (!s) return '–';
      const delta = condition === reference ? '' : formatDelta(s.median, ref);
      return `${formatNumber(s.median)} [${formatNumber(s.min)}–${formatNumber(s.max)}]${delta}`;
    });
    lines.push(`| ${metric} | ${cells.join(' | ')} |`);
  }
  lines.push(
    `| load average (1 min) | ${summary.conditions
      .map((c) => formatNumber(summary.loadAverage[c]))
      .join(' | ')} |`,
    '',
    'Each cell is the median of the per-round values, with the lowest and highest round in brackets.',
    'GPU utilization, WindowServer CPU and power are system-wide. The no-app baseline shows what the rest of the machine adds.'
  );
  return lines.join('\n');
};

/** Read `--name value` from argv. */
export const readFlag = (argv: string[], name: string): string | undefined => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};
