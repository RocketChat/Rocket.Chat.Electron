import type { WebContents } from 'electron';

import type { ScreenPickerProvider } from '../screenPicker/types';

jest.mock('../desktopCapturerCache', () => ({
  prewarmDesktopCapturerCache: jest.fn(),
  prewarmDesktopCapturerCacheIfPermitted: jest.fn(),
}));

jest.mock('../../ipc/main', () => ({
  handle: jest.fn(),
}));

jest.mock('../../navigation/main', () => ({
  isProtocolAllowed: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

jest.mock('../screenRecordingPermission', () => ({
  checkScreenRecordingPermission: jest.fn(() => Promise.resolve(true)),
}));

const portalProvider: ScreenPickerProvider = {
  type: 'portal',
  requiresInternalUI: false,
  requiresCacheWarming: false,
  handleDisplayMediaRequest: jest.fn(),
  initialize: jest.fn(() => Promise.resolve()),
  cleanup: jest.fn(),
};

const internalProvider: ScreenPickerProvider = {
  type: 'internal',
  requiresInternalUI: true,
  requiresCacheWarming: true,
  handleDisplayMediaRequest: jest.fn(),
  initialize: jest.fn(() => Promise.resolve()),
  cleanup: jest.fn(),
};

const detectPickerType = jest.fn();

class PortalPickerProvider {
  type = portalProvider.type;

  requiresInternalUI = portalProvider.requiresInternalUI;

  requiresCacheWarming = portalProvider.requiresCacheWarming;

  handleDisplayMediaRequest = portalProvider.handleDisplayMediaRequest;

  initialize = portalProvider.initialize;

  cleanup = portalProvider.cleanup;
}

class InternalPickerProvider {
  type = internalProvider.type;

  requiresInternalUI = internalProvider.requiresInternalUI;

  requiresCacheWarming = internalProvider.requiresCacheWarming;

  handleDisplayMediaRequest = internalProvider.handleDisplayMediaRequest;

  initialize = internalProvider.initialize;

  cleanup = internalProvider.cleanup;

  setHandleRequestHandler = jest.fn();
}

jest.mock('../screenPicker', () => ({
  detectPickerType: () => detectPickerType(),
  PortalPickerProvider,
  InternalPickerProvider,
}));

const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const createGuestWebContents = () => {
  const setDisplayMediaRequestHandler = jest.fn();
  return {
    webContents: {
      session: { setDisplayMediaRequestHandler },
      isDestroyed: jest.fn(() => false),
    } as unknown as WebContents,
    setDisplayMediaRequestHandler,
  };
};

const loadModule = async () => {
  const sut = await import('../serverViewScreenSharing');
  const cache = await import('../desktopCapturerCache');
  return {
    setupServerViewDisplayMedia: sut.setupServerViewDisplayMedia,
    prewarmMock: cache.prewarmDesktopCapturerCacheIfPermitted as jest.Mock,
  };
};

describe('setupServerViewDisplayMedia — cache warming gate', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('skips the cache warm-up for portal provider (Linux/Wayland)', async () => {
    detectPickerType.mockReturnValue('portal');
    const { setupServerViewDisplayMedia, prewarmMock } = await loadModule();

    const guest = createGuestWebContents();
    setupServerViewDisplayMedia(guest.webContents);

    await flushPromises();
    await flushPromises();

    expect(guest.setDisplayMediaRequestHandler).toHaveBeenCalledTimes(1);
    expect(guest.setDisplayMediaRequestHandler.mock.calls[0][1]).toEqual({
      useSystemPicker: false,
    });
    expect(prewarmMock).not.toHaveBeenCalled();
  });

  it('warms the cache through the permission-gated prewarm for internal provider', async () => {
    detectPickerType.mockReturnValue('internal');
    const { setupServerViewDisplayMedia, prewarmMock } = await loadModule();

    const guest = createGuestWebContents();
    setupServerViewDisplayMedia(guest.webContents);

    await flushPromises();
    await flushPromises();

    expect(guest.setDisplayMediaRequestHandler).toHaveBeenCalledTimes(1);
    expect(prewarmMock).toHaveBeenCalledTimes(1);
  });

  it('does not register handler when guest webContents is destroyed before init resolves', async () => {
    detectPickerType.mockReturnValue('portal');
    const { setupServerViewDisplayMedia, prewarmMock } = await loadModule();

    const guest = createGuestWebContents();
    (guest.webContents.isDestroyed as jest.Mock).mockReturnValue(true);
    setupServerViewDisplayMedia(guest.webContents);

    await flushPromises();
    await flushPromises();

    expect(guest.setDisplayMediaRequestHandler).not.toHaveBeenCalled();
    expect(prewarmMock).not.toHaveBeenCalled();
  });
});

describe('screen-picker/open-url', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const getOpenUrlHandler = async () => {
    const sut = await import('../serverViewScreenSharing');
    const { handle } = (await import('../../ipc/main')) as any;
    sut.startServerViewScreenSharingHandler();
    return handle.mock.calls.find(
      ([channel]: [string]) => channel === 'screen-picker/open-url'
    )?.[1] as (webContents: WebContents, url: string) => Promise<void>;
  };

  it('opens the screen recording settings without asking about the protocol', async () => {
    const openUrl = await getOpenUrlHandler();
    const { isProtocolAllowed } = (await import(
      '../../navigation/main'
    )) as any;
    const { openExternal } = (await import(
      '../../utils/browserLauncher'
    )) as any;

    await openUrl(
      {} as WebContents,
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    );

    expect(isProtocolAllowed).not.toHaveBeenCalled();
    expect(openExternal).toHaveBeenCalledWith(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    );
  });

  it('still asks before it opens another non-web link', async () => {
    const openUrl = await getOpenUrlHandler();
    const { isProtocolAllowed } = (await import(
      '../../navigation/main'
    )) as any;
    const { openExternal } = (await import(
      '../../utils/browserLauncher'
    )) as any;
    isProtocolAllowed.mockResolvedValueOnce(false);

    await openUrl({} as WebContents, 'file:///etc/hosts');

    expect(isProtocolAllowed).toHaveBeenCalledWith('file:///etc/hosts');
    expect(openExternal).not.toHaveBeenCalled();
  });
});
