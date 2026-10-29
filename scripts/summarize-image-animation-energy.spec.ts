import {
  parseGpuPowerSamples,
  selectPhaseSamples,
  summarizeGpuSamples,
} from './summarize-image-animation-energy';

const sample = `*** Sampled system activity (Thu Oct 29 23:30:00 2026 +0530) (1003.98ms elapsed) ***
GPU HW active residency:  11.09% (338 MHz: 9.0%)
GPU Power: 54 mW
`;

it('reads timestamps, explicit milliwatts and active residency from powermetrics', () => {
  expect(parseGpuPowerSamples(sample)).toEqual([
    {
      endedAt: '2026-10-29T18:00:00.000Z',
      elapsedMs: 1003.98,
      powerMilliwatts: 54,
      activeResidencyPercent: 11.09,
    },
  ]);
});

it('rejects incomplete counters instead of interpreting missing power as zero', () => {
  expect(() =>
    parseGpuPowerSamples(sample.replace('GPU Power: 54 mW', ''))
  ).toThrow('Incomplete GPU power sample');
});

it('weights power and residency by duration and integrates joules', () => {
  const first = parseGpuPowerSamples(sample)[0];
  const result = summarizeGpuSamples([
    {
      ...first,
      elapsedMs: 1000,
      powerMilliwatts: 100,
      activeResidencyPercent: 10,
    },
    {
      ...first,
      elapsedMs: 2000,
      powerMilliwatts: 200,
      activeResidencyPercent: 40,
    },
  ]);
  expect(result.powerMilliwatts).toBeCloseTo(500 / 3);
  expect(result.activeResidencyPercent).toBe(30);
  expect(result.estimatedEnergyJoules).toBeCloseTo(0.5);
  expect(result.estimatedEnergyJoulesPer60Seconds).toBeCloseTo(10);
});

it('excludes intervals straddling phase boundaries and timestamp-rounding margins', () => {
  const first = parseGpuPowerSamples(sample)[0];
  const samples = [1, 2, 3, 4, 5].map((seconds) => ({
    ...first,
    elapsedMs: 1000,
    endedAt: `2026-10-29T18:00:0${seconds}.000Z`,
  }));
  expect(
    selectPhaseSamples(
      samples,
      '2026-10-29T18:00:00.000Z',
      '2026-10-29T18:00:05.000Z'
    )
  ).toEqual(samples.slice(1, 4));
});

it('rejects an empty measurement instead of returning a misleading zero', () => {
  expect(() => summarizeGpuSamples([])).toThrow('No GPU samples');
});
