/** @jest-environment jsdom */
import { dispatch } from '../../../store';
import {
  WEBVIEW_FAVICON_CHANGED,
  WEBVIEW_TITLE_CHANGED,
  WEBVIEW_USER_LOGGED_IN,
  WEBVIEW_USER_ROLES_CHANGED,
} from '../../../ui/actions';
import type * as FaviconModule from '../favicon';
import type * as TitleModule from '../title';
import type * as UserLoggedInModule from '../userLoggedIn';
import type * as UserRolesModule from '../userRoles';
import type * as WhenPreloadReadyModule from '../whenPreloadReady';

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

let mockServerUrl: string | undefined;
let mockAbsoluteUrl: ((path?: string) => string) | undefined;

jest.mock('../urls', () => ({
  getServerUrl: () => mockServerUrl,
  get getAbsoluteUrl() {
    return mockAbsoluteUrl;
  },
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;

type Modules = {
  gate: typeof WhenPreloadReadyModule;
  title: typeof TitleModule;
  userRoles: typeof UserRolesModule;
  userLoggedIn: typeof UserLoggedInModule;
  favicon: typeof FaviconModule;
};

// Each case gets new module state: the gate starts closed.
const loadModules = (): Modules => {
  let modules: Modules;
  jest.isolateModules(() => {
    modules = {
      gate: require('../whenPreloadReady'),
      title: require('../title'),
      userRoles: require('../userRoles'),
      userLoggedIn: require('../userLoggedIn'),
      favicon: require('../favicon'),
    };
  });
  return modules!;
};

// The preload start sets the server URL, creates the store, then opens the gate.
const finishPreloadStart = (gate: Modules['gate']): void => {
  mockServerUrl = 'https://chat.example.com';
  gate.markPreloadReady();
};

describe('servers/preload bridge calls before the preload is ready', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    dispatchMock.mockClear();
    mockServerUrl = undefined;
    mockAbsoluteUrl = undefined;
    localStorage.setItem('Meteor.loginToken', 'token');
    localStorage.setItem('Meteor.userId', 'user-id');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('keeps an early title and applies it with the server URL', () => {
    const { gate, title } = loadModules();

    expect(() => title.setTitle('Rocket.Chat')).not.toThrow();
    expect(dispatchMock).not.toHaveBeenCalled();

    finishPreloadStart(gate);

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url: 'https://chat.example.com',
        title: 'Rocket.Chat - https://chat.example.com',
      },
    });
  });

  it('applies only the last early title', () => {
    const { gate, title } = loadModules();

    title.setTitle('First');
    title.setTitle('Acme Chat');
    finishPreloadStart(gate);

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: { url: 'https://chat.example.com', title: 'Acme Chat' },
    });
  });

  it('runs a call at once after the preload is ready', () => {
    const { gate, title } = loadModules();
    finishPreloadStart(gate);

    title.setTitle('Acme Chat');

    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });

  it('sends early user roles with the server URL and keeps the REST fallback off', async () => {
    const { gate, userRoles } = loadModules();
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;

    userRoles.setUserRoles(['user', 'admin']);
    expect(dispatchMock).not.toHaveBeenCalled();

    finishPreloadStart(gate);
    await userRoles.updateUserRoles();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_ROLES_CHANGED,
      payload: {
        url: 'https://chat.example.com',
        userRoles: ['user', 'admin'],
      },
    });
  });

  it('lets an early logout replace early user roles', () => {
    const { gate, userRoles } = loadModules();

    userRoles.setUserRoles(['admin']);
    userRoles.clearUserRoles();
    finishPreloadStart(gate);

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_ROLES_CHANGED,
      payload: { url: 'https://chat.example.com', userRoles: undefined },
    });
  });

  it('resolves an early favicon against the server URL when no URL resolver is set', () => {
    const { gate, favicon } = loadModules();
    const loadListeners: Array<() => void> = [];
    const mockImage = {
      src: '',
      addEventListener: jest.fn((event: string, listener: () => void) => {
        if (event === 'load') loadListeners.push(listener);
      }),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => ({
        clearRect: jest.fn(),
        drawImage: jest.fn(),
      })),
      toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
    };
    const originalCreateElement = document.createElement.bind(document);
    (
      jest.spyOn(document, 'createElement' as any) as jest.Mock
    ).mockImplementation((tag: string) =>
      tag === 'canvas'
        ? (mockCanvas as unknown as HTMLElement)
        : originalCreateElement(tag)
    );
    const originalImage = global.Image;
    global.Image = jest.fn(
      () => mockImage as unknown as HTMLImageElement
    ) as unknown as typeof Image;

    try {
      expect(() => favicon.setFavicon('assets/favicon.svg')).not.toThrow();
      expect(mockImage.src).toBe('');

      finishPreloadStart(gate);
      loadListeners.forEach((listener) => listener());

      expect(mockImage.src).toBe('https://chat.example.com/assets/favicon.svg');
      expect(dispatchMock).toHaveBeenCalledWith({
        type: WEBVIEW_FAVICON_CHANGED,
        payload: {
          url: 'https://chat.example.com',
          favicon: 'data:image/png;base64,abc',
        },
      });
    } finally {
      global.Image = originalImage;
    }
  });

  it.each([
    ['assets/favicon.svg', 'https://host.example.com/chat/assets/favicon.svg'],
    ['/assets/favicon.svg', 'https://host.example.com/chat/assets/favicon.svg'],
    ['https://cdn.example.com/icon.png', 'https://cdn.example.com/icon.png'],
  ])(
    'keeps the server subpath when it resolves the favicon %s',
    (faviconPath, expected) => {
      const { gate, favicon } = loadModules();
      const mockImage = { src: '', addEventListener: jest.fn() };
      const originalCreateElement = document.createElement.bind(document);
      (
        jest.spyOn(document, 'createElement' as any) as jest.Mock
      ).mockImplementation((tag: string) =>
        tag === 'canvas'
          ? ({ getContext: () => ({}) } as unknown as HTMLElement)
          : originalCreateElement(tag)
      );
      const originalImage = global.Image;
      global.Image = jest.fn(
        () => mockImage as unknown as HTMLImageElement
      ) as unknown as typeof Image;

      try {
        favicon.setFavicon(faviconPath);
        mockServerUrl = 'https://host.example.com/chat';
        gate.markPreloadReady();

        expect(mockImage.src).toBe(expected);
      } finally {
        global.Image = originalImage;
      }
    }
  );

  it('keeps an early login state and does not lose the roles request', async () => {
    const { gate, userLoggedIn } = loadModules();
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ roles: ['user'] }),
    }));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    userLoggedIn.setUserLoggedIn(true);
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    finishPreloadStart(gate);
    // Let the roles request (fetch, then json) settle.
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }

    expect(fetchMock).toHaveBeenCalledWith(
      'https://chat.example.com/api/v1/me',
      expect.anything()
    );
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_LOGGED_IN,
      payload: { url: 'https://chat.example.com', userLoggedIn: true },
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_ROLES_CHANGED,
      payload: { url: 'https://chat.example.com', userRoles: ['user'] },
    });
  });

  it('runs the other early calls when one of them throws', () => {
    const { gate } = loadModules();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const second = jest.fn();

    gate.runWhenPreloadReady('a', () => {
      throw new Error('boom');
    });
    gate.runWhenPreloadReady('b', second);
    gate.markPreloadReady();

    expect(second).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
