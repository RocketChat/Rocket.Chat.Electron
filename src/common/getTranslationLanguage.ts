import { isTranslationLanguage } from './isTranslationLanguage';
import type { TranslationLanguage } from './types/TranslationLanguage';

export const getTranslationLanguage = (
  locale: string
): TranslationLanguage | undefined => {
  let [languageCode, countryCode] = locale.split(/[-_]/) as [
    string,
    string | null
  ];
  if (!languageCode || languageCode.length !== 2) {
    return undefined;
  }

  languageCode = languageCode.toLowerCase();

  if (!countryCode || countryCode.length !== 2) {
    countryCode = null;
  } else {
    countryCode = countryCode.toUpperCase();
  }

  const lng = countryCode ? `${languageCode}-${countryCode}` : languageCode;

  if (isTranslationLanguage(lng)) {
    return lng;
  }

  return undefined;
};
