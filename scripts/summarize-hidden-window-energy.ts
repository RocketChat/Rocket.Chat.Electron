import assert from 'node:assert/strict';
import fs from 'node:fs';

export type GpuPowerSample = {
  endedAt: string;
  elapsedMs: number;
  powerMilliwatts: number;
  activeResidencyPercent: number;
};

export const parseGpuPowerSamples = (text: string): GpuPowerSample[] =>
  text
    .split('*** Sampled system activity ')
    .slice(1)
    .map((block) => {
      const interval = block.match(/^\((.*?)\) \(([\d.]+)ms elapsed\)/);
      const power = block.match(/^GPU Power:\s*([\d.]+) mW\s*$/m);
      const active = block.match(/^GPU HW active residency:\s*([\d.]+)%/m);
      assert(interval && power && active, 'Incomplete GPU power sample');
      const endedAt = new Date(interval[1]);
      assert(
        Number.isFinite(endedAt.getTime()),
        'Invalid GPU sample timestamp'
      );
      const elapsedMs = Number(interval[2]);
      assert(elapsedMs > 0, 'GPU sample has no elapsed time');
      assert(
        Number.isFinite(Number(power[1])) && Number(power[1]) >= 0,
        'Invalid GPU power'
      );
      assert(
        Number.isFinite(Number(active[1])) &&
          Number(active[1]) >= 0 &&
          Number(active[1]) <= 100,
        'Invalid GPU residency'
      );
      return {
        endedAt: endedAt.toISOString(),
        elapsedMs,
        powerMilliwatts: Number(power[1]),
        activeResidencyPercent: Number(active[1]),
      };
    });

export const summarizeGpuSamples = (samples: GpuPowerSample[]) => {
  assert(samples.length > 0, 'No GPU samples in the measurement interval');
  const elapsedMs = samples.reduce((sum, sample) => sum + sample.elapsedMs, 0);
  const powerMilliwatts =
    samples.reduce(
      (sum, sample) => sum + sample.powerMilliwatts * sample.elapsedMs,
      0
    ) / elapsedMs;
  const activeResidencyPercent =
    samples.reduce(
      (sum, sample) => sum + sample.activeResidencyPercent * sample.elapsedMs,
      0
    ) / elapsedMs;
  return {
    sampleCount: samples.length,
    elapsedMs,
    powerMilliwatts,
    activeResidencyPercent,
    estimatedEnergyJoules: (powerMilliwatts * elapsedMs) / 1_000_000,
    estimatedEnergyJoulesPer60Seconds: (powerMilliwatts * 60) / 1000,
  };
};

export const selectPhaseSamples = (
  samples: GpuPowerSample[],
  startedAt: string,
  endedAt: string
): GpuPowerSample[] => {
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  assert(Number.isFinite(start) && Number.isFinite(end) && end > start);
  // powermetrics text timestamps have one-second precision. Drop boundary
  // intervals so rounding cannot mix captures or policy changes into a phase.
  return samples.filter((sample) => {
    const sampleEnd = Date.parse(sample.endedAt);
    return (
      sampleEnd - sample.elapsedMs >= start + 1000 && sampleEnd <= end - 1000
    );
  });
};

export const parseWindowServerSamples = (text: string, utcOffset: string) => {
  assert(/^[+-]\d{4}$/.test(utcOffset), 'Missing capture timezone');
  return text
    .split(/(?=^Processes:)/m)
    .filter((block) => block.startsWith('Processes:'))
    .slice(1)
    .map((block) => {
      const timestamp = block.match(
        /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/m
      );
      const cpu = block.match(/^\s*\d+\s+WindowServer\s+([\d.]+)/m);
      assert(timestamp && cpu, 'Incomplete WindowServer CPU sample');
      const time = new Date(
        `${timestamp[1].replaceAll('/', '-')} ${utcOffset}`
      );
      assert(Number.isFinite(time.getTime()), 'Invalid WindowServer timestamp');
      return { time: time.toISOString(), cpuPercent: Number(cpu[1]) };
    });
};

type Run = {
  context: {
    expected: string;
    animated: boolean;
    versions: unknown;
    os: string;
    cpu: string;
    logicalCpus: number;
  };
  phases: {
    state: string;
    startedAt: string;
    endedAt: string;
    samples: unknown[];
  }[];
};

const main = (): void => {
  const [powerPath, topPath, outputPath, ...runPaths] = process.argv.slice(2);
  assert(
    powerPath && topPath && outputPath && runPaths.length === 4,
    'Usage: node scripts/summarize-hidden-window-energy.ts <gpu.txt> <top.txt> <output.json> <before.json> <after.json> <after.json> <before.json>'
  );
  const samples = parseGpuPowerSamples(fs.readFileSync(powerPath, 'utf8'));
  const utcOffset = fs
    .readFileSync(powerPath, 'utf8')
    .match(/Sampled system activity \([^)]* ([+-]\d{4})\)/)?.[1];
  assert(utcOffset, 'Missing GPU capture timezone');
  const windowServerSamples = parseWindowServerSamples(
    fs.readFileSync(topPath, 'utf8'),
    utcOffset
  );
  const runs = runPaths.map(
    (p) => JSON.parse(fs.readFileSync(p, 'utf8')) as Run
  );
  assert.deepEqual(
    runs.map((r) => r.context.expected),
    ['before', 'after', 'after', 'before']
  );
  const phases = runs.map((run, i) => {
    assert(run.context.animated);
    assert.equal(run.phases[0].samples.length, 60);
    assert.equal(run.phases.length, 1);
    const phase = run.phases[0];
    assert.equal(phase.state, 'initially-hidden');
    const gpuSamples = selectPhaseSamples(
      samples,
      phase.startedAt,
      phase.endedAt
    );
    const gpu = summarizeGpuSamples(gpuSamples);
    assert(gpu.elapsedMs >= 50_000, 'Fewer than 50 seconds of GPU samples');
    const ws = windowServerSamples.filter(
      (s) =>
        Date.parse(s.time) >= Date.parse(phase.startedAt) + 1000 &&
        Date.parse(s.time) <= Date.parse(phase.endedAt) - 1000
    );
    assert(ws.length >= 50, 'Fewer than 50 WindowServer samples');
    return {
      run: i + 1,
      condition: run.context.expected,
      startedAt: phase.startedAt,
      endedAt: phase.endedAt,
      gpu,
      gpuSamples,
      windowServerSamples: ws,
      windowServerCpuPercent:
        ws.reduce((s, v) => s + v.cpuPercent, 0) / ws.length,
    };
  });
  const summary = ['before', 'after'].map((condition) => {
    const selected = phases.filter((p) => p.condition === condition);
    const ws = selected.flatMap((p) => p.windowServerSamples);
    return {
      condition,
      gpu: summarizeGpuSamples(selected.flatMap((p) => p.gpuSamples)),
      windowServerCpuPercent:
        ws.reduce((s, v) => s + v.cpuPercent, 0) / ws.length,
    };
  });
  const result = {
    environment: runs[0].context,
    methodology: {
      warmupSeconds: 45,
      sampleSeconds: 60,
      order: ['before', 'after', 'after', 'before'],
      counters:
        'System-wide estimated GPU power / HW active residency; WindowServer CPU (100% = one core)',
      boundaryMarginMs: 1000,
      scope:
        'Actual built desktop shell with a synthetic local channel, not per-app GPU energy or battery life',
    },
    phases,
    summary,
  };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
};
if (process.argv[1]?.endsWith('summarize-hidden-window-energy.ts')) main();
