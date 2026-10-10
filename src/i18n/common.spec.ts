import { interpolation, fallbackLng } from './common';

describe('i18n common', () => {
  describe('fallbackLng', () => {
    it('should be set to "en"', () => {
      expect(fallbackLng).toBe('en');
    });
  });

  describe('interpolation.format', () => {
    if (!interpolation?.format) {
      throw new Error('interpolation.format is not defined');
    }
    const { format } = interpolation;

    describe('formatBytes', () => {
      it('should format bytes correctly', () => {
        const result = format(500, 'byteSize', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('byte');
      });

      it('should format 1 KB correctly', () => {
        const result = format(1024, 'byteSize', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('kB');
      });

      it('should format 1 MB correctly', () => {
        const result = format(1024 * 1024, 'byteSize', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('M');
      });

      it('should format 1 GB correctly', () => {
        const result = format(1024 * 1024 * 1024, 'byteSize', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('G');
      });

      it('should format 1 TB correctly', () => {
        const result = format(1024 * 1024 * 1024 * 1024, 'byteSize', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('T');
      });

      it('should format 1 PB correctly', () => {
        const result = format(
          1024 * 1024 * 1024 * 1024 * 1024,
          'byteSize',
          'en'
        );
        expect(result).toBeDefined();
        expect(result).toContain('P');
      });

      it('should handle 0 bytes (current behavior returns ???)', () => {
        const result = format(0, 'byteSize', 'en');
        expect(result).toBe('???');
      });

      it('should handle negative bytes (current behavior returns ???)', () => {
        const result = format(-100, 'byteSize', 'en');
        expect(result).toBe('???');
      });

      it('should handle very small fractional bytes', () => {
        const result = format(0.5, 'byteSize', 'en');
        expect(result).toBe('???');
      });

      it('should handle values between units', () => {
        const result = format(1536, 'byteSize', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('kB');
      });

      it('should handle very large values (petabytes)', () => {
        const result = format(
          1024 * 1024 * 1024 * 1024 * 1024 * 10,
          'byteSize',
          'en'
        );
        expect(result).toBeDefined();
        expect(result).toContain('P');
      });

      it('should cap at petabytes for extremely large values', () => {
        const result = format(
          1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 1024,
          'byteSize',
          'en'
        );
        expect(result).toBeDefined();
        expect(result).toContain('P');
      });
    });

    describe('formatByteSpeed', () => {
      it('should format bytes per second correctly', () => {
        const result = format(500, 'byteSpeed', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('byte');
      });

      it('should format KB/s correctly', () => {
        const result = format(1024, 'byteSpeed', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('kB');
      });

      it('should format MB/s correctly', () => {
        const result = format(1024 * 1024, 'byteSpeed', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('M');
      });

      it('should format GB/s correctly', () => {
        const result = format(1024 * 1024 * 1024, 'byteSpeed', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('G');
      });

      it('should handle 0 bytes/sec (current behavior returns ???)', () => {
        const result = format(0, 'byteSpeed', 'en');
        expect(result).toBe('???');
      });

      it('should handle negative bytes/sec (current behavior returns ???)', () => {
        const result = format(-1024, 'byteSpeed', 'en');
        expect(result).toBe('???');
      });

      it('should handle fractional bytes/sec', () => {
        const result = format(0.5, 'byteSpeed', 'en');
        expect(result).toBe('???');
      });

      it('should handle very high speeds', () => {
        const result = format(1024 * 1024 * 100, 'byteSpeed', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('M');
      });
    });

    describe('formatPercentage', () => {
      it('should format 0% correctly', () => {
        const result = format(0, 'percentage', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('0');
      });

      it('should format 50% correctly', () => {
        const result = format(0.5, 'percentage', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('5');
      });

      it('should format 100% correctly', () => {
        const result = format(1, 'percentage', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('100');
      });

      it('should handle values over 100%', () => {
        const result = format(1.5, 'percentage', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('150');
      });

      it('should handle negative percentages', () => {
        const result = format(-0.5, 'percentage', 'en');
        expect(result).toBeDefined();
      });

      it('should handle very small percentages', () => {
        const result = format(0.001, 'percentage', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('0');
      });

      it('should handle fractional percentages', () => {
        const result = format(0.333, 'percentage', 'en');
        expect(result).toBeDefined();
        expect(result).toContain('3');
      });
    });

    describe('formatDuration', () => {
      it('should format seconds correctly', () => {
        const result = format(30000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+s/);
      });

      it('should format minutes correctly', () => {
        const result = format(120000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+m/);
      });

      it('should format hours correctly', () => {
        const result = format(3600000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+h/);
      });

      it('should format days correctly', () => {
        const result = format(86400000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+d/);
      });

      it('should format weeks correctly', () => {
        const result = format(604800000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+w/);
      });

      it('should format months correctly', () => {
        const result = format(2592000000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+(\.\d+)?w/);
      });

      it('should format years correctly', () => {
        const result = format(31536000000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+(\.\d+)?mo/);
      });

      it('should handle 0 duration', () => {
        const result = format(0, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/0s/);
      });

      it('should handle very short durations (milliseconds)', () => {
        const result = format(500, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+(\.\d+)?s/);
      });

      it('should handle negative durations', () => {
        const result = format(-60000, 'duration', 'en');
        expect(result).toBeDefined();
      });

      it('should handle boundary between seconds and minutes', () => {
        const result = format(59000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+s/);
      });

      it('should handle boundary between minutes and hours', () => {
        const result = format(3540000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+m/);
      });

      it('should handle boundary between hours and days', () => {
        const result = format(82800000, 'duration', 'en');
        expect(result).toBeDefined();
        expect(result).toMatch(/\d+h/);
      });
    });

    describe('Date formatting', () => {
      it('should format Date objects', () => {
        const date = new Date('2024-01-01T00:00:00Z');
        const result = format(date, undefined, 'en');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should handle invalid dates', () => {
        const invalidDate = new Date('invalid');
        const result = format(invalidDate, undefined, 'en');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    describe('Unknown format', () => {
      it('should return string representation for unknown format', () => {
        const result = format(123, 'unknownFormat', 'en');
        expect(result).toBe('123');
      });

      it('should handle undefined format', () => {
        const result = format(456, undefined, 'en');
        expect(result).toBe('456');
      });

      it('should handle null values', () => {
        const result = format(null, 'byteSize', 'en');
        expect(result).toBeDefined();
      });
    });
  });
});
