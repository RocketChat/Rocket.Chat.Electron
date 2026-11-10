import { resolve } from 'path';

import {
  BASELINE_NAME,
  formatDelta,
  formatReport,
  median,
  parseConfig,
  parseIoregGpuUtilization,
  parsePowermetrics,
  parsePsCpuTime,
  roundOrder,
  summarize,
  totalUsage,
  usageBetween,
} from './perfMeasure.lib';

describe('parseConfig', () => {
  it('fills the defaults and adds the system baseline first', () => {
    const config = parseConfig(
      { conditions: [{ name: 'dev', appDir: '../a' }] },
      '/base/dir'
    );

    expect(config).toMatchObject({
      rounds: 3,
      settleSeconds: 15,
      sampleSeconds: 30,
      reference: 'dev',
    });
    expect(config.window).toEqual({ width: 1200, height: 800 });
    expect(config.conditions.map((c) => c.name)).toEqual([
      BASELINE_NAME,
      'dev',
    ]);
    expect(config.conditions[0].appDir).toBeNull();
    expect(config.conditions[1].appDir).toBe(resolve('/base/dir', '../a'));
  });

  it('leaves out the baseline when the config turns it off', () => {
    const config = parseConfig(
      { baseline: false, conditions: [{ name: 'dev' }] },
      '/base'
    );

    expect(config.conditions.map((c) => c.name)).toEqual(['dev']);
  });

  it('keeps overrides, settings, arguments and expressions', () => {
    const [, condition] = parseConfig(
      {
        conditions: [
          {
            name: 'on',
            overriddenSettings: { isTransparentWindowEnabled: true },
            config: { isHardwareAccelerationEnabled: false },
            args: ['--force-device-scale-factor=2'],
            env: { FOO: '1' },
            setup: 'setupExpr',
            workload: 'workloadExpr',
          },
        ],
      },
      '/base'
    ).conditions;

    expect(condition).toMatchObject({
      overriddenSettings: { isTransparentWindowEnabled: true },
      config: { isHardwareAccelerationEnabled: false },
      args: ['--force-device-scale-factor=2'],
      env: { FOO: '1' },
      setup: 'setupExpr',
      workload: 'workloadExpr',
    });
  });

  it.each([
    [{}, /non-empty "conditions"/],
    [{ conditions: [{}] }, /conditions\[0\]\.name/],
    [{ conditions: [{ name: 'a' }, { name: 'a' }] }, /used twice/],
    [{ conditions: [{ name: 'a', args: 'x' }] }, /args must be an array/],
    [{ conditions: [{ name: 'a', setup: 1 }] }, /setup must be a string/],
    [
      { conditions: [{ name: 'a' }], rounds: 0 },
      /rounds must be a positive integer/,
    ],
    [{ conditions: [{ name: 'a' }], reference: 'b' }, /reference "b"/],
  ])('rejects %j', (raw, message) => {
    expect(() => parseConfig(raw, '/base')).toThrow(message);
  });
});

describe('roundOrder', () => {
  it('starts each round one condition later', () => {
    expect(roundOrder(['a', 'b', 'c'], 1)).toEqual(['a', 'b', 'c']);
    expect(roundOrder(['a', 'b', 'c'], 2)).toEqual(['b', 'c', 'a']);
    expect(roundOrder(['a', 'b', 'c'], 4)).toEqual(['a', 'b', 'c']);
  });
});

describe('parseIoregGpuUtilization', () => {
  it('reads the device utilization', () => {
    expect(
      parseIoregGpuUtilization(
        '"PerformanceStatistics" = {"Renderer Utilization %"=49,"Device Utilization %"=50}'
      )
    ).toBe(50);
  });

  it('returns null when the key is missing', () => {
    expect(parseIoregGpuUtilization('{}')).toBeNull();
  });
});

describe('parsePsCpuTime', () => {
  it.each([
    ['0:01.50', 1.5],
    ['12:03.25', 723.25],
    ['1:02:03.00', 3723],
    ['2-01:00:00', 176400],
  ])('reads %s', (value, seconds) => {
    expect(parsePsCpuTime(value)).toBeCloseTo(seconds);
  });

  it('returns null for text that is not a time', () => {
    expect(parsePsCpuTime('n/a')).toBeNull();
  });
});

describe('parsePowermetrics', () => {
  it('reads one sample per block', () => {
    const output = [
      '*** Sampled system activity (Mon Nov 10 14:00:00 2026 -0300) (1001.23ms elapsed) ***',
      'CPU Power: 812 mW',
      'GPU HW active frequency: 444 MHz',
      'GPU HW active residency:  21.10% (338 MHz:  21% 618 MHz:   0%)',
      'GPU Power: 188 mW',
      'Combined Power (CPU + GPU + ANE): 1000 mW',
      '*** Sampled system activity (Mon Nov 10 14:00:01 2026 -0300) (1000.10ms elapsed) ***',
      'CPU Power: 700 mW',
      'GPU Power: 12 mW',
    ].join('\n');

    expect(parsePowermetrics(output)).toEqual([
      {
        cpuMilliwatts: 812,
        gpuMilliwatts: 188,
        combinedMilliwatts: 1000,
        gpuActiveResidencyPercent: 21.1,
      },
      {
        cpuMilliwatts: 700,
        gpuMilliwatts: 12,
        combinedMilliwatts: undefined,
        gpuActiveResidencyPercent: undefined,
      },
    ]);
  });
});

describe('usageBetween', () => {
  const snapshot = (
    pid: number,
    type: string,
    cumulativeCpuSeconds: number | null,
    extra = {}
  ) => ({
    pid,
    type,
    cumulativeCpuSeconds,
    percentCpu: 0,
    idleWakeupsPerSecond: 10,
    workingSetKilobytes: 1024,
    ...extra,
  });

  it('computes CPU from the cumulative difference and groups by type', () => {
    const usage = usageBetween(
      [snapshot(1, 'Browser', 10), snapshot(2, 'GPU', 20)],
      [
        snapshot(1, 'Browser', 13),
        snapshot(2, 'GPU', 26),
        snapshot(3, 'Tab', 1.5),
      ],
      30
    );

    expect(usage.Browser.cpuPercent).toBeCloseTo(10);
    expect(usage.GPU.cpuPercent).toBeCloseTo(20);
    // A process that started during the window counts from zero.
    expect(usage.Tab.cpuPercent).toBeCloseTo(5);
    expect(usage.GPU.workingSetMegabytes).toBe(1);

    expect(totalUsage(usage)).toMatchObject({
      processes: 3,
      idleWakeupsPerSecond: 30,
      workingSetMegabytes: 3,
    });
    expect(totalUsage(usage).cpuPercent).toBeCloseTo(35);
  });

  it('falls back to percentCPUUsage without a cumulative value', () => {
    const usage = usageBetween(
      [snapshot(1, 'GPU', null)],
      [snapshot(1, 'GPU', null, { percentCpu: 7.5 })],
      30
    );

    expect(usage.GPU.cpuPercent).toBe(7.5);
  });

  it('names utility processes', () => {
    const usage = usageBetween(
      [],
      [snapshot(4, 'Utility', 3, { name: 'Network Service' })],
      30
    );

    expect(Object.keys(usage)).toEqual(['Utility: Network Service']);
  });
});

describe('summarize and formatReport', () => {
  const results = [
    { condition: 'dev', round: 1, metrics: { 'GPU %': 40 }, loadAverage: 10 },
    { condition: 'dev', round: 2, metrics: { 'GPU %': 50 }, loadAverage: 12 },
    { condition: 'dev', round: 3, metrics: { 'GPU %': 45 }, loadAverage: 14 },
    { condition: 'fix', round: 1, metrics: { 'GPU %': 20 }, loadAverage: 10 },
    { condition: 'fix', round: 2, metrics: { 'GPU %': 30 }, loadAverage: 12 },
  ];

  it('takes the median, min and max per condition', () => {
    const summary = summarize(results, ['dev', 'fix']);

    expect(summary.values.dev['GPU %']).toEqual({
      median: 45,
      min: 40,
      max: 50,
      rounds: 3,
    });
    expect(summary.values.fix['GPU %']).toEqual({
      median: 25,
      min: 20,
      max: 30,
      rounds: 2,
    });
    expect(summary.loadAverage.dev).toBe(12);
  });

  it('shows the change against the reference', () => {
    const report = formatReport(summarize(results, ['dev', 'fix']), 'dev', {
      Rounds: '3',
    });

    expect(report).toContain('| Metric | dev | fix |');
    expect(report).toContain(
      '| GPU % | 45.0 [40.0–50.0] | 25.0 [20.0–30.0] (-44%) |'
    );
    expect(report).toContain('- Rounds: 3');
  });

  it('formats deltas and medians', () => {
    expect(formatDelta(12, 10)).toBe(' (+20%)');
    expect(formatDelta(5, 0)).toBe('');
    expect(median([3, 1, 2, 4])).toBe(2.5);
  });
});
