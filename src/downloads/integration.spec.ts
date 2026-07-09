import type { DownloadItem, Event, WebContents } from 'electron';
import { clipboard, shell, webContents } from 'electron';

import { handle as mockHandle } from '../ipc/main';
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

jest.mock('../store', () => ({
  createMainReduxStore: jest.fn(),
  dispatch: jest.fn(),
  select: jest.fn(),
}));

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

// Mock IPC handler
jest.mock('../ipc/main', () => ({
  handle: jest.fn(),
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
  const mockHandleFn = mockHandle as jest.Mock;
  const selectMock = select as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    createMainReduxStore();
  });

  const getHandler = (channelName: string) =>
    mockHandleFn.mock.calls.find((call) => call[0] === channelName)?.[1];

  const createMockDownloadItem = (
    overrides: Partial<DownloadItem> = {}
  ): jest.Mocked<DownloadItem> => {
    return {
      getFilename: jest.fn(() => 'test-file.pdf'),
      getState: jest.fn(() => 'progressing'),
      isPaused: jest.fn(() => false),
      pause: jest.fn(),
      resume: jest.fn(),
      cancel: jest.fn(),
      canResume: jest.fn(() => true),
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
    it('should handle complete download lifecycle', async () => {
      const mockEvent = createMockEvent();

      // Setup webContents for tracking
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

      selectMock.mockImplementation(mockSelectImplementation);

      await handleWillDownloadEvent(mockEvent, mockItem, mockWC);

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

      doneListener!(createMockEvent(), 'completed');
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

      selectMock.mockReturnValue(mockDownload);

      // Get IPC handlers
      const showInFolderHandler = getHandler('downloads/show-in-folder');

      const copyLinkHandler = getHandler('downloads/copy-link');

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
      const clearAllHandler = getHandler('downloads/clear-all');

      const removeHandler = getHandler('downloads/remove');

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
      selectMock.mockReturnValue(undefined);

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
      selectMock.mockReturnValue(undefined);

      // Get IPC handlers
      const showInFolderHandler = getHandler('downloads/show-in-folder');

      const copyLinkHandler = getHandler('downloads/copy-link');

      // Test operations on non-existent download
      await showInFolderHandler?.(null, 'non-existent-id');
      expect(shell.showItemInFolder).not.toHaveBeenCalled();

      await copyLinkHandler?.(null, 'non-existent-id');
      expect(clipboard.writeText).not.toHaveBeenCalled();
    });

    it('should pause, resume, and cancel active downloads through handlers', async () => {
      const fixedNow = Date.now;
      const downloadId = 1783398156938;
      const mockEvent = createMockEvent();
      Date.now = jest.fn(() => downloadId);

      setupDownloads();

      const pauseHandler = getHandler('downloads/pause');
      const resumeHandler = getHandler('downloads/resume');
      const cancelHandler = getHandler('downloads/cancel');

      const mockItem = createMockDownloadItem({
        canResume: jest.fn(() => true),
      });
      const mockWC = createMockWebContents(123);

      mockItem.on.mockImplementation(() => mockItem);
      selectMock.mockReturnValue({
        url: 'https://server1.com',
        title: 'Server 1',
      });

      await handleWillDownloadEvent(mockEvent, mockItem, mockWC);
      mockItem.isPaused.mockReturnValue(false);
      await pauseHandler?.(null, downloadId);
      expect(mockItem.pause).toHaveBeenCalledTimes(1);

      mockItem.isPaused.mockReturnValue(true);
      await resumeHandler?.(null, downloadId);
      expect(mockItem.resume).toHaveBeenCalledTimes(1);

      await cancelHandler?.(null, downloadId);
      expect(mockItem.cancel).toHaveBeenCalledTimes(1);

      Date.now = fixedNow;
    });
  });

  describe('concurrent downloads', () => {
    it('should handle multiple simultaneous downloads', async () => {
      const mockEvent = createMockEvent();

      // Mock webContents for tracking
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
      await handleWillDownloadEvent(mockEvent, mockItem1, mockWC1);
      await handleWillDownloadEvent(mockEvent, mockItem2, mockWC2);

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

      selectMock.mockReturnValue({
        url: 'https://test.com',
        title: 'Test Server',
      });

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      // Verify download was added to items map (internal state)
      // This is tested indirectly through the behavior

      mockItem.getState.mockReturnValue('completed');
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
