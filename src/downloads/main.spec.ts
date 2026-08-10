import type { DownloadItem, Event, WebContents } from 'electron';
import { clipboard, shell } from 'electron';

import { handle } from '../ipc/main';
import { dispatch, listen, select } from '../store';
import {
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
  DOWNLOADS_CLEARED,
  DOWNLOADS_SIMULATION_REQUESTED,
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
  listen: jest.fn(),
}));

describe('downloads/main', () => {
  const mockDispatch = dispatch as jest.MockedFunction<typeof dispatch>;
  const mockSelect = select as jest.MockedFunction<typeof select>;
  const mockHandle = handle as jest.MockedFunction<typeof handle>;
  const mockListen = listen as jest.MockedFunction<typeof listen>;

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

    describe('DOWNLOADS_SIMULATION_REQUESTED', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        mockSelect.mockImplementation((selector: any) =>
          selector({ servers: [] })
        );
      });

      afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
      });

      const getSimulationHandler = () =>
        (mockListen.mock.calls as any[]).find(
          ([type]) => type === DOWNLOADS_SIMULATION_REQUESTED
        )?.[1] as any;

      it('registers a listener for DOWNLOADS_SIMULATION_REQUESTED', () => {
        expect(mockListen).toHaveBeenCalledWith(
          DOWNLOADS_SIMULATION_REQUESTED,
          expect.any(Function)
        );
      });

      it('dispatches two DOWNLOAD_CREATED actions', async () => {
        const handler = getSimulationHandler();

        await handler?.({ type: DOWNLOADS_SIMULATION_REQUESTED });

        const createdCalls = (mockDispatch.mock.calls as any[]).filter(
          ([action]) => action.type === DOWNLOAD_CREATED
        );

        expect(createdCalls).toHaveLength(2);
        expect(createdCalls[0][0].payload).toMatchObject({
          fileName: 'demo-video.mp4',
          state: 'progressing',
          receivedBytes: 0,
        });
        expect(createdCalls[1][0].payload).toMatchObject({
          fileName: 'demo-archive.zip',
          state: 'progressing',
          receivedBytes: 0,
        });
      });

      it('grows receivedBytes on progress ticks and completes both downloads', async () => {
        const handler = getSimulationHandler();

        await handler?.({ type: DOWNLOADS_SIMULATION_REQUESTED });

        const createdCalls = (mockDispatch.mock.calls as any[]).filter(
          ([action]) => action.type === DOWNLOAD_CREATED
        );
        const videoItemId = createdCalls[0][0].payload.itemId;
        const archiveItemId = createdCalls[1][0].payload.itemId;

        jest.advanceTimersByTime(250);

        const firstTickUpdates = (mockDispatch.mock.calls as any[]).filter(
          ([action]) =>
            action.type === DOWNLOAD_UPDATED &&
            action.payload.itemId === videoItemId
        );
        expect(firstTickUpdates).toHaveLength(1);
        expect(firstTickUpdates[0][0].payload.receivedBytes).toBeGreaterThan(0);

        // Advance well past both simulated durations (~14s is the longer one).
        jest.advanceTimersByTime(20_000);

        const videoUpdates = (mockDispatch.mock.calls as any[]).filter(
          ([action]) =>
            action.type === DOWNLOAD_UPDATED &&
            action.payload.itemId === videoItemId
        );
        const archiveUpdates = (mockDispatch.mock.calls as any[]).filter(
          ([action]) =>
            action.type === DOWNLOAD_UPDATED &&
            action.payload.itemId === archiveItemId
        );

        expect(videoUpdates[videoUpdates.length - 1][0].payload).toMatchObject({
          state: 'completed',
          receivedBytes: 256 * 1024 * 1024,
        });
        expect(
          archiveUpdates[archiveUpdates.length - 1][0].payload
        ).toMatchObject({
          state: 'completed',
          receivedBytes: 64 * 1024 * 1024,
        });
      });

      it('removes the previous simulation itemIds when a new simulation starts', async () => {
        const handler = getSimulationHandler();

        await handler?.({ type: DOWNLOADS_SIMULATION_REQUESTED });

        const firstCreatedCalls = (mockDispatch.mock.calls as any[]).filter(
          ([action]) => action.type === DOWNLOAD_CREATED
        );
        const firstVideoItemId = firstCreatedCalls[0][0].payload.itemId;
        const firstArchiveItemId = firstCreatedCalls[1][0].payload.itemId;

        mockDispatch.mockClear();

        await handler?.({ type: DOWNLOADS_SIMULATION_REQUESTED });

        const removedCalls = (mockDispatch.mock.calls as any[]).filter(
          ([action]) => action.type === DOWNLOAD_REMOVED
        );
        const removedItemIds = removedCalls.map(([action]) => action.payload);

        expect(removedItemIds).toEqual(
          expect.arrayContaining([firstVideoItemId, firstArchiveItemId])
        );
      });
    });

    describe('interruptOrphanedDownloads', () => {
      it('marks a persisted progressing download with no live item as interrupted', () => {
        mockDispatch.mockClear();
        mockSelect.mockImplementation((selector: any) =>
          selector({
            downloads: {
              'progressing-item': {
                itemId: 'progressing-item',
                state: 'progressing',
                status: DownloadStatus.ALL,
              },
            },
          })
        );

        setupDownloads();

        expect(mockDispatch).toHaveBeenCalledWith({
          type: DOWNLOAD_UPDATED,
          payload: expect.objectContaining({
            itemId: 'progressing-item',
            state: 'interrupted',
            endTime: expect.any(Number),
          }),
        });
      });

      it('marks a persisted paused download with no live item as interrupted', () => {
        mockDispatch.mockClear();
        mockSelect.mockImplementation((selector: any) =>
          selector({
            downloads: {
              'paused-item': {
                itemId: 'paused-item',
                state: 'paused',
                status: DownloadStatus.PAUSED,
              },
            },
          })
        );

        setupDownloads();

        expect(mockDispatch).toHaveBeenCalledWith({
          type: DOWNLOAD_UPDATED,
          payload: expect.objectContaining({
            itemId: 'paused-item',
            state: 'interrupted',
            endTime: expect.any(Number),
          }),
        });
      });

      it('leaves a completed download untouched', () => {
        mockDispatch.mockClear();
        mockSelect.mockImplementation((selector: any) =>
          selector({
            downloads: {
              'completed-item': {
                itemId: 'completed-item',
                state: 'completed',
                status: DownloadStatus.ALL,
              },
            },
          })
        );

        setupDownloads();

        expect(mockDispatch).not.toHaveBeenCalledWith(
          expect.objectContaining({
            type: DOWNLOAD_UPDATED,
            payload: expect.objectContaining({ itemId: 'completed-item' }),
          })
        );
      });
    });
  });
});
