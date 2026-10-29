import type { InitOptions } from 'i18next';

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
  if (bytes === 0) {
    return new Intl.NumberFormat(undefined, {
      style: 'unit',
      unit: byteUnits[0],
      maximumFractionDigits: 1,
    }).format(0);
  }

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

  const seconds = duration / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (minutes < 1) {
    return formatter.format(
      seconds > 0 ? Math.max(1, Math.round(seconds)) : 0,
      'second'
    );
  }

  if (hours < 1) {
    return formatter.format(Math.round(minutes), 'minute');
  }

  if (days < 1) {
    return formatter.format(Math.round(hours), 'hour');
  }

  if (days < 7) {
    return formatter.format(Math.round(days), 'day');
  }

  if (days < 30) {
    return formatter.format(Math.round(days / 7), 'week');
  }

  if (days < 365) {
    return formatter.format(Math.round(days / 30), 'month');
  }

  return formatter.format(Math.round(days / 365), 'year');
};

export const interpolation: InitOptions['interpolation'] = {
  escapeValue: false,
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
