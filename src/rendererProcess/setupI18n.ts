import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  I18N_LNG_REQUESTED,
  I18N_LNG_RESPONDED,
} from '../common/actions/i18nActions';
import { interpolation, fallbackLng } from '../common/i18n';
import resources from '../common/i18nResources';
import { request } from '../store';

export const setupI18n = async (): Promise<void> => {
  const lng =
    (await request(
      {
        type: I18N_LNG_REQUESTED,
      },
      I18N_LNG_RESPONDED
    )) ?? undefined;

  await i18next.use(initReactI18next).init({
    lng,
    fallbackLng,
    resources: {
      ...(lng && {
        [lng]: {
          translation: await resources[lng](),
        },
      }),
      [fallbackLng]: {
        translation: await resources[fallbackLng](),
      },
    },
    interpolation,
    initImmediate: true,
  });
};
