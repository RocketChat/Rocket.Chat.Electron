/** @jest-environment jsdom */
import { ipcRenderer } from 'electron';

import { safeSelect } from '../../../store';
import { openExternal } from '../../../utils/browserLauncher';
import {
  getInternalVideoChatWindowEnabled,
  openInternalVideoChatWindow,
} from '../internalVideoChatWindow';

jest.mock('../../../store', () => ({
  safeSelect: jest.fn(),
}));

jest.mock('../../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

const safeSelectMock = safeSelect as jest.MockedFunction<typeof safeSelect>;
const openExternalMock = openExternal as jest.MockedFunction<
  typeof openExternal
>;
const invokeMock = ipcRenderer.invoke as jest.MockedFunction<
  typeof ipcRenderer.invoke
>;

describe('servers/preload/internalVideoChatWindow', () => {
  const processMasDescriptor = Object.getOwnPropertyDescriptor(process, 'mas');

  const setProcessMas = (value: boolean): void => {
    Object.defineProperty(process, 'mas', {
      value,
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    safeSelectMock.mockReset();
    openExternalMock.mockReset();
    invokeMock.mockReset();
    safeSelectMock.mockReturnValue(undefined);
    localStorage.clear();
    setProcessMas(false);
  });

  afterEach(() => {
    if (processMasDescriptor) {
      Object.defineProperty(process, 'mas', processMasDescriptor);
    }
  });

  it('reads the enablement selector and defaults to false', () => {
    expect(getInternalVideoChatWindowEnabled()).toBe(false);
  });

  it('falls back to external open when internal video chat is disabled', () => {
    safeSelectMock.mockReturnValue(false);

    openInternalVideoChatWindow('https://chat.example', {
      providerName: 'jitsi',
    });

    expect(openExternalMock).toHaveBeenCalledWith('https://chat.example/');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('falls back to external open when running from MAS build', () => {
    safeSelectMock.mockReturnValue(true);
    setProcessMas(true);

    openInternalVideoChatWindow('https://chat.example', {
      providerName: 'googlemeet',
    });

    expect(openExternalMock).toHaveBeenCalledWith('https://chat.example/');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('opens jitsi calls on the dedicated invoke path', () => {
    safeSelectMock.mockReturnValue(true);

    openInternalVideoChatWindow('https://chat.example', {
      providerName: 'jitsi',
    });

    expect(invokeMock).toHaveBeenCalledWith(
      'video-call-window/open-window',
      'https://chat.example/',
      { providerName: 'jitsi' }
    );
    expect(openExternalMock).not.toHaveBeenCalled();
  });

  it('falls back to external open for google meet', () => {
    safeSelectMock.mockReturnValue(true);

    openInternalVideoChatWindow('https://chat.example', {
      providerName: 'googlemeet',
    });

    expect(openExternalMock).toHaveBeenCalledWith('https://chat.example/');
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('passes selector callback through to resolve the feature flag', () => {
    safeSelectMock.mockImplementation((selector) =>
      selector({
        isInternalVideoChatWindowEnabled: true,
      } as never)
    );

    openInternalVideoChatWindow('https://chat.example', undefined);

    expect(invokeMock).toHaveBeenCalledWith(
      'video-call-window/open-window',
      'https://chat.example/',
      undefined
    );
  });

  it('returns early for unsupported protocols', () => {
    safeSelectMock.mockReturnValue(true);

    openInternalVideoChatWindow('ftp://chat.example', {
      providerName: 'jitsi',
    });

    expect(openExternalMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('injects pexip credentials from localStorage when enabled', () => {
    safeSelectMock.mockReturnValue(true);
    localStorage.setItem('Meteor.loginToken', 'token-123');
    localStorage.setItem('Meteor.userId', 'user-456');

    openInternalVideoChatWindow('https://chat.example', {
      providerName: 'pexip',
    });

    expect(invokeMock).toHaveBeenCalledWith(
      'video-call-window/open-window',
      'https://chat.example/',
      {
        providerName: 'pexip',
        credentials: {
          userId: 'user-456',
          authToken: 'token-123',
        },
      }
    );
  });

  it('keeps pexip options unchanged when credentials are unavailable', () => {
    safeSelectMock.mockReturnValue(true);
    localStorage.removeItem('Meteor.loginToken');
    localStorage.removeItem('Meteor.userId');

    openInternalVideoChatWindow('https://chat.example', {
      providerName: 'pexip',
    });

    expect(invokeMock).toHaveBeenCalledWith(
      'video-call-window/open-window',
      'https://chat.example/',
      {
        providerName: 'pexip',
      }
    );
  });

  it('throws for invalid URLs', () => {
    safeSelectMock.mockReturnValue(true);

    expect(() => {
      openInternalVideoChatWindow('notaurl', undefined);
    }).toThrow();

    expect(openExternalMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
