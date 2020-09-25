import { app } from 'electron';
import i18next, { TFunction } from 'i18next';

import { dispatch, Service } from '../store';
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

class I18nService extends Service {
  private async initializeAsync(): Promise<void> {
    const lng = await getLng();

    this.t = await i18next
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
  }

  private initialization: Promise<void>;

  protected initialize(): void {
    this.initialization = this.initializeAsync();

    this.listen(I18N_LNG_REQUESTED, (action) => {
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
    return this.initialization;
  }

  public t: TFunction = i18next.t.bind(i18next)
}

export default new I18nService();
