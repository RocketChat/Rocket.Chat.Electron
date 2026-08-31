import i18next from 'i18next';

import { setupI18n } from '../renderer';

jest.mock('i18next', () => {
  const init = jest.fn().mockResolvedValue(undefined);
  const use = jest.fn(() => ({ init }));
  return {
    __esModule: true,
    default: { use, init },
    __mockInit: init,
    __mockUse: use,
  };
});

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('../../store', () => ({
  request: jest.fn(async () => 'en'),
}));

jest.mock('../resources', () => ({
  __esModule: true,
  default: {
    en: jest.fn(async () => ({ hello: 'Hello' })),
  },
}));

jest.mock('../common', () => ({
  interpolation: {},
  fallbackLng: 'en',
}));

describe('i18n/renderer setupI18n', () => {
  it('initializes i18next with requested language resources', async () => {
    await setupI18n();
    expect(i18next.use).toHaveBeenCalled();
    const chain = (i18next.use as jest.Mock).mock.results[0]?.value;
    expect(chain.init).toHaveBeenCalledWith(
      expect.objectContaining({
        lng: 'en',
        fallbackLng: 'en',
        initImmediate: true,
      })
    );
  });
});
