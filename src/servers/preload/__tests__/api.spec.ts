const setServerVersionToSidebar = jest.fn();
const setServerUrlResolver = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../../../notifications/preload', () => ({
  createNotification: jest.fn(),
  destroyNotification: jest.fn(),
  dispatchCustomNotification: jest.fn(),
  closeCustomNotification: jest.fn(),
}));

jest.mock('../../../outlookCalendar/preload', () => ({
  getOutlookEvents: jest.fn(),
  setOutlookExchangeUrl: jest.fn(),
  hasOutlookCredentials: jest.fn(),
  clearOutlookCredentials: jest.fn(),
  setUserToken: jest.fn(),
}));

jest.mock('../../../telephony/preload', () => ({
  onTelephonyCallRequested: jest.fn(),
}));

jest.mock('../../../userPresence/preload', () => ({
  setUserPresenceDetection: jest.fn(),
}));

jest.mock('../badge', () => ({ setBadge: jest.fn() }));
jest.mock('../clipboard', () => ({ writeTextToClipboard: jest.fn() }));
jest.mock('../documentViewer', () => ({
  openDocumentViewer: jest.fn(),
  supportedDocumentViewerFormats: jest.fn(),
}));
jest.mock('../e2ePdfPreviewSizeLimit', () => ({
  getE2ePdfPreviewSizeLimit: jest.fn(),
}));
jest.mock('../favicon', () => ({ setFavicon: jest.fn() }));
jest.mock('../gitCommitHash', () => ({ setGitCommitHash: jest.fn() }));
jest.mock('../internalVideoChatWindow', () => ({
  getInternalVideoChatWindowEnabled: jest.fn(),
  openInternalVideoChatWindow: jest.fn(),
}));
jest.mock('../navigateToRoute', () => ({ onNavigateToRoute: jest.fn() }));
jest.mock('../openInBrowser', () => ({ openInBrowser: jest.fn() }));
jest.mock('../reloadServer', () => ({ reloadServer: jest.fn() }));
jest.mock('../sidebar', () => ({
  setBackground: jest.fn(),
  setServerVersionToSidebar: (...args: unknown[]) =>
    setServerVersionToSidebar(...args),
  setSidebarCustomTheme: jest.fn(),
}));
jest.mock('../themeAppearance', () => ({ setUserThemeAppearance: jest.fn() }));
jest.mock('../title', () => ({ setTitle: jest.fn() }));
jest.mock('../urls', () => ({
  setUrlResolver: (...args: unknown[]) => setServerUrlResolver(...args),
  getServerUrl: () => 'https://server.local',
}));
jest.mock('../userLoggedIn', () => ({ setUserLoggedIn: jest.fn() }));
jest.mock('../userRoles', () => ({
  setUserRoles: jest.fn(),
  updateUserRoles: jest.fn(),
  clearUserRoles: jest.fn(),
}));

describe('servers/preload api bridge', () => {
  let RocketChatDesktop: {
    onReady: (callback: (info: unknown) => void) => void;
    setServerInfo: (serverInfo: { version: string }) => void;
    setUrlResolver: (resolver: (url?: string) => string) => void;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    ({ RocketChatDesktop } = await import('../api'));
    setServerVersionToSidebar.mockClear();
    setServerUrlResolver.mockClear();
  });

  it('delivers server info to existing readiness waiters', () => {
    const ready = jest.fn();
    RocketChatDesktop.onReady(ready);
    RocketChatDesktop.setServerInfo({ version: '10.0.0' });

    expect(setServerVersionToSidebar).toHaveBeenCalledWith('10.0.0');
    expect(ready).toHaveBeenCalledWith({ version: '10.0.0' });
  });

  it('calls late waiters immediately when info is already known', () => {
    const ready = jest.fn();
    RocketChatDesktop.setServerInfo({ version: '10.0.1' });
    RocketChatDesktop.onReady(ready);

    expect(ready).toHaveBeenCalledWith({ version: '10.0.1' });
  });

  it('forwards URL resolver registration', () => {
    const resolver = (path?: string): string => `https://server.local${path}`;
    RocketChatDesktop.setUrlResolver(resolver);

    expect(setServerUrlResolver).toHaveBeenCalledWith(resolver);
  });
});
