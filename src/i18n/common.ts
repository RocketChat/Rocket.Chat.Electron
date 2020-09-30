import { InitOptions } from 'i18next';

export const fallbackLng = 'en' as const;

export const interpolation: InitOptions['interpolation'] = {
  format: (value, _format, lng) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Intl.DateTimeFormat(lng).format(value);
    }

    return String(value);
  },
};
