import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { request } from '../store';
import {
  I18N_LNG_REQUESTED,
  I18N_LNG_RESPONDED,
} from './actions';
import { interpolation, fallbackLng } from './common';
import resources from './resources';

export const setupI18n = async (): Promise<void> => {
  const lng = await request<typeof I18N_LNG_REQUESTED, typeof I18N_LNG_RESPONDED>({
    type: I18N_LNG_REQUESTED,
  });

  await i18next
    .use(initReactI18next)
    .init({
      lng,
      fallbackLng,
      resources: {
        ...lng && {
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
};
