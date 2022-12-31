import { InitOptions } from 'i18next';

export const fallbackLng = 'en' as const;

const byteUnits = [
  'byte',
  'kilobyte',
  'megabyte',
  'gigabyte',
  'terabyte',
  'petabyte',
];

const formatBytes = (bytes: number): string => {
  const order = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    byteUnits.length - 1
  );

  const unit = byteUnits[order];

  if (!unit) {
    return '???';
  }

  const formatter = new Intl.NumberFormat(undefined, {
    notation: 'compact',
    style: 'unit',
    unit,
    maximumFractionDigits: 1,
  });
  return formatter.format(bytes / Math.pow(1024, order));
};

const formatByteSpeed = (bytesPerSecond: number): string => {
  const order = Math.min(
    Math.floor(Math.log(bytesPerSecond) / Math.log(1024)),
    byteUnits.length - 1
  );

  const unit = byteUnits[order];

  if (!unit) {
    return '???';
  }

  const formatter = new Intl.NumberFormat(undefined, {
    notation: 'compact',
    style: 'unit',
    unit: `${unit}-per-second`,
    maximumFractionDigits: 1,
  });
  return formatter.format(bytesPerSecond / Math.pow(1024, order));
};

const formatPercentage = (ratio: number): string => {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 0,
  });
  return formatter.format(ratio);
};

const formatDuration = (duration: number): string => {
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    style: 'narrow',
    numeric: 'always',
  });

  duration /= 1000;

  if (duration / 60 < 1) {
    return formatter.format(duration, 'second');
  }
  duration /= 60;

  if (duration / 60 < 1) {
    return formatter.format(duration, 'minute');
  }
  duration /= 60;

  if (duration / 24 < 1) {
    return formatter.format(duration, 'hour');
  }
  duration /= 24;

  if (duration / 7 < 1) {
    return formatter.format(duration, 'day');
  }
  duration /= 7;

  if (duration / 30 < 1) {
    return formatter.format(duration, 'week');
  }
  duration /= 30;

  if (duration / 12 < 1) {
    return formatter.format(duration, 'month');
  }
  duration /= 12;

  return formatter.format(duration, 'year');
};

export const interpolation: InitOptions['interpolation'] = {
  format: (value, format, lng) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Intl.DateTimeFormat(lng).format(value);
    }

    switch (format) {
      case 'byteSize':
        return formatBytes(value);

      case 'byteSpeed':
        return formatByteSpeed(value);

      case 'percentage':
        return formatPercentage(value);

      case 'duration':
        return formatDuration(value);
    }

    return String(value);
  },
};
