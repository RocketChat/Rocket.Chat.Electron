// Tests for notifyBundleAutoupdate sentinel behaviour (Bug 1 fix).
// Heavy dependencies of api.ts are mocked so only the autoupdate path is exercised.

const mockSetServerBuildSignals = jest.fn();

jest.mock('./serverBuild', () => ({
  setServerBuildSignals: mockSetServerBuildSignals,
  flushPendingBuildSignal: jest.fn(),
}));

// Stub every other import pulled in by api.ts
jest.mock('../../notifications/preload', () => ({
  createNotification: jest.fn(),
  destroyNotification: jest.fn(),
  dispatchCustomNotification: jest.fn(),
  closeCustomNotification: jest.fn(),
}));
jest.mock('../../outlookCalendar/preload', () => ({
  getOutlookEvents: jest.fn(),
  setOutlookExchangeUrl: jest.fn(),
  hasOutlookCredentials: jest.fn(),
  clearOutlookCredentials: jest.fn(),
  setUserToken: jest.fn(),
}));
jest.mock('../../userPresence/preload', () => ({ setUserPresenceDetection: jest.fn() }));
jest.mock('./badge', () => ({ setBadge: jest.fn() }));
jest.mock('./clipboard', () => ({ writeTextToClipboard: jest.fn() }));
jest.mock('./documentViewer', () => ({ openDocumentViewer: jest.fn() }));
jest.mock('./favicon', () => ({ setFavicon: jest.fn() }));
jest.mock('./gitCommitHash', () => ({ setGitCommitHash: jest.fn() }));
jest.mock('./internalVideoChatWindow', () => ({
  getInternalVideoChatWindowEnabled: jest.fn(),
  openInternalVideoChatWindow: jest.fn(),
}));
jest.mock('./reloadServer', () => ({ reloadServer: jest.fn() }));
jest.mock('./sidebar', () => ({
  setBackground: jest.fn(),
  setServerVersionToSidebar: jest.fn(),
  setSidebarCustomTheme: jest.fn(),
}));
jest.mock('./title', () => ({ setTitle: jest.fn() }));
jest.mock('./urls', () => ({ setUrlResolver: jest.fn(), getServerUrl: jest.fn() }));
jest.mock('./userLoggedIn', () => ({ setUserLoggedIn: jest.fn() }));
jest.mock('./themeAppearance', () => ({ setUserThemeAppearance: jest.fn() }));

describe('notifyBundleAutoupdate', () => {
  beforeEach(() => {
    mockSetServerBuildSignals.mockClear();
  });

  it('forwards a concrete bundleVersion as-is with buildIdSource=autoupdate', () => {
    const { RocketChatDesktop: api } = require('./api');
    api.notifyBundleAutoupdate({ bundleVersion: '1.2.3-bundle.abc' });

    expect(mockSetServerBuildSignals).toHaveBeenCalledTimes(1);
    expect(mockSetServerBuildSignals).toHaveBeenCalledWith({
      buildId: '1.2.3-bundle.abc',
      buildIdSource: 'autoupdate',
    });
  });

  it('synthesizes an autoupdate- sentinel when bundleVersion is undefined', () => {
    const { RocketChatDesktop: api } = require('./api');
    api.notifyBundleAutoupdate({});

    expect(mockSetServerBuildSignals).toHaveBeenCalledTimes(1);
    const call = mockSetServerBuildSignals.mock.calls[0][0];
    expect(call.buildIdSource).toBe('autoupdate');
    expect(call.buildId).toMatch(/^autoupdate-\d+$/);
  });

  it('synthesizes an autoupdate- sentinel when bundleVersion is an empty string', () => {
    const { RocketChatDesktop: api } = require('./api');
    api.notifyBundleAutoupdate({ bundleVersion: '' });

    expect(mockSetServerBuildSignals).toHaveBeenCalledTimes(1);
    const call = mockSetServerBuildSignals.mock.calls[0][0];
    expect(call.buildIdSource).toBe('autoupdate');
    expect(call.buildId).toMatch(/^autoupdate-\d+$/);
  });

  it('always dispatches — never early-returns — regardless of bundleVersion', () => {
    const { RocketChatDesktop: api } = require('./api');
    api.notifyBundleAutoupdate({ bundleVersion: undefined });
    api.notifyBundleAutoupdate({ bundleVersion: 'v1' });
    api.notifyBundleAutoupdate({});

    expect(mockSetServerBuildSignals).toHaveBeenCalledTimes(3);
  });
});
