import { app } from 'electron';
import i18next from 'i18next';

import { listen, dispatch } from '../store';
import { I18N_LNG_REQUESTED, I18N_LNG_RESPONDED } from './actions';
import { interpolation, fallbackLng } from './common';
import resources from './resources';

const hasLng = (lng: string): lng is keyof typeof resources =>
  lng in resources;

const getLng = async (): Promise<keyof typeof resources> => {
  await app.whenReady();

  const locale = app.getLocale();

  let [languageCode, countryCode] = locale.split ? locale.split(/[-_]/) : [];
  if (!languageCode || languageCode.length !== 2) {
    return fallbackLng;
  }

  languageCode = languageCode.toLowerCase();

  if (!countryCode || countryCode.length !== 2) {
    countryCode = null;
  } else {
    countryCode = countryCode.toUpperCase();
  }

  const lng = countryCode ? `${ languageCode }-${ countryCode }` : languageCode;

  if (hasLng(lng)) {
    return lng;
  }

  return null;
};

export const setupI18n = async (): Promise<void> => {
  const lng = await getLng();

  await i18next
    .init({
      lng,
      fallbackLng,
      resources: {
        ...lng in resources && {
          [lng]: {
            translation: await resources[lng](),
          },
        },
        [fallbackLng]: {
          translation: await resources[fallbackLng](),
        },
      },
      interpolation,
      initImmediate: true,
    });

  listen(I18N_LNG_REQUESTED, (action) => {
    dispatch({
      type: I18N_LNG_RESPONDED,
      payload: hasLng(i18next.language) ? i18next.language : fallbackLng,
      meta: {
        response: true,
        id: action.meta?.id,
      },
    });
  });
};
