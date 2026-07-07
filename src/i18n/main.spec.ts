import { I18N_LNG_REQUESTED, I18N_LNG_RESPONDED } from './actions';
import type * as MainModule from './main';

jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(),
    getSystemLocale: jest.fn(),
  },
}));

jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    t: jest.fn(),
    language: undefined as string | undefined,
  },
}));

jest.mock('../store', () => {
  const mockListen = jest.fn();

  return {
    dispatch: jest.fn(),
    __mockListen: mockListen,
    Service: class {
      private unsubscribers = new Set<() => void>();

      protected listen(typeOrPredicate: unknown, listener: unknown): void {
        this.unsubscribers.add(
          mockListen(typeOrPredicate as never, listener as never)
        );
      }

      public setUp(): void {
        this.initialize();
      }

      public tearDown(): void {
        this.unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.unsubscribers.clear();
      }

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      protected initialize(): void {}
    },
  };
});

jest.mock('../store/fsa', () => ({
  hasMeta: jest.fn(),
}));

jest.mock('./resources', () => ({
  en: jest.fn(async () => ({ translation: { hello: 'hello en' } })),
  es: jest.fn(async () => ({ translation: { hello: 'hola' } })),
}));

const mockI18next = jest.requireMock('i18next').default as {
  init: jest.Mock;
  t: jest.Mock;
  language: string | undefined;
};
const mockI18nextInit = mockI18next.init;
const mockI18nextT = mockI18next.t;

const mockAppWhenReady = jest.requireMock('electron').app.whenReady;
const mockAppGetSystemLocale = jest.requireMock('electron').app.getSystemLocale;

const mockStore = jest.requireMock('../store') as {
  dispatch: jest.Mock;
  __mockListen: jest.Mock;
};
const mockDispatch = mockStore.dispatch;
const mockListen = mockStore.__mockListen;

const mockResources = jest.requireMock('./resources') as {
  en: jest.Mock;
  es: jest.Mock;
};

const mockHasMeta = jest.requireMock('../store/fsa').hasMeta;

const loadI18n = () => {
  let exports: typeof MainModule;

  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    exports = require('./main');
  });

  return exports!;
};

describe('i18n/main', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAppWhenReady.mockResolvedValue(undefined);
    mockAppGetSystemLocale.mockReturnValue('en-US');

    mockI18next.language = 'en';
    mockI18nextInit.mockImplementation(async (options: any) => {
      mockI18next.language = options.lng;
      return undefined;
    });
    mockI18nextT.mockReturnValue('translated');

    mockResources.en.mockClear();
    mockResources.es.mockClear();
    mockListen.mockImplementation(() => jest.fn());

    mockHasMeta.mockReset();
    mockDispatch.mockClear();
  });

  it('falls back to en when system locale is not a 2-digit language code', async () => {
    mockAppGetSystemLocale.mockReturnValue('x');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    expect(mockI18nextInit).toHaveBeenCalledWith(
      expect.objectContaining({
        lng: 'en',
        fallbackLng: 'en',
      })
    );
    expect(i18n.getLanguage).toBe('en');
  });

  it('falls back to en when no matching locale key is available', async () => {
    mockAppGetSystemLocale.mockReturnValue('zz-ZZ');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    const initOptions = mockI18nextInit.mock.calls[0]?.[0] as any;

    expect(i18n.getLanguage).toBe('en');
    expect(initOptions).toMatchObject({
      lng: undefined,
      fallbackLng: 'en',
      resources: {
        en: {
          translation: {
            translation: { hello: 'hello en' },
          },
        },
      },
    });
    expect(mockResources.en).toHaveBeenCalledTimes(1);
    expect(mockResources.es).not.toHaveBeenCalled();
  });

  it('selects exact locale language when available', async () => {
    mockAppGetSystemLocale.mockReturnValue('en');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    expect(i18n.getLanguage).toBe('en');
    expect(mockI18nextInit).toHaveBeenCalledWith(
      expect.objectContaining({ lng: 'en' })
    );
  });

  it('falls back from a country-specific locale to a base language', async () => {
    mockAppGetSystemLocale.mockReturnValue('es-MX');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    expect(mockI18nextInit).toHaveBeenCalledWith(
      expect.objectContaining({ lng: 'es', fallbackLng: 'en' })
    );
    expect(i18n.getLanguage).toBe('es');
  });

  it('loads fallback resources and optional locale resources conditionally', async () => {
    mockAppGetSystemLocale.mockReturnValue('es-MX');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    const initOptions = mockI18nextInit.mock.calls[0]?.[0] as any;

    expect(initOptions.resources).toMatchObject({
      en: {
        translation: {
          translation: { hello: 'hello en' },
        },
      },
      es: {
        translation: {
          translation: { hello: 'hola' },
        },
      },
    });
    expect(mockResources.en).toHaveBeenCalledTimes(1);
    expect(mockResources.es).toHaveBeenCalledTimes(1);
  });

  it('resolves wait() error when not initialized', async () => {
    const i18n = loadI18n();

    await expect(i18n.default.wait()).rejects.toThrow('not initialized');
  });

  it('ignores i18n responses with no FSA metadata', async () => {
    mockAppGetSystemLocale.mockReturnValue('en');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    mockHasMeta.mockReturnValue(false);

    const listener = mockListen.mock.calls.find(
      ([type]) => type === I18N_LNG_REQUESTED
    )?.[1] as (action: any) => void;

    if (!listener) {
      throw new Error('i18n listener was not registered');
    }

    listener({});

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does nothing when action meta exists but has no request id', async () => {
    mockAppGetSystemLocale.mockReturnValue('en');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    mockHasMeta.mockReturnValue(true);

    const listener = mockListen.mock.calls.find(
      ([type]) => type === I18N_LNG_REQUESTED
    )?.[1] as (action: any) => void;

    if (!listener) {
      throw new Error('i18n listener was not registered');
    }

    listener({ meta: {} });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches current i18n language when a request contains response metadata', async () => {
    mockAppGetSystemLocale.mockReturnValue('en');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    mockI18next.language = 'es';
    mockHasMeta.mockReturnValue(true);

    const listener = mockListen.mock.calls.find(
      ([type]) => type === I18N_LNG_REQUESTED
    )?.[1] as (action: any) => void;

    if (!listener) {
      throw new Error('i18n listener was not registered');
    }

    listener({
      meta: { id: 'abc' },
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: I18N_LNG_RESPONDED,
      payload: 'es',
      meta: {
        response: true,
        id: 'abc',
      },
    });
  });

  it('falls back to fallback language when current language is unsupported', async () => {
    mockAppGetSystemLocale.mockReturnValue('en');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    mockI18next.language = 'unsupported-LNG';
    mockHasMeta.mockReturnValue(true);

    const listener = mockListen.mock.calls.find(
      ([type]) => type === I18N_LNG_REQUESTED
    )?.[1] as (action: any) => void;

    if (!listener) {
      throw new Error('i18n listener was not registered');
    }

    listener({
      meta: { id: 'req-2' },
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: I18N_LNG_RESPONDED,
      payload: 'en',
      meta: {
        response: true,
        id: 'req-2',
      },
    });
  });

  it('sets up and waits for initialization when app locale is non-standard', async () => {
    mockAppGetSystemLocale.mockReturnValue('EN_us');

    const i18n = loadI18n();
    i18n.default.setUp();
    await i18n.default.wait();

    expect(mockAppWhenReady).toHaveBeenCalledTimes(1);
    expect(mockAppGetSystemLocale).toHaveBeenCalledTimes(1);
    expect(mockI18nextInit).toHaveBeenCalled();
    expect(i18n.getLanguage).toBe('en');
  });
});
