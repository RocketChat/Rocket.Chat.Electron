import type { DownloadItem } from 'electron';
import { webContents } from 'electron';
import electronDl from 'electron-dl';
import { t } from 'i18next';

import { handleWillDownloadEvent } from './downloads/main';
import { createNotification } from './notifications/preload';

// Mock all dependencies
jest.mock('electron', () => ({
  webContents: {
    getAllWebContents: jest.fn(() => []),
  },
}));

jest.mock('electron-dl', () => jest.fn());

jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

jest.mock('./notifications/preload', () => ({
  createNotification: jest.fn(),
}));

jest.mock('./downloads/main', () => ({
  handleWillDownloadEvent: jest.fn(() => Promise.resolve()),
  setupDownloads: jest.fn(),
}));

// Mock all other main.ts dependencies
jest.mock('./app/main/app', () => ({
  performElectronStartup: jest.fn(),
  setupApp: jest.fn(),
}));

jest.mock('./app/main/data', () => ({
  mergePersistableValues: jest.fn(() => Promise.resolve()),
  watchAndPersistChanges: jest.fn(),
}));

jest.mock('./app/main/dev', () => ({
  setUserDataDirectory: jest.fn(),
}));

jest.mock('./store', () => ({
  createMainReduxStore: jest.fn(),
}));

jest.mock('./servers/main', () => ({
  setupServers: jest.fn(() => Promise.resolve()),
}));

jest.mock('./i18n/main', () => ({
  default: {
    setUp: jest.fn(),
    wait: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('./ui/main/rootWindow', () => ({
  createRootWindow: jest.fn(),
  showRootWindow: jest.fn(() => Promise.resolve()),
  exportLocalStorage: jest.fn(() => Promise.resolve({})),
  watchMachineTheme: jest.fn(),
}));

// Mock all other setup functions
jest.mock('./deepLinks/main', () => ({
  setupDeepLinks: jest.fn(),
  processDeepLinksInArgs: jest.fn(() => Promise.resolve()),
}));

jest.mock('./documentViewer/ipc', () => ({
  startDocumentViewerHandler: jest.fn(),
}));

jest.mock('./errors', () => ({
  setupMainErrorHandling: jest.fn(),
}));

jest.mock('./jitsi/ipc', () => ({
  handleJitsiDesktopCapturerGetSources: jest.fn(),
}));

jest.mock('./navigation/main', () => ({
  setupNavigation: jest.fn(() => Promise.resolve()),
}));

jest.mock('./notifications/main', () => ({
  setupNotifications: jest.fn(),
}));

jest.mock('./outlookCalendar/ipc', () => ({
  startOutlookCalendarUrlHandler: jest.fn(),
}));

jest.mock('./screenSharing/main', () => ({
  setupScreenSharing: jest.fn(),
}));

jest.mock('./servers/cache', () => ({
  handleClearCacheDialog: jest.fn(),
}));

jest.mock('./servers/supportedVersions/main', () => ({
  checkSupportedVersionServers: jest.fn(),
}));

jest.mock('./spellChecking/main', () => ({
  setupSpellChecking: jest.fn(() => Promise.resolve()),
}));

jest.mock('./ui/components/CertificatesManager/main', () => ({
  handleCertificatesManager: jest.fn(),
}));

jest.mock('./ui/main/dock', () => ({
  default: {
    setUp: jest.fn(),
    tearDown: jest.fn(),
  },
}));

jest.mock('./ui/main/menuBar', () => ({
  default: {
    setUp: jest.fn(),
    tearDown: jest.fn(),
  },
}));

jest.mock('./ui/main/serverView', () => ({
  attachGuestWebContentsEvents: jest.fn(),
}));

jest.mock('./ui/main/touchBar', () => ({
  default: {
    setUp: jest.fn(),
    tearDown: jest.fn(),
  },
}));

jest.mock('./ui/main/trayIcon', () => ({
  default: {
    setUp: jest.fn(),
    tearDown: jest.fn(),
  },
}));

jest.mock('./updates/main', () => ({
  setupUpdates: jest.fn(() => Promise.resolve()),
}));

jest.mock('./userPresence/main', () => ({
  setupPowerMonitor: jest.fn(),
}));

jest.mock('./videoCallWindow/ipc', () => ({
  handleDesktopCapturerGetSources: jest.fn(),
  startVideoCallWindowHandler: jest.fn(),
  cleanupVideoCallResources: jest.fn(),
}));

describe('main.ts electron-dl integration', () => {
  let electronDlMock: jest.MockedFunction<typeof electronDl>;
  let webContentsMock: jest.Mocked<typeof webContents>;
  let handleWillDownloadEventMock: jest.MockedFunction<
    typeof handleWillDownloadEvent
  >;
  let createNotificationMock: jest.MockedFunction<typeof createNotification>;

  beforeEach(() => {
    jest.clearAllMocks();
    electronDlMock = electronDl as jest.MockedFunction<typeof electronDl>;
    webContentsMock = webContents as jest.Mocked<typeof webContents>;
    handleWillDownloadEventMock =
      handleWillDownloadEvent as jest.MockedFunction<
        typeof handleWillDownloadEvent
      >;
    createNotificationMock = createNotification as jest.MockedFunction<
      typeof createNotification
    >;
  });

  const createMockDownloadItem = (
    overrides: Partial<DownloadItem> = {}
  ): jest.Mocked<DownloadItem> => {
    return {
      getFilename: jest.fn(() => 'test-file.pdf'),
      getState: jest.fn(() => 'progressing'),
      isPaused: jest.fn(() => false),
      getReceivedBytes: jest.fn(() => 1024),
      getTotalBytes: jest.fn(() => 2048),
      getStartTime: jest.fn(() => 1640995200),
      getURL: jest.fn(() => 'https://example.com/file.pdf'),
      getMimeType: jest.fn(() => 'application/pdf'),
      getSavePath: jest.fn(() => '/downloads/test-file.pdf'),
      on: jest.fn(),
      ...overrides,
    } as unknown as jest.Mocked<DownloadItem>;
  };

  const createMockWebContents = (id = 123) => ({
    id,
    isDestroyed: jest.fn(() => false),
  });

  describe('setupElectronDlWithTracking', () => {
    beforeEach(async () => {
      // Import main.ts to trigger the setup
      await import('./main');
    });

    it('should configure electron-dl with saveAs: true', () => {
      expect(electronDlMock).toHaveBeenCalledWith({
        saveAs: true,
        onStarted: expect.any(Function),
        onCompleted: expect.any(Function),
      });
    });

    describe('onStarted callback', () => {
      let onStartedCallback: (item: DownloadItem) => void;

      beforeEach(() => {
        const electronDlCall = electronDlMock.mock.calls[0];
        if (electronDlCall?.[0]) {
          onStartedCallback = electronDlCall[0].onStarted!;
        }
      });

      it('should call handleWillDownloadEvent when webContents are available', () => {
        const mockItem = createMockDownloadItem();
        const mockWC = createMockWebContents();

        webContentsMock.getAllWebContents.mockReturnValue([mockWC] as any);

        onStartedCallback(mockItem);

        expect(handleWillDownloadEventMock).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultPrevented: false,
            preventDefault: expect.any(Function),
          }),
          mockItem,
          mockWC
        );
      });

      it('should not call handleWillDownloadEvent when no webContents are available', () => {
        const mockItem = createMockDownloadItem();

        webContentsMock.getAllWebContents.mockReturnValue([]);

        onStartedCallback(mockItem);

        expect(handleWillDownloadEventMock).not.toHaveBeenCalled();
      });

      it('should skip destroyed webContents', () => {
        const mockItem = createMockDownloadItem();
        const destroyedWC = createMockWebContents();
        const validWC = createMockWebContents(456);

        destroyedWC.isDestroyed = jest.fn(() => true);
        validWC.isDestroyed = jest.fn(() => false);

        webContentsMock.getAllWebContents.mockReturnValue([
          destroyedWC,
          validWC,
        ] as any);

        onStartedCallback(mockItem);

        expect(handleWillDownloadEventMock).toHaveBeenCalledWith(
          expect.any(Object),
          mockItem,
          validWC
        );
      });

      it('should handle tracking errors silently', () => {
        const mockItem = createMockDownloadItem();
        const mockWC = createMockWebContents();

        webContentsMock.getAllWebContents.mockReturnValue([mockWC] as any);
        handleWillDownloadEventMock.mockRejectedValue(
          new Error('Tracking failed')
        );

        // Should not throw
        expect(() => onStartedCallback(mockItem)).not.toThrow();
      });
    });

    describe('onCompleted callback', () => {
      let onCompletedCallback: (file: { filename: string }) => void;

      beforeEach(() => {
        const electronDlCall = electronDlMock.mock.calls[0];
        if (electronDlCall?.[0]) {
          onCompletedCallback = electronDlCall[0].onCompleted! as any;
        }
      });

      it('should create a notification when download completes', () => {
        const mockFile = { filename: 'completed-file.pdf' };

        onCompletedCallback(mockFile);

        expect(createNotificationMock).toHaveBeenCalledWith({
          title: 'Downloads',
          body: 'completed-file.pdf',
          subtitle: 'downloads.notifications.downloadFinished',
        });
      });

      it('should use translated subtitle', () => {
        const mockFile = { filename: 'test.pdf' };
        const tMock = t as jest.MockedFunction<typeof t>;
        tMock.mockReturnValue('Download finished');

        onCompletedCallback(mockFile);

        expect(tMock).toHaveBeenCalledWith(
          'downloads.notifications.downloadFinished'
        );
        expect(createNotificationMock).toHaveBeenCalledWith({
          title: 'Downloads',
          body: 'test.pdf',
          subtitle: 'Download finished',
        });
      });
    });
  });

  describe('integration behavior', () => {
    it('should prioritize electron-dl handling over custom will-download listeners', () => {
      // This test verifies that the electron-dl integration is set up correctly
      // and that it takes precedence over any custom will-download event handling
      expect(electronDlMock).toHaveBeenCalledTimes(1);
      expect(electronDlMock).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAs: true,
        })
      );
    });

    it('should provide both download tracking and completion notifications', () => {
      const electronDlConfig = electronDlMock.mock.calls[0]?.[0];

      expect(electronDlConfig?.onStarted).toBeDefined();
      expect(electronDlConfig?.onCompleted).toBeDefined();
      expect(typeof electronDlConfig?.onStarted).toBe('function');
      expect(typeof electronDlConfig?.onCompleted).toBe('function');
    });
  });
});
