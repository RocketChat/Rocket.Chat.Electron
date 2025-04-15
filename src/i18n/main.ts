import { app } from 'electron';
import type { TFunction } from 'i18next';
import i18next from 'i18next';

import { dispatch, Service } from '../store';
import { hasMeta } from '../store/fsa';
import { I18N_LNG_REQUESTED, I18N_LNG_RESPONDED } from './actions';
import { interpolation, fallbackLng } from './common';
import resources from './resources';

const hasLng = (lng: string): lng is keyof typeof resources => lng in resources;

const getLng = async (): Promise<keyof typeof resources | undefined> => {
  await app.whenReady();

  const locale = app.getSystemLocale();

  let [languageCode, countryCode] = locale.split(/[-_]/);
  if (!languageCode || languageCode.length !== 2) {
    return fallbackLng;
  }

  languageCode = languageCode.toLowerCase();

  const isCountryCodeInexistentOrNonStandard =
    !countryCode || countryCode.length !== 2;
  countryCode = isCountryCodeInexistentOrNonStandard
    ? ''
    : countryCode.toUpperCase();

  const lng = countryCode ? `${languageCode}-${countryCode}` : languageCode;

  if (hasLng(lng)) {
    return lng;
  }

  return Object.keys(resources).find((language) =>
    language.startsWith(languageCode)
  ) as keyof typeof resources | undefined;
};

export let getLanguage = 'en';

class I18nService extends Service {
  private async initializeAsync(): Promise<void> {
    const lng = await getLng();
    getLanguage = lng || 'en';

    this.t = await i18next.init({
      lng,
      fallbackLng,
      resources: {
        ...(lng &&
          lng in resources && {
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
  }

  private initialization: Promise<void> | undefined;

  protected initialize(): void {
    this.initialization = this.initializeAsync();

    this.listen(I18N_LNG_REQUESTED, (action) => {
      if (!hasMeta(action) || !action.meta.id) {
        return;
      }

      dispatch({
        type: I18N_LNG_RESPONDED,
        payload: hasLng(i18next.language) ? i18next.language : fallbackLng,
        meta: {
          response: true,
          id: action.meta?.id,
        },
      });
    });
  }

  public wait(): Promise<void> {
    return this.initialization ?? Promise.reject(new Error('not initialized'));
  }

  public t: TFunction = i18next.t.bind(i18next);
}

export default new I18nService();
