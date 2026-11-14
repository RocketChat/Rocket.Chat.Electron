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

type EnergyRun = {
  round: number;
  condition: 'before' | 'after';
  samplingStartedAt: string;
  samplingEndedAt: string;
  windowServerCpu: number[];
};

const main = (): void => {
  const [cpuPath, powerPath, outputPath] = process.argv.slice(2);
  assert(
    cpuPath && powerPath && outputPath,
    'Usage: node scripts/summarize-image-animation-energy.ts <cpu.json> <gpu.txt> <output.json>'
  );
  const cpu = JSON.parse(fs.readFileSync(cpuPath, 'utf8')) as {
    environment: unknown;
    workload: { mode: string };
    rounds: EnergyRun[];
  };
  assert.equal(cpu.workload.mode, 'energy');
  assert.deepEqual(
    cpu.rounds.map(({ condition }) => condition),
    ['after', 'before', 'before', 'after']
  );
  const samples = parseGpuPowerSamples(fs.readFileSync(powerPath, 'utf8'));
  assert(samples.length > 0);
  const phases = cpu.rounds.map((run) => {
    assert.equal(run.windowServerCpu.length, 60);
    const gpuSamples = selectPhaseSamples(
      samples,
      run.samplingStartedAt,
      run.samplingEndedAt
    );
    const gpu = summarizeGpuSamples(gpuSamples);
    assert(
      gpu.elapsedMs >= 50_000,
      'Fewer than 50 seconds of GPU data in a one-minute phase'
    );
    return { ...run, gpu, gpuSamples };
  });
  const summary = ['after', 'before'].map((condition) => {
    const runs = phases.filter((phase) => phase.condition === condition);
    const windowServerCpu = runs.flatMap((run) => run.windowServerCpu);
    return {
      condition,
      playback: condition === 'after' ? 'OFF' : 'ON',
      windowServerCpuPercent:
        windowServerCpu.reduce((sum, value) => sum + value, 0) /
        windowServerCpu.length,
      gpu: summarizeGpuSamples(runs.flatMap((run) => run.gpuSamples)),
    };
  });
  const result = {
    environment: cpu.environment,
    workload: cpu.workload,
    methodology: {
      counters: [
        'powermetrics --samplers gpu_power -i 1000',
        'top -l 61 -s 1 -stats pid,command,cpu -pid <WindowServer PID>',
      ],
      gpuScope: 'system-wide estimated GPU power and hardware active residency',
      windowServerCpuUnits:
        '100% equals one CPU core; initial top sample discarded',
      boundaryExclusionMs: 1000,
      energyUnits:
        'Joules integrated from estimated GPU milliwatts and elapsed time; per-60-second values are normalized from average power',
      limitations:
        'Synthetic image scene on one machine. Other applications remain running. No per-app energy attribution or battery-life claim.',
    },
    phases,
    summary,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
};

if (process.argv[1]?.endsWith('summarize-image-animation-energy.ts')) {
  main();
}
