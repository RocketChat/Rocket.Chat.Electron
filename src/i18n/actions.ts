import resources from './resources';

export const I18N_LNG_REQUESTED = 'i18n/lng-requested';
export const I18N_LNG_RESPONDED = 'i18n/lng-responded';

export type I18nActionTypeToPayloadMap = {
  [I18N_LNG_REQUESTED]: never;
  [I18N_LNG_RESPONDED]: null | keyof typeof resources;
};
