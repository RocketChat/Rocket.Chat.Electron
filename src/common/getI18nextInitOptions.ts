import type { InitOptions } from 'i18next';

import { fallbackTranslationLanguage } from './fallbackTranslationLanguage';
import { getTranslationLanguage } from './getTranslationLanguage';
import i18nResources from './i18nResources';
import { interpolation } from './interpolation';

export const getI18nextInitOptions = async (
  locale: string
): Promise<InitOptions> => {
  const lng = getTranslationLanguage(locale);

  return {
    lng,
    fallbackLng: fallbackTranslationLanguage,
    resources: {
      ...(lng &&
        lng in i18nResources && {
          [lng]: {
            translation: await i18nResources[lng](),
          },
        }),
      [fallbackTranslationLanguage]: {
        translation: await i18nResources[fallbackTranslationLanguage](),
      },
    },
    interpolation,
    initImmediate: true,
  };
};
