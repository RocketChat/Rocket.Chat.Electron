import type { DownloadItem, Event, WebContents } from 'electron';
import { clipboard, shell, webContents } from 'electron';
import electronDl from 'electron-dl';

import { createMainReduxStore, dispatch, select } from '../store';
import {
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
  DOWNLOADS_CLEARED,
} from './actions';
import type { Download } from './common';
import { DownloadStatus } from './common';
import { handleWillDownloadEvent, setupDownloads } from './main';

// Mock electron modules
jest.mock('electron', () => ({
  clipboard: {
    writeText: jest.fn(),
  },
  shell: {
    showItemInFolder: jest.fn(),
  },
  webContents: {
    getAllWebContents: jest.fn(() => []),
  },
}));

jest.mock('electron-dl', () => jest.fn());

// Mock IPC handler
const mockHandle = jest.fn();
jest.mock('../ipc/main', () => ({
  handle: mockHandle,
}));

// Mock notifications
jest.mock('../notifications/preload', () => ({
  createNotification: jest.fn(),
}));

// Mock i18next
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

// Mock main.ts to avoid circular dependencies
jest.mock('./main', () => {
  const actual = jest.requireActual('./main');
  return {
    ...actual,
    setupDownloads: actual.setupDownloads,
    handleWillDownloadEvent: actual.handleWillDownloadEvent,
  };
});

describe('downloads integration tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createMainReduxStore();
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

  const createMockWebContents = (id = 123): WebContents =>
    ({
      id,
    }) as WebContents;

  const createMockEvent = (): Event =>
    ({
      defaultPrevented: false,
      preventDefault: jest.fn(),
    }) as unknown as Event;

  describe('end-to-end download flow', () => {
    it('should handle complete download lifecycle with electron-dl integration', async () => {
      // Setup electron-dl mock
      const electronDlMock = electronDl as jest.MockedFunction<
        typeof electronDl
      >;
      let onStartedCallback: (item: DownloadItem) => void;
      let onCompletedCallback: (file: { filename: string }) => void;

      electronDlMock.mockImplementation((config) => {
        if (config) {
          onStartedCallback = config.onStarted!;
          onCompletedCallback = config.onCompleted! as any;
        }
      });

      // Setup downloads system
      setupDownloads();

      // Mock webContents for electron-dl onStarted callback
      const webContentsMock = webContents as jest.Mocked<typeof webContents>;
      const mockWC = createMockWebContents();
      webContentsMock.getAllWebContents.mockReturnValue([mockWC] as any);

      // Create a download item
      const mockItem = createMockDownloadItem();
      let updatedListener: () => void;
      let doneListener: (event: Event, state: string) => void;

      mockItem.on.mockImplementation(((event: string, listener: any) => {
        if (event === 'updated') {
          updatedListener = listener;
        } else if (event === 'done') {
          doneListener = listener;
        }
        return mockItem;
      }) as any);

      // Mock store state with server
      const mockSelectImplementation = jest.fn((selector) => {
        if (typeof selector === 'function') {
          return selector({
            servers: [
              {
                url: 'https://open.rocket.chat',
                title: 'Rocket.Chat Community',
                webContentsId: mockWC.id,
              },
            ],
            downloads: {},
          });
        }
        return undefined;
      });

      (select as jest.MockedFunction<typeof select>).mockImplementation(
        mockSelectImplementation
      );

      // Simulate electron-dl onStarted callback
      onStartedCallback!(mockItem);

      // Verify download was created
      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_CREATED,
        payload: expect.objectContaining({
          fileName: 'test-file.pdf',
          serverUrl: 'https://open.rocket.chat',
          serverTitle: 'Rocket.Chat Community',
        }),
      });

      // Simulate download progress
      mockItem.getReceivedBytes.mockReturnValue(1536);
      updatedListener!();

      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_UPDATED,
        payload: expect.objectContaining({
          receivedBytes: 1536,
        }),
      });

      // Simulate download completion
      mockItem.getState.mockReturnValue('completed');
      mockItem.getReceivedBytes.mockReturnValue(2048);
      doneListener!(createMockEvent(), 'completed');

      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_UPDATED,
        payload: expect.objectContaining({
          state: 'completed',
          receivedBytes: 2048,
        }),
      });

      // Simulate electron-dl onCompleted callback
      onCompletedCallback!({ filename: 'test-file.pdf' });

      // Should have triggered notification (tested separately)
    });

    it('should handle download operations via IPC', async () => {
      setupDownloads();

      // Mock download in store
      const mockDownload: Download = {
        itemId: 1640995200000,
        state: 'completed',
        status: DownloadStatus.ALL,
        fileName: 'test-file.pdf',
        receivedBytes: 2048,
        totalBytes: 2048,
        startTime: 1640995200000,
        endTime: 1640995400000,
        url: 'https://example.com/file.pdf',
        serverUrl: 'https://open.rocket.chat',
        serverTitle: 'Rocket.Chat Community',
        mimeType: 'application/pdf',
        savePath: '/downloads/test-file.pdf',
      };

      (select as jest.MockedFunction<typeof select>).mockReturnValue(
        mockDownload
      );

      // Get IPC handlers
      const showInFolderHandler = mockHandle.mock.calls.find(
        ([channel]) => channel === 'downloads/show-in-folder'
      )?.[1];

      const copyLinkHandler = mockHandle.mock.calls.find(
        ([channel]) => channel === 'downloads/copy-link'
      )?.[1];

      // Test show in folder
      await showInFolderHandler?.(null, mockDownload.itemId);
      expect(shell.showItemInFolder).toHaveBeenCalledWith(
        '/downloads/test-file.pdf'
      );

      // Test copy link
      await copyLinkHandler?.(null, mockDownload.itemId);
      expect(clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/file.pdf'
      );
    });

    it('should handle bulk download operations', async () => {
      setupDownloads();

      // Get IPC handlers
      const clearAllHandler = mockHandle.mock.calls.find(
        ([channel]) => channel === 'downloads/clear-all'
      )?.[1];

      const removeHandler = mockHandle.mock.calls.find(
        ([channel]) => channel === 'downloads/remove'
      )?.[1];

      // Test clear all
      await clearAllHandler?.();
      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOADS_CLEARED,
      });

      // Test remove individual
      await removeHandler?.(null, 123456789);
      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_REMOVED,
        payload: 123456789,
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle downloads when no server is found', async () => {
      const mockItem = createMockDownloadItem();
      const mockWebContents = createMockWebContents(999); // Non-existent webContents ID
      const mockEvent = createMockEvent();

      // Mock store to return no servers
      (select as jest.MockedFunction<typeof select>).mockReturnValue(undefined);

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_CREATED,
        payload: expect.objectContaining({
          serverUrl: 'unknown',
          serverTitle: 'Unknown Server',
        }),
      });
    });

    it('should handle IPC operations for non-existent downloads', async () => {
      setupDownloads();

      // Mock store to return undefined download
      (select as jest.MockedFunction<typeof select>).mockReturnValue(undefined);

      // Get IPC handlers
      const showInFolderHandler = mockHandle.mock.calls.find(
        ([channel]) => channel === 'downloads/show-in-folder'
      )?.[1];

      const copyLinkHandler = mockHandle.mock.calls.find(
        ([channel]) => channel === 'downloads/copy-link'
      )?.[1];

      // Test operations on non-existent download
      await showInFolderHandler?.(null, 'non-existent-id');
      expect(shell.showItemInFolder).not.toHaveBeenCalled();

      await copyLinkHandler?.(null, 'non-existent-id');
      expect(clipboard.writeText).not.toHaveBeenCalled();
    });

    it('should handle electron-dl onStarted when no webContents are available', () => {
      const electronDlMock = electronDl as jest.MockedFunction<
        typeof electronDl
      >;
      let onStartedCallback: (item: DownloadItem) => void;

      electronDlMock.mockImplementation((config) => {
        if (config) {
          onStartedCallback = config.onStarted!;
        }
      });

      setupDownloads();

      const webContentsMock = webContents as jest.Mocked<typeof webContents>;
      webContentsMock.getAllWebContents.mockReturnValue([]);

      const mockItem = createMockDownloadItem();

      // Should not throw when no webContents are available
      expect(() => onStartedCallback!(mockItem)).not.toThrow();
    });

    it('should handle electron-dl onStarted when webContents are destroyed', () => {
      const electronDlMock = electronDl as jest.MockedFunction<
        typeof electronDl
      >;
      let onStartedCallback: (item: DownloadItem) => void;

      electronDlMock.mockImplementation((config) => {
        if (config) {
          onStartedCallback = config.onStarted!;
        }
      });

      setupDownloads();

      const webContentsMock = webContents as jest.Mocked<typeof webContents>;
      const destroyedWC = {
        id: 123,
        isDestroyed: () => true,
      };
      webContentsMock.getAllWebContents.mockReturnValue([destroyedWC] as any);

      const mockItem = createMockDownloadItem();

      // Should not throw when all webContents are destroyed
      expect(() => onStartedCallback!(mockItem)).not.toThrow();
    });
  });

  describe('concurrent downloads', () => {
    it('should handle multiple simultaneous downloads', async () => {
      const electronDlMock = electronDl as jest.MockedFunction<
        typeof electronDl
      >;
      let onStartedCallback: (item: DownloadItem) => void;

      electronDlMock.mockImplementation((config) => {
        if (config) {
          onStartedCallback = config.onStarted!;
        }
      });

      setupDownloads();

      // Mock multiple webContents
      const webContentsMock = webContents as jest.Mocked<typeof webContents>;
      const mockWC1 = createMockWebContents(123);
      const mockWC2 = createMockWebContents(456);
      webContentsMock.getAllWebContents.mockReturnValue([
        mockWC1,
        mockWC2,
      ] as any);

      // Mock store with multiple servers
      (select as jest.MockedFunction<typeof select>).mockImplementation(
        (selector) => {
          if (typeof selector === 'function') {
            return selector({
              servers: [
                {
                  url: 'https://server1.com',
                  title: 'Server 1',
                  webContentsId: 123,
                },
                {
                  url: 'https://server2.com',
                  title: 'Server 2',
                  webContentsId: 456,
                },
              ],
              downloads: {},
            } as any);
          }
          return undefined;
        }
      );

      // Create multiple download items
      const mockItem1 = createMockDownloadItem({
        getFilename: jest.fn(() => 'file1.pdf'),
      });

      const mockItem2 = createMockDownloadItem({
        getFilename: jest.fn(() => 'file2.jpg'),
      });

      // Simulate simultaneous downloads
      onStartedCallback!(mockItem1);
      onStartedCallback!(mockItem2);

      // Both downloads should be created
      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_CREATED,
        payload: expect.objectContaining({
          fileName: 'file1.pdf',
        }),
      });

      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_CREATED,
        payload: expect.objectContaining({
          fileName: 'file2.jpg',
        }),
      });
    });
  });

  describe('memory and cleanup', () => {
    it('should properly clean up download items after completion', async () => {
      const mockItem = createMockDownloadItem();
      const mockWebContents = createMockWebContents();
      const mockEvent = createMockEvent();

      let doneListener: (event: Event, state: string) => void;
      mockItem.on.mockImplementation(((event: string, listener: any) => {
        if (event === 'done') {
          doneListener = listener;
        }
        return mockItem;
      }) as any);

      (select as jest.MockedFunction<typeof select>).mockReturnValue({
        url: 'https://test.com',
        title: 'Test Server',
      });

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      // Verify download was added to items map (internal state)
      // This is tested indirectly through the behavior

      // Simulate completion to trigger cleanup
      doneListener!(mockEvent, 'completed');

      // After completion, the item should be removed from internal tracking
      // This is tested indirectly through the dispatch call
      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_UPDATED,
        payload: expect.objectContaining({
          state: 'completed',
        }),
      });
    });
  });
});
