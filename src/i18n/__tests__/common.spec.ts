import { fallbackLng, interpolation } from '../common';

// The byte/speed/percentage/duration formatters are not exported directly;
// they are reachable through interpolation.format(value, format, lng).
// Output of Intl formatters is locale-dependent, so assertions target stable
// structural markers (units, signs, magnitude) using the 'en' locale.
const format = (value: unknown, fmt?: string) =>
  interpolation!.format!(value, fmt, 'en');

describe('fallbackLng', () => {
  it('is "en"', () => {
    expect(fallbackLng).toBe('en');
  });
});

describe('interpolation', () => {
  it('disables HTML escaping', () => {
    expect(interpolation!.escapeValue).toBe(false);
  });

  describe('Date values', () => {
    it('formats a valid Date regardless of the requested format', () => {
      const date = new Date(2023, 0, 15);
      const out = format(date, 'byteSize');
      expect(typeof out).toBe('string');
      expect(out).toMatch(/2023/);
    });

    it('falls through to String() for an invalid Date', () => {
      const invalid = new Date('not-a-date');
      const out = format(invalid, 'byteSize');
      // Invalid Date is not handled by the Date branch; passes to formatBytes
      // (NaN bytes) which yields the '???' sentinel.
      expect(out).toBe('???');
    });
  });

  describe('byteSize', () => {
    it.each<[number, RegExp]>([
      // Intl compact/narrow form emits "byte" for the base unit, "kB"/"MB"/... above.
      [512, /byte|B/i],
      [1024, /kB/i],
      [1536, /kB/i],
      [1024 * 1024, /MB/i],
      [1024 * 1024 * 1024, /GB/i],
      [1024 ** 4, /TB/i],
      [1024 ** 5, /PB/i],
    ])('formats %d bytes with a unit matching %s', (bytes, unitRe) => {
      const out = format(bytes, 'byteSize');
      expect(typeof out).toBe('string');
      expect(out).toMatch(unitRe);
    });

    it('clamps orders beyond the largest unit to petabytes', () => {
      const huge = 1024 ** 8;
      expect(format(huge, 'byteSize')).toMatch(/PB/i);
    });

    it('returns the ??? sentinel for 0 bytes (log(0) yields no valid unit)', () => {
      // Math.log(0) === -Infinity → order === -Infinity → byteUnits[order] undefined
      expect(format(0, 'byteSize')).toBe('???');
    });

    it('returns the ??? sentinel for non-finite input', () => {
      expect(format(NaN, 'byteSize')).toBe('???');
    });
  });

  describe('byteSpeed', () => {
    it.each<[number, RegExp]>([
      [512, /byte|B/i],
      [1024, /kB/i],
      [1024 * 1024, /MB/i],
      [1024 * 1024 * 1024, /GB/i],
    ])('formats %d B/s including a per-second unit', (bps, unitRe) => {
      const out = format(bps, 'byteSpeed');
      expect(out).toMatch(unitRe);
      expect(out).toMatch(/\/s|per second/i);
    });

    it('returns the ??? sentinel for non-finite input', () => {
      expect(format(NaN, 'byteSpeed')).toBe('???');
    });
  });

  describe('percentage', () => {
    it.each<[number, RegExp]>([
      [0, /0\s*%/],
      [0.5, /50\s*%/],
      [1, /100\s*%/],
    ])('formats ratio %d as %s', (ratio, expectedRe) => {
      expect(format(ratio, 'percentage')).toMatch(expectedRe);
    });

    it('rounds to whole percent (no fraction digits)', () => {
      const out = format(0.123, 'percentage');
      expect(out).toMatch(/12\s*%/);
      expect(out).not.toMatch(/\./);
    });
  });

  // formatDuration uses RelativeTimeFormat narrow style with fixed cumulative
  // divisors (s→/60, min→/60, h→/24, day→/7, week→/30, month→/12). Narrow 'en'
  // output uses single-letter units (5s, 5m, 5h, 3d, 2w) and 'mo'/'yr'.
  const DAY = 24 * 60 * 60 * 1000;
  describe('duration', () => {
    it('formats sub-minute durations in seconds', () => {
      const out = format(5000, 'duration'); // 5 s
      expect(out).toMatch(/\b5s\b|sec/i);
    });

    it('formats minute-scale durations in minutes', () => {
      const out = format(5 * 60 * 1000, 'duration'); // 5 min
      expect(out).toMatch(/\b5m\b|min/i);
    });

    it('formats hour-scale durations in hours', () => {
      const out = format(5 * 60 * 60 * 1000, 'duration'); // 5 h
      expect(out).toMatch(/\b5h\b|hr|hour/i);
    });

    it('formats day-scale durations in days', () => {
      const out = format(3 * DAY, 'duration'); // 3 days
      expect(out).toMatch(/\b3d\b|day/i);
    });

    it('formats week-scale durations in weeks', () => {
      const out = format(2 * 7 * DAY, 'duration'); // 2 weeks
      expect(out).toMatch(/\b2w\b|wk|week/i);
    });

    it('formats month-scale durations in months', () => {
      // 300 days: 300/7 ≈ 42.86 weeks, /30 ≈ 1.43 → month bucket
      const out = format(300 * DAY, 'duration');
      expect(out).toMatch(/mo|mth|month/i);
    });

    it('formats year-scale durations in years', () => {
      // 5000 days falls through all buckets into the year branch
      const out = format(5000 * DAY, 'duration');
      expect(out).toMatch(/\b[\d.]+y\b|yr|year/i);
    });

    it('formats a zero duration as seconds', () => {
      const out = format(0, 'duration');
      expect(out).toMatch(/\b0s\b|sec/i);
    });
  });

  describe('default branch', () => {
    it('stringifies values with no matching format', () => {
      expect(format(42)).toBe('42');
      expect(format('hello', 'unknownFormat')).toBe('hello');
      expect(format(true, 'byteSizeX')).toBe('true');
    });
  });
});
