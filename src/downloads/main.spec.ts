import type { DownloadItem, Event, WebContents } from 'electron';
import { clipboard, shell } from 'electron';

import { handle } from '../ipc/main';
import { dispatch, select } from '../store';
import {
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
  DOWNLOADS_CLEARED,
} from './actions';
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
  webContents: {},
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

// Mock Redux store
jest.mock('../store', () => ({
  dispatch: jest.fn(),
  select: jest.fn(),
}));

describe('downloads/main', () => {
  const mockDispatch = dispatch as jest.MockedFunction<typeof dispatch>;
  const mockSelect = select as jest.MockedFunction<typeof select>;
  const mockHandle = handle as jest.MockedFunction<typeof handle>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWillDownloadEvent', () => {
    const createMockDownloadItem = (
      overrides: Partial<DownloadItem> = {}
    ): jest.Mocked<DownloadItem> => {
      const mockItem = {
        getFilename: jest.fn(() => 'test-file.pdf'),
        getState: jest.fn(() => 'progressing'),
        isPaused: jest.fn(() => false),
        getReceivedBytes: jest.fn(() => 1024),
        getTotalBytes: jest.fn(() => 2048),
        getStartTime: jest.fn(() => 1640995200), // Unix timestamp
        getURL: jest.fn(() => 'https://example.com/file.pdf'),
        getMimeType: jest.fn(() => 'application/pdf'),
        getSavePath: jest.fn(() => '/downloads/test-file.pdf'),
        on: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        cancel: jest.fn(),
        ...overrides,
      } as unknown as jest.Mocked<DownloadItem>;

      return mockItem;
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

    it('should create a download entry in Redux store when server is found', async () => {
      const mockItem = createMockDownloadItem();
      const mockWebContents = createMockWebContents(123);
      const mockEvent = createMockEvent();

      // Mock server selection to return a server
      mockSelect.mockReturnValue({
        url: 'https://open.rocket.chat',
        title: 'Rocket.Chat Community',
      });

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_CREATED,
        payload: expect.objectContaining({
          fileName: 'test-file.pdf',
          state: 'progressing',
          status: DownloadStatus.ALL,
          receivedBytes: 1024,
          totalBytes: 2048,
          url: 'https://example.com/file.pdf',
          serverUrl: 'https://open.rocket.chat',
          serverTitle: 'Rocket.Chat Community',
          mimeType: 'application/pdf',
          savePath: '/downloads/test-file.pdf',
        }),
      });
    });

    it('should use fallback values when server is not found', async () => {
      const mockItem = createMockDownloadItem();
      const mockWebContents = createMockWebContents(999); // Non-existent webContents ID
      const mockEvent = createMockEvent();

      // Mock server selection to return undefined
      mockSelect.mockReturnValue(undefined);

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_CREATED,
        payload: expect.objectContaining({
          serverUrl: 'unknown',
          serverTitle: 'Unknown Server',
        }),
      });
    });

    it('should handle paused downloads correctly', async () => {
      const mockItem = createMockDownloadItem({
        isPaused: jest.fn(() => true),
      });
      const mockWebContents = createMockWebContents();
      const mockEvent = createMockEvent();

      mockSelect.mockReturnValue(undefined);

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_CREATED,
        payload: expect.objectContaining({
          state: 'paused',
          status: DownloadStatus.PAUSED,
        }),
      });
    });

    it('should set up download item event listeners', async () => {
      const mockItem = createMockDownloadItem();
      const mockWebContents = createMockWebContents();
      const mockEvent = createMockEvent();

      mockSelect.mockReturnValue(undefined);

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      // Verify that 'updated' and 'done' event listeners were set up
      expect(mockItem.on).toHaveBeenCalledWith('updated', expect.any(Function));
      expect(mockItem.on).toHaveBeenCalledWith('done', expect.any(Function));
    });

    it('should dispatch DOWNLOAD_UPDATED when download is updated', async () => {
      const mockItem = createMockDownloadItem();
      const mockWebContents = createMockWebContents();
      const mockEvent = createMockEvent();

      // Capture the event listeners
      let updateListener: () => void;
      mockItem.on.mockImplementation((event: string, listener: any) => {
        if (event === 'updated') {
          updateListener = listener;
        }
        return mockItem;
      });

      mockSelect.mockReturnValue(undefined);

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      // Simulate an update
      mockItem.getReceivedBytes.mockReturnValue(1500);
      updateListener!();

      expect(mockDispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_UPDATED,
        payload: expect.objectContaining({
          receivedBytes: 1500,
          endTime: expect.any(Number),
        }),
      });
    });

    it('should dispatch DOWNLOAD_UPDATED when download is completed', async () => {
      const mockItem = createMockDownloadItem();
      const mockWebContents = createMockWebContents();
      const mockEvent = createMockEvent();

      // Capture the event listeners
      let doneListener: (event: Event, state: string) => void;
      mockItem.on.mockImplementation((event: string, listener: any) => {
        if (event === 'done') {
          doneListener = listener;
        }
        return mockItem;
      });

      mockSelect.mockReturnValue(undefined);

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      // Simulate completion
      mockItem.getState.mockReturnValue('completed');
      doneListener!(mockEvent, 'completed');

      expect(mockDispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_UPDATED,
        payload: expect.objectContaining({
          state: 'completed',
          status: DownloadStatus.ALL,
          endTime: expect.any(Number),
        }),
      });
    });

    it('should handle cancelled downloads correctly', async () => {
      const mockItem = createMockDownloadItem();
      const mockWebContents = createMockWebContents();
      const mockEvent = createMockEvent();

      // Capture the event listeners
      let doneListener: (event: Event, state: string) => void;
      mockItem.on.mockImplementation((event: string, listener: any) => {
        if (event === 'done') {
          doneListener = listener;
        }
        return mockItem;
      });

      mockSelect.mockReturnValue(undefined);

      await handleWillDownloadEvent(mockEvent, mockItem, mockWebContents);

      // Simulate cancellation
      mockItem.getState.mockReturnValue('cancelled');
      doneListener!(mockEvent, 'cancelled');

      expect(mockDispatch).toHaveBeenCalledWith({
        type: DOWNLOAD_UPDATED,
        payload: expect.objectContaining({
          state: 'cancelled',
          status: DownloadStatus.CANCELLED,
        }),
      });
    });
  });

  describe('setupDownloads', () => {
    beforeEach(() => {
      setupDownloads();
    });

    it('should register all IPC handlers', () => {
      expect(mockHandle).toHaveBeenCalledWith(
        'downloads/show-in-folder',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'downloads/copy-link',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'downloads/pause',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'downloads/resume',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'downloads/cancel',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'downloads/retry',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'downloads/clear-all',
        expect.any(Function)
      );
      expect(mockHandle).toHaveBeenCalledWith(
        'downloads/remove',
        expect.any(Function)
      );
    });

    describe('IPC handler: downloads/show-in-folder', () => {
      it('should show download in folder when download exists', async () => {
        const mockDownload = {
          savePath: '/downloads/test-file.pdf',
        };

        mockSelect.mockReturnValue(mockDownload);

        // Get the registered handler
        const showInFolderHandler = mockHandle.mock.calls.find(
          ([channel]) => (channel as string) === 'downloads/show-in-folder'
        )?.[1] as any;

        await showInFolderHandler?.({} as any, 'test-item-id');

        expect(shell.showItemInFolder).toHaveBeenCalledWith(
          '/downloads/test-file.pdf'
        );
      });

      it('should do nothing when download does not exist', async () => {
        mockSelect.mockReturnValue(undefined);

        const showInFolderHandler = mockHandle.mock.calls.find(
          ([channel]) => (channel as string) === 'downloads/show-in-folder'
        )?.[1] as any;

        await showInFolderHandler?.({} as any, 'non-existent-id');

        expect(shell.showItemInFolder).not.toHaveBeenCalled();
      });
    });

    describe('IPC handler: downloads/copy-link', () => {
      it('should copy download URL to clipboard when download exists', async () => {
        const mockDownload = {
          url: 'https://example.com/file.pdf',
        };

        mockSelect.mockReturnValue(mockDownload);

        const copyLinkHandler = mockHandle.mock.calls.find(
          ([channel]) => (channel as string) === 'downloads/copy-link'
        )?.[1] as any;

        await copyLinkHandler?.({} as any, 'test-item-id');

        expect(clipboard.writeText).toHaveBeenCalledWith(
          'https://example.com/file.pdf'
        );
      });

      it('should do nothing when download does not exist', async () => {
        mockSelect.mockReturnValue(undefined);

        const copyLinkHandler = mockHandle.mock.calls.find(
          ([channel]) => (channel as string) === 'downloads/copy-link'
        )?.[1] as any;

        await copyLinkHandler?.({} as any, 'non-existent-id');

        expect(clipboard.writeText).not.toHaveBeenCalled();
      });
    });

    describe('IPC handler: downloads/clear-all', () => {
      it('should dispatch DOWNLOADS_CLEARED action', async () => {
        const clearAllHandler = mockHandle.mock.calls.find(
          ([channel]) => (channel as string) === 'downloads/clear-all'
        )?.[1] as any;

        await clearAllHandler?.({} as any);

        expect(mockDispatch).toHaveBeenCalledWith({
          type: DOWNLOADS_CLEARED,
        });
      });
    });

    describe('IPC handler: downloads/remove', () => {
      it('should dispatch DOWNLOAD_REMOVED action with correct itemId', async () => {
        const removeHandler = mockHandle.mock.calls.find(
          ([channel]) => (channel as string) === 'downloads/remove'
        )?.[1] as any;

        await removeHandler?.({} as any, 'test-item-id');

        expect(mockDispatch).toHaveBeenCalledWith({
          type: DOWNLOAD_REMOVED,
          payload: 'test-item-id',
        });
      });
    });
  });
});
