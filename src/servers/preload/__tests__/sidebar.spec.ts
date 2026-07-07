/** @jest-environment jsdom */
import { dispatch } from '../../../store';
import {
  WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED,
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
} from '../../../ui/actions';
import { getAbsoluteUrl, getServerUrl } from '../urls';

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
const getServerUrlMock = getServerUrl as jest.MockedFunction<typeof getServerUrl>;

const loadModule = (): typeof import('../sidebar') => {
  let mod: typeof import('../sidebar');
  jest.isolateModules(() => {
    mod = require('../sidebar');
  });
  return mod!;
};

describe('servers/preload/sidebar', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    dispatchMock.mockClear();
    getAbsoluteUrlMock.mockReturnValue('https://cdn.local/logo.png');
    getServerUrlMock.mockReturnValue('https://server.local');
  });

  it('disables sidebar style polling timer side-effect while dispatching initial values', () => {
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as unknown as NodeJS.Timeout);

    const removeSpy = jest.fn();
    const appendSpy = jest.spyOn(document.body, 'append').mockImplementation();
    const classListAddMock = jest.fn();
    const mockElement: Record<string, unknown> = {
      style: {},
      remove: removeSpy,
      classList: {
        add: classListAddMock,
      },
    };
    const originalCreateElement = document.createElement.bind(document);
    (
      jest.spyOn(document, 'createElement' as any) as jest.Mock
    ).mockImplementation((tag: string) => {
      if (tag === 'div') {
        return mockElement as unknown as HTMLElement;
      }
      return originalCreateElement(tag);
    });

    const getComputedStyleSpy = jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        background: 'rgb(10, 20, 30)',
        color: 'rgb(40, 50, 60)',
        border: '1px solid #123456',
      } as CSSStyleDeclaration);

    const { setServerVersionToSidebar, setBackground } = loadModule();

    setServerVersionToSidebar('6.4.0');
    setBackground('logo.png');

    expect(classListAddMock).toHaveBeenCalledWith('rcx-sidebar--main');
    expect(mockElement.style).toMatchObject({
      backgroundImage: 'url("https://cdn.local/logo.png")',
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_SIDEBAR_STYLE_CHANGED,
      payload: {
        url: 'https://server.local',
        style: {
          background: 'rgb(10, 20, 30)',
          color: 'rgb(40, 50, 60)',
          border: '1px solid #123456',
        },
      },
    });

    expect(appendSpy).toHaveBeenCalledWith(mockElement as never);
    expect(removeSpy).toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalled();

    appendSpy.mockRestore();
    setTimeoutSpy.mockRestore();
    getComputedStyleSpy.mockRestore();
  });

  it('uses the legacy sidebar class for older versions', () => {
    const classListAddMock = jest.fn();
    const mockElement: Record<string, unknown> = {
      style: {},
      remove: jest.fn(),
      classList: {
        add: classListAddMock,
      },
    };
    const originalCreateElement = document.createElement.bind(document);
    (
      jest.spyOn(document, 'createElement' as any) as jest.Mock
    ).mockImplementation((tag: string) => {
      if (tag === 'div') {
        return mockElement as unknown as HTMLElement;
      }
      return originalCreateElement(tag);
    });
    jest.spyOn(document.body, 'append').mockImplementation();
    jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        background: 'rgb(10, 20, 30)',
        color: 'rgb(40, 50, 60)',
        border: '1px solid #123456',
      } as CSSStyleDeclaration);
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as unknown as NodeJS.Timeout);

    const { setServerVersionToSidebar, setBackground } = loadModule();

    setServerVersionToSidebar('6.2.0');
    setBackground('logo.png');

    expect(classListAddMock).toHaveBeenCalledWith('sidebar');
  });

  it('falls through the compare function when versions are equivalent', () => {
    const classListAddMock = jest.fn();
    const mockElement: Record<string, unknown> = {
      style: {},
      remove: jest.fn(),
      classList: {
        add: classListAddMock,
      },
    };
    const originalCreateElement = document.createElement.bind(document);
    (
      jest.spyOn(document, 'createElement' as any) as jest.Mock
    ).mockImplementation((tag: string) => {
      if (tag === 'div') {
        return mockElement as unknown as HTMLElement;
      }
      return originalCreateElement(tag);
    });
    jest.spyOn(document.body, 'append').mockImplementation();
    jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        background: 'rgb(10, 20, 30)',
        color: 'rgb(40, 50, 60)',
        border: '1px solid #123456',
      } as CSSStyleDeclaration);
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as unknown as NodeJS.Timeout);

    const { setServerVersionToSidebar, setBackground } = loadModule();

    setServerVersionToSidebar('6.3.0');
    setBackground('logo.png');

    expect(classListAddMock).toHaveBeenCalledWith('rcx-sidebar--main');
  });

  it('treats non-semver versions as older and uses the legacy class', () => {
    const classListAddMock = jest.fn();
    const mockElement: Record<string, unknown> = {
      style: {},
      remove: jest.fn(),
      classList: {
        add: classListAddMock,
      },
    };

    jest.spyOn(document, 'createElement' as any).mockReturnValue(
      mockElement as unknown as HTMLElement
    );
    jest.spyOn(document.body, 'append').mockImplementation();
    jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        background: 'rgb(10, 20, 30)',
        color: 'rgb(40, 50, 60)',
        border: '1px solid #123456',
      } as CSSStyleDeclaration);
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as unknown as NodeJS.Timeout);

    const { setServerVersionToSidebar, setBackground } = loadModule();

    setServerVersionToSidebar('latest');
    setBackground('logo.png');

    expect(classListAddMock).toHaveBeenCalledWith('sidebar');
  });

  it('uses fallback parsing when the comparison version cannot be tokenized', () => {
    const classListAddMock = jest.fn();
    const mockElement: Record<string, unknown> = {
      style: {},
      remove: jest.fn(),
      classList: {
        add: classListAddMock,
      },
    };
    const originalMatch = String.prototype.match;
    jest.spyOn(String.prototype, 'match').mockImplementation(function (
      this: string,
      matcher: Parameters<String['match']>[0]
    ) {
      if (this === '6.3.0') {
        return null;
      }

      return originalMatch.call(this, matcher);
    });

    jest.spyOn(document, 'createElement' as any).mockReturnValue(
      mockElement as unknown as HTMLElement
    );
    jest.spyOn(document.body, 'append').mockImplementation();
    jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        background: 'rgb(10, 20, 30)',
        color: 'rgb(40, 50, 60)',
        border: '1px solid #123456',
      } as CSSStyleDeclaration);
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as unknown as NodeJS.Timeout);

    const { setServerVersionToSidebar, setBackground } = loadModule();
    setServerVersionToSidebar('6.4.0');
    setBackground('logo.png');

    expect(classListAddMock).toHaveBeenCalledWith('rcx-sidebar--main');
  });

  it('does not dispatch sidebar style changes when style values are unchanged', () => {
    const callbacks: Array<() => void> = [];
    const mockElement: Record<string, unknown> = {
      style: {},
      remove: jest.fn(),
      classList: {
        add: jest.fn(),
      },
    };

    jest.spyOn(document, 'createElement' as any).mockReturnValue(
      mockElement as unknown as HTMLElement
    );
    jest.spyOn(document.body, 'append').mockImplementation();
    jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        background: 'rgb(11, 22, 33)',
        color: 'rgb(44, 55, 66)',
        border: '1px solid #123456',
      } as CSSStyleDeclaration);
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
      callbacks.push(cb);
      return 0 as unknown as NodeJS.Timeout;
    });

    const { setServerVersionToSidebar, setBackground } = loadModule();
    setServerVersionToSidebar('6.4.0');
    setBackground('logo.png');

    expect(dispatchMock).toHaveBeenCalledTimes(1);

    const scheduledPoll = callbacks.shift();
    if (scheduledPoll) {
      scheduledPoll();
    }

    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });

  it('clears sidebar background when image URL is empty', () => {
    const mockElement: Record<string, unknown> = {
      style: {},
      remove: jest.fn(),
      classList: {
        add: jest.fn(),
      },
    };

    jest.spyOn(document, 'createElement' as any).mockReturnValue(
      mockElement as unknown as HTMLElement
    );
    jest.spyOn(document.body, 'append').mockImplementation();
    jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        background: 'rgb(11, 22, 33)',
        color: 'rgb(44, 55, 66)',
        border: '1px solid #123456',
      } as CSSStyleDeclaration);
    jest.spyOn(global, 'setTimeout').mockImplementation(() => 0 as unknown as NodeJS.Timeout);

    const { setServerVersionToSidebar, setBackground } = loadModule();
    setServerVersionToSidebar('6.4.0');
    setBackground('');

    expect((mockElement.style as Record<string, string>).backgroundImage).toBe('none');
  });

  it('dispatches custom theme updates', () => {
    const { setSidebarCustomTheme } = loadModule();

    setSidebarCustomTheme('dark');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED,
      payload: {
        url: 'https://server.local',
        customTheme: 'dark',
      },
    });
  });
});
