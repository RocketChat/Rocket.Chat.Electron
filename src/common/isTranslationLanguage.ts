import i18nResources from './i18nResources';
import type { TranslationLanguage } from './types/TranslationLanguage';

export const isTranslationLanguage = (
  lng: string
): lng is TranslationLanguage => lng in i18nResources;
