/** @jest-environment jsdom */
import { dispatch } from '../../../store';
import { WEBVIEW_FAVICON_CHANGED } from '../../../ui/actions';
import type * as FaviconModule from '../favicon';
import { getAbsoluteUrl, getServerUrl } from '../urls';

// These cases cover a ready preload. whenPreloadReady.spec.ts covers early calls.
jest.mock('../whenPreloadReady', () => ({
  runWhenPreloadReady: (_key: string, fn: () => void) => fn(),
}));

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../urls', () => ({
  getAbsoluteUrl: jest.fn(),
  getServerUrl: jest.fn(),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getAbsoluteUrlMock = getAbsoluteUrl as jest.MockedFunction<
  typeof getAbsoluteUrl
>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<
  typeof getServerUrl
>;

const loadModule = (): typeof FaviconModule => {
  let mod: typeof FaviconModule;
  jest.isolateModules(() => {
    mod = require('../favicon');
  });
  return mod!;
};

describe('servers/preload/favicon', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    dispatchMock.mockClear();
    getAbsoluteUrlMock.mockReturnValue('https://cdn.local/favicon.png');
    getServerUrlMock.mockReturnValue('https://server.local');
  });

  it('dispatches favicon data when the image finishes loading', () => {
    const loadListeners: Array<() => void> = [];
    const mockImage = {
      _src: '',
      addEventListener: jest.fn((event: string, listener: () => void) => {
        if (event === 'load') {
          loadListeners.push(listener);
        }
      }),
      set src(_value: string) {
        mockImage._src = _value;
      },
      get src() {
        return mockImage._src;
      },
    } as Record<string, unknown> & { _src: string };

    const ctxMock = {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
    };
    const mockCanvas: Record<string, unknown> = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => ctxMock),
      toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
      add: jest.fn(),
    };

    const originalCreateElement = document.createElement.bind(document);
    (
      jest.spyOn(document, 'createElement' as any) as jest.Mock
    ).mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return mockCanvas as unknown as HTMLElement;
      }
      return originalCreateElement(tag);
    });

    global.Image = jest.fn(() => mockImage as unknown as HTMLImageElement);

    const { setFavicon } = loadModule();

    setFavicon('favicon.png');
    loadListeners.forEach((listener) => listener());

    expect(mockImage.src).toBe('https://cdn.local/favicon.png');
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_FAVICON_CHANGED,
      payload: {
        url: 'https://server.local',
        favicon: 'data:image/png;base64,abc',
      },
    });
  });

  describe('when the web client sets a URL resolver', () => {
    const originalImage = global.Image;

    afterEach(() => {
      global.Image = originalImage;
    });

    const stubImage = (): { src: string } => {
      const mockImage = { src: '', addEventListener: jest.fn() };
      const originalCreateElement = document.createElement.bind(document);
      (
        jest.spyOn(document, 'createElement' as any) as jest.Mock
      ).mockImplementation((tag: string) =>
        tag === 'canvas'
          ? ({ getContext: () => ({}) } as unknown as HTMLElement)
          : originalCreateElement(tag)
      );
      global.Image = jest.fn(
        () => mockImage as unknown as HTMLImageElement
      ) as unknown as typeof Image;
      return mockImage;
    };

    beforeEach(() => {
      getAbsoluteUrlMock.mockReset();
      getAbsoluteUrlMock.mockImplementation(
        (path = '') => `https://server.local/chat/${path.replace(/^\/+/, '')}`
      );
    });

    it.each([
      ['https://server.local/images/logo/icon.svg'],
      ['https://server.local/chat/assets/favicon.svg'],
      ['http://cdn.local/favicon.png'],
      ['data:image/png;base64,abc'],
    ])('uses the absolute URL %s as it is', (faviconUrl) => {
      const mockImage = stubImage();
      const { setFavicon } = loadModule();

      setFavicon(faviconUrl);

      expect(mockImage.src).toBe(faviconUrl);
      expect(getAbsoluteUrlMock).not.toHaveBeenCalled();
    });

    it.each([
      ['assets/favicon.svg', 'https://server.local/chat/assets/favicon.svg'],
      [
        '/images/logo/icon.svg',
        'https://server.local/chat/images/logo/icon.svg',
      ],
    ])(
      'resolves the relative path %s through the resolver',
      (faviconPath, expected) => {
        const mockImage = stubImage();
        const { setFavicon } = loadModule();

        setFavicon(faviconPath);

        expect(getAbsoluteUrlMock).toHaveBeenCalledWith(faviconPath);
        expect(mockImage.src).toBe(expected);
      }
    );
  });

  it('ignores non-string URLs', () => {
    const { setFavicon } = loadModule();

    expect(() => setFavicon(undefined as unknown as string)).not.toThrow();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('throws when canvas context is unavailable', () => {
    const originalCreateElement = document.createElement.bind(document);
    (
      jest.spyOn(document, 'createElement' as any) as jest.Mock
    ).mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: jest.fn(() => null),
        } as unknown as HTMLElement;
      }

      return originalCreateElement(tag);
    });

    const { setFavicon } = loadModule();

    expect(() => setFavicon('favicon.png')).toThrow(
      'failed to create canvas 2d context'
    );
  });
});
