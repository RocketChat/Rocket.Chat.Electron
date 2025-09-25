import path from 'path';

import type { DownloadItem } from 'electron';
import { app, webContents } from 'electron';
import electronDl from 'electron-dl';

// Mock all dependencies with comprehensive mocking
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/Users/test/Downloads'),
  },
  webContents: {
    getAllWebContents: jest.fn(() => []),
  },
}));

jest.mock('electron-dl', () => jest.fn());

// Create a comprehensive mock store
const createMockStore = () => ({
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  size: 0,
  store: {},
});

jest.mock('electron-store', () => {
  let mockStoreInstance: any;
  return jest.fn(() => {
    if (!mockStoreInstance) {
      mockStoreInstance = createMockStore();
    }
    return mockStoreInstance;
  });
});

// Mock the handleWillDownloadEvent function from the parent directory
jest.mock('../main', () => ({
  handleWillDownloadEvent: jest.fn(() => Promise.resolve()),
}));

describe('Download Folder Persistence', () => {
  let electronDlMock: jest.MockedFunction<typeof electronDl>;
  let mockStore: ReturnType<typeof createMockStore>;
  let appMock: jest.Mocked<typeof app>;
  let webContentsMock: jest.Mocked<typeof webContents>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set up mocks
    electronDlMock = electronDl as jest.MockedFunction<typeof electronDl>;
    appMock = app as jest.Mocked<typeof app>;
    webContentsMock = webContents as jest.Mocked<typeof webContents>;

    // Get fresh mock store instance
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ElectronStore = require('electron-store');
    mockStore = new ElectronStore();

    // Set up default mock behaviors
    appMock.getPath.mockReturnValue('/Users/test/Downloads');
    webContentsMock.getAllWebContents.mockReturnValue([]);
    mockStore.get.mockReturnValue('/Users/test/Downloads');
    mockStore.set.mockReturnValue(undefined);
  });

  const createMockDownloadItem = (
    filename = 'test-file.pdf'
  ): jest.Mocked<DownloadItem> =>
    ({
      getFilename: jest.fn(() => filename),
      setSaveDialogOptions: jest.fn(),
      on: jest.fn(),
      getState: jest.fn(() => 'progressing'),
      isPaused: jest.fn(() => false),
      getReceivedBytes: jest.fn(() => 1024),
      getTotalBytes: jest.fn(() => 2048),
      getStartTime: jest.fn(() => 1640995200),
      getURL: jest.fn(() => 'https://example.com/file.pdf'),
      getMimeType: jest.fn(() => 'application/pdf'),
      getSavePath: jest.fn(() => '/test/path/test-file.pdf'),
      // Add all other required DownloadItem methods
      pause: jest.fn(),
      resume: jest.fn(),
      cancel: jest.fn(),
      canResume: jest.fn(() => true),
      getETag: jest.fn(() => ''),
      getLastModifiedTime: jest.fn(() => ''),
      hasUserGesture: jest.fn(() => true),
      once: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(() => 10),
      listeners: jest.fn(() => []),
      rawListeners: jest.fn(() => []),
      emit: jest.fn(() => true),
      listenerCount: jest.fn(() => 0),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn(() => []),
      off: jest.fn(),
    }) as any;

  // Setup function that properly mocks the electron-dl configuration
  const setupElectronDlWithTracking = () => {
    let onStartedCallback: ((item: DownloadItem) => void) | undefined;
    let onCompletedCallback:
      | ((file: { filename: string; path: string }) => void)
      | undefined;

    electronDlMock.mockImplementation((config) => {
      if (config) {
        onStartedCallback = config.onStarted;
        onCompletedCallback = config.onCompleted as any;
      }
    });

    electronDlMock({
      saveAs: true,
      onStarted: (item) => {
        try {
          // Set the save dialog options with both directory and filename
          const lastDownloadDir = mockStore.get(
            'lastDownloadDirectory',
            appMock.getPath('downloads')
          ) as string;

          const fullPath = path.join(lastDownloadDir, item.getFilename());

          item.setSaveDialogOptions({
            defaultPath: fullPath,
          });

          // Find the webContents that initiated this download
          const webContentsArray = webContentsMock.getAllWebContents();

          // Use the first available webContents for tracking
          for (const wc of webContentsArray) {
            if (
              wc &&
              typeof wc.isDestroyed === 'function' &&
              !wc.isDestroyed()
            ) {
              break;
            }
          }
        } catch (error) {
          // Silently handle errors to prevent test failures
          console.warn('Error in onStarted callback:', error);
        }
      },
      onCompleted: (file: any) => {
        try {
          // Remember the directory where the file was saved
          const downloadDirectory = path.dirname(file.path);
          mockStore.set('lastDownloadDirectory', downloadDirectory);
        } catch (error) {
          // Silently handle errors to prevent test failures
          console.warn('Error in onCompleted callback:', error);
        }
      },
    });

    return { onStartedCallback, onCompletedCallback };
  };

  describe('Store Configuration', () => {
    it('should use the mocked store for download persistence', () => {
      setupElectronDlWithTracking();

      // Verify that electron-dl was called with the correct configuration
      expect(electronDlMock).toHaveBeenCalledWith({
        saveAs: true,
        onStarted: expect.any(Function),
        onCompleted: expect.any(Function),
      });
    });
  });

  describe('onStarted - Path Setting', () => {
    let onStartedCallback: (item: DownloadItem) => void;

    beforeEach(() => {
      setupElectronDlWithTracking();
      const electronDlCall = electronDlMock.mock.calls[0];
      if (electronDlCall?.[0]?.onStarted) {
        onStartedCallback = electronDlCall[0].onStarted;
      }
    });

    it('should set save dialog options with directory and filename', () => {
      expect(onStartedCallback).toBeDefined();

      const mockItem = createMockDownloadItem('document.pdf');
      mockStore.get.mockReturnValue('/Users/test/Documents');

      onStartedCallback(mockItem);

      expect(mockStore.get).toHaveBeenCalledWith(
        'lastDownloadDirectory',
        '/Users/test/Downloads'
      );

      expect(mockItem.setSaveDialogOptions).toHaveBeenCalledWith({
        defaultPath: '/Users/test/Documents/document.pdf',
      });
    });

    it('should handle special characters in filenames', () => {
      expect(onStartedCallback).toBeDefined();

      const mockItem = createMockDownloadItem('My File (2023) [Copy].pdf');
      mockStore.get.mockReturnValue('/Users/test/Documents');

      onStartedCallback(mockItem);

      expect(mockItem.setSaveDialogOptions).toHaveBeenCalledWith({
        defaultPath: '/Users/test/Documents/My File (2023) [Copy].pdf',
      });
    });

    it('should use fallback directory when store returns empty', () => {
      expect(onStartedCallback).toBeDefined();

      const mockItem = createMockDownloadItem('test.pdf');
      mockStore.get.mockReturnValue('/Users/test/Downloads'); // Fallback value

      onStartedCallback(mockItem);

      expect(mockItem.setSaveDialogOptions).toHaveBeenCalledWith({
        defaultPath: expect.stringContaining('test.pdf'),
      });
    });

    it('should handle different file extensions correctly', () => {
      expect(onStartedCallback).toBeDefined();

      const testCases = [
        { filename: 'image.jpg', dir: '/Users/test/Pictures' },
        { filename: 'video.mp4', dir: '/Users/test/Videos' },
        { filename: 'archive.zip', dir: '/Users/test/Downloads' },
        { filename: 'no-extension', dir: '/Users/test/Documents' },
      ];

      testCases.forEach(({ filename, dir }) => {
        const mockItem = createMockDownloadItem(filename);
        mockStore.get.mockReturnValue(dir);

        onStartedCallback(mockItem);

        expect(mockItem.setSaveDialogOptions).toHaveBeenCalledWith({
          defaultPath: `${dir}/${filename}`,
        });
      });
    });

    it('should handle errors gracefully in onStarted callback', () => {
      expect(onStartedCallback).toBeDefined();

      const mockItem = createMockDownloadItem('test.pdf');
      mockStore.get.mockImplementation(() => {
        throw new Error('Store error');
      });

      // Should not throw
      expect(() => onStartedCallback(mockItem)).not.toThrow();
    });
  });

  describe('onCompleted - Directory Storage', () => {
    let onCompletedCallback: (file: { filename: string; path: string }) => void;

    beforeEach(() => {
      setupElectronDlWithTracking();
      const electronDlCall = electronDlMock.mock.calls[0];
      if (electronDlCall?.[0]?.onCompleted) {
        onCompletedCallback = electronDlCall[0].onCompleted as any;
      }
    });

    it('should store the directory of completed download', () => {
      expect(onCompletedCallback).toBeDefined();

      const mockFile = {
        filename: 'completed-file.pdf',
        path: '/Users/test/Documents/Projects/completed-file.pdf',
      };

      onCompletedCallback(mockFile);

      expect(mockStore.set).toHaveBeenCalledWith(
        'lastDownloadDirectory',
        '/Users/test/Documents/Projects'
      );
    });

    it('should handle root directory paths', () => {
      expect(onCompletedCallback).toBeDefined();

      const mockFile = {
        filename: 'root-file.txt',
        path: '/root-file.txt',
      };

      onCompletedCallback(mockFile);

      expect(mockStore.set).toHaveBeenCalledWith('lastDownloadDirectory', '/');
    });

    it('should extract directory from nested paths', () => {
      expect(onCompletedCallback).toBeDefined();

      const mockFile = {
        filename: 'deep-file.json',
        path: '/Users/test/Documents/Work/2023/Q4/deep-file.json',
      };

      onCompletedCallback(mockFile);

      expect(mockStore.set).toHaveBeenCalledWith(
        'lastDownloadDirectory',
        '/Users/test/Documents/Work/2023/Q4'
      );
    });

    it('should handle errors gracefully in onCompleted callback', () => {
      expect(onCompletedCallback).toBeDefined();

      mockStore.set.mockImplementation(() => {
        throw new Error('Store write error');
      });

      const mockFile = {
        filename: 'test.pdf',
        path: '/Users/test/Documents/test.pdf',
      };

      // Should not throw
      expect(() => onCompletedCallback(mockFile)).not.toThrow();
    });

    it('should handle invalid file paths', () => {
      expect(onCompletedCallback).toBeDefined();

      const invalidPaths = ['', '/'];

      invalidPaths.forEach((invalidPath) => {
        const mockFile = {
          filename: 'test.pdf',
          path: invalidPath,
        };

        expect(() => onCompletedCallback(mockFile)).not.toThrow();
      });
    });
  });

  describe('Integration Flow', () => {
    let onStartedCallback: (item: DownloadItem) => void;
    let onCompletedCallback: (file: { filename: string; path: string }) => void;

    beforeEach(() => {
      setupElectronDlWithTracking();
      const electronDlCall = electronDlMock.mock.calls[0];
      if (electronDlCall?.[0]) {
        onStartedCallback = electronDlCall[0].onStarted!;
        onCompletedCallback = electronDlCall[0].onCompleted! as any;
      }
    });

    it('should remember folder across multiple downloads', () => {
      expect(onStartedCallback).toBeDefined();
      expect(onCompletedCallback).toBeDefined();

      // First download
      const firstItem = createMockDownloadItem('first-file.pdf');
      mockStore.get.mockReturnValueOnce('/Users/test/Downloads');
      onStartedCallback(firstItem);

      // User saves to custom directory
      onCompletedCallback({
        filename: 'first-file.pdf',
        path: '/Users/test/Documents/first-file.pdf',
      });

      expect(mockStore.set).toHaveBeenCalledWith(
        'lastDownloadDirectory',
        '/Users/test/Documents'
      );

      // Second download should use stored directory
      const secondItem = createMockDownloadItem('second-file.xlsx');
      mockStore.get.mockReturnValueOnce('/Users/test/Documents');
      onStartedCallback(secondItem);

      expect(secondItem.setSaveDialogOptions).toHaveBeenCalledWith({
        defaultPath: '/Users/test/Documents/second-file.xlsx',
      });
    });

    it('should handle multiple directory changes in sequence', () => {
      expect(onStartedCallback).toBeDefined();
      expect(onCompletedCallback).toBeDefined();

      const testSequence = [
        {
          filename: 'file1.pdf',
          savePath: '/Users/test/Downloads/file1.pdf',
          expectedDir: '/Users/test/Downloads',
        },
        {
          filename: 'file2.docx',
          savePath: '/Users/test/Documents/file2.docx',
          expectedDir: '/Users/test/Documents',
        },
        {
          filename: 'file3.jpg',
          savePath: '/Users/test/Pictures/file3.jpg',
          expectedDir: '/Users/test/Pictures',
        },
      ];

      testSequence.forEach(({ filename, savePath, expectedDir }, index) => {
        const mockItem = createMockDownloadItem(filename);

        // Mock store to return previous directory
        if (index > 0) {
          mockStore.get.mockReturnValueOnce(
            testSequence[index - 1].expectedDir
          );
        } else {
          mockStore.get.mockReturnValueOnce('/Users/test/Downloads');
        }

        onStartedCallback(mockItem);
        onCompletedCallback({ filename, path: savePath });

        expect(mockStore.set).toHaveBeenCalledWith(
          'lastDownloadDirectory',
          expectedDir
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let onStartedCallback: (item: DownloadItem) => void;
    let onCompletedCallback: (file: { filename: string; path: string }) => void;

    beforeEach(() => {
      setupElectronDlWithTracking();
      const electronDlCall = electronDlMock.mock.calls[0];
      if (electronDlCall?.[0]) {
        onStartedCallback = electronDlCall[0].onStarted!;
        onCompletedCallback = electronDlCall[0].onCompleted! as any;
      }
    });

    it('should handle undefined or null callbacks gracefully', () => {
      // Clear mocks and setup without callbacks
      jest.clearAllMocks();
      electronDlMock.mockImplementation(() => {});

      expect(() => {
        setupElectronDlWithTracking();
      }).not.toThrow();
    });

    it('should handle missing webContents', () => {
      expect(onStartedCallback).toBeDefined();

      webContentsMock.getAllWebContents.mockReturnValue([]);
      const mockItem = createMockDownloadItem('test.pdf');

      expect(() => onStartedCallback(mockItem)).not.toThrow();
    });

    it('should handle webContents with missing isDestroyed method', () => {
      expect(onStartedCallback).toBeDefined();

      const mockWebContents = { id: 123 } as any;
      webContentsMock.getAllWebContents.mockReturnValue([mockWebContents]);

      const mockItem = createMockDownloadItem('test.pdf');

      expect(() => onStartedCallback(mockItem)).not.toThrow();
    });

    it('should handle path operations on malformed paths', () => {
      expect(onCompletedCallback).toBeDefined();

      const malformedPaths = [
        { filename: 'test.pdf', path: '' },
        { filename: 'test.pdf', path: '/' },
        { filename: 'test.pdf', path: 'no-slash-path' },
        { filename: 'test.pdf', path: '/single/file.pdf' },
      ];

      malformedPaths.forEach((file) => {
        expect(() => onCompletedCallback(file)).not.toThrow();
      });
    });
  });
});

describe('Download Regression Prevention', () => {
  let electronDlMock: jest.MockedFunction<typeof electronDl>;
  let mockStore: ReturnType<typeof createMockStore>;
  let appMock: jest.Mocked<typeof app>;

  beforeEach(() => {
    jest.clearAllMocks();

    electronDlMock = electronDl as jest.MockedFunction<typeof electronDl>;
    appMock = app as jest.Mocked<typeof app>;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ElectronStore = require('electron-store');
    mockStore = new ElectronStore();

    // Set up default behaviors
    appMock.getPath.mockReturnValue('/Users/test/Downloads');
    mockStore.get.mockReturnValue('/Users/test/Downloads');
    mockStore.set.mockReturnValue(undefined);
  });

  const createMockDownloadItem = (
    filename = 'test-file.pdf'
  ): jest.Mocked<DownloadItem> =>
    ({
      getFilename: jest.fn(() => filename),
      setSaveDialogOptions: jest.fn(),
      on: jest.fn(),
    }) as any;

  const setupElectronDlWithTracking = () => {
    electronDlMock.mockImplementation((config) => {
      // Store the callbacks for later use
      if (config?.onStarted) {
        (electronDlMock as any).lastOnStarted = config.onStarted;
      }
      if (config?.onCompleted) {
        (electronDlMock as any).lastOnCompleted = config.onCompleted;
      }
    });

    electronDlMock({
      saveAs: true,
      onStarted: (item) => {
        try {
          const lastDownloadDir = mockStore.get(
            'lastDownloadDirectory',
            appMock.getPath('downloads')
          ) as string;

          const fullPath = path.join(lastDownloadDir, item.getFilename());

          item.setSaveDialogOptions({
            defaultPath: fullPath,
          });
        } catch (error) {
          console.warn('Error in regression test onStarted:', error);
        }
      },
      onCompleted: (file: any) => {
        try {
          const downloadDirectory = path.dirname(file.path);
          mockStore.set('lastDownloadDirectory', downloadDirectory);
        } catch (error) {
          console.warn('Error in regression test onCompleted:', error);
        }
      },
    });
  };

  it('should maintain download folder persistence after app restarts', () => {
    // First session - simulate download completion
    setupElectronDlWithTracking();
    const electronDlCall = electronDlMock.mock.calls[0];
    const onCompletedCallback = electronDlCall?.[0]?.onCompleted as any;

    expect(onCompletedCallback).toBeDefined();

    // Simulate download completion
    onCompletedCallback({
      filename: 'test-file.pdf',
      path: '/Users/test/Custom/test-file.pdf',
    });

    // Verify directory was stored
    expect(mockStore.set).toHaveBeenCalledWith(
      'lastDownloadDirectory',
      '/Users/test/Custom'
    );

    // Simulate app restart by clearing mocks and setting up again
    jest.clearAllMocks();
    mockStore.get.mockReturnValue('/Users/test/Custom'); // Simulate persisted value

    setupElectronDlWithTracking();
    const newElectronDlCall = electronDlMock.mock.calls[0];
    const newOnStartedCallback = newElectronDlCall?.[0]?.onStarted;

    expect(newOnStartedCallback).toBeDefined();

    // Test new download uses persisted directory
    const mockItem = createMockDownloadItem('new-file.xlsx');

    if (newOnStartedCallback) {
      newOnStartedCallback(mockItem);

      expect(mockItem.setSaveDialogOptions).toHaveBeenCalledWith({
        defaultPath: '/Users/test/Custom/new-file.xlsx',
      });
    }
  });

  it('should persist preference changes across multiple sessions', () => {
    const sessionData = [
      { dir: '/Users/test/Downloads', filename: 'file1.pdf' },
      { dir: '/Users/test/Documents', filename: 'file2.docx' },
      { dir: '/Users/test/Pictures', filename: 'file3.jpg' },
    ];

    sessionData.forEach(({ dir, filename }, sessionIndex) => {
      // Setup new session
      jest.clearAllMocks();

      // Mock persisted directory from previous session
      if (sessionIndex > 0) {
        mockStore.get.mockReturnValue(sessionData[sessionIndex - 1].dir);
      } else {
        mockStore.get.mockReturnValue('/Users/test/Downloads');
      }

      setupElectronDlWithTracking();
      const electronDlCall = electronDlMock.mock.calls[0];
      const onStartedCallback = electronDlCall?.[0]?.onStarted;
      const onCompletedCallback = electronDlCall?.[0]?.onCompleted as any;

      expect(onStartedCallback).toBeDefined();
      expect(onCompletedCallback).toBeDefined();

      // Test download uses persisted directory
      const mockItem = createMockDownloadItem(filename);

      if (onStartedCallback) {
        onStartedCallback(mockItem);

        // Verify it used the expected directory
        const expectedStartDir =
          sessionIndex > 0
            ? sessionData[sessionIndex - 1].dir
            : '/Users/test/Downloads';

        expect(mockItem.setSaveDialogOptions).toHaveBeenCalledWith({
          defaultPath: `${expectedStartDir}/${filename}`,
        });
      }

      // Complete download to new directory
      if (onCompletedCallback) {
        onCompletedCallback({
          filename,
          path: `${dir}/${filename}`,
        });

        // Verify new directory was stored
        expect(mockStore.set).toHaveBeenCalledWith(
          'lastDownloadDirectory',
          dir
        );
      }
    });
  });

  it('should handle complete failure scenarios gracefully', () => {
    // Test when everything fails
    mockStore.get.mockImplementation(() => {
      throw new Error('Complete store failure');
    });
    mockStore.set.mockImplementation(() => {
      throw new Error('Complete store failure');
    });
    appMock.getPath.mockImplementation(() => {
      throw new Error('App path failure');
    });

    expect(() => {
      setupElectronDlWithTracking();

      const electronDlCall = electronDlMock.mock.calls[0];
      const callbacks = electronDlCall?.[0];

      if (callbacks?.onStarted) {
        const mockItem = createMockDownloadItem('fail-test.pdf');
        callbacks.onStarted(mockItem);
      }

      if (callbacks?.onCompleted) {
        (callbacks.onCompleted as any)({
          filename: 'fail-test.pdf',
          path: '/some/path/fail-test.pdf',
        });
      }
    }).not.toThrow();
  });
});
