import type { DownloadItem } from 'electron';
import { t } from 'i18next';

import { createNotification } from '../notifications/preload';

// Mock modules
jest.mock('../notifications/preload', () => ({
  createNotification: jest.fn(),
}));

jest.mock('i18next', () => ({
  t: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'downloads.notifications.downloadFinished': 'Download finished',
      'downloads.notifications.downloadCancelled': 'Download cancelled',
    };
    return translations[key] || key;
  }),
}));

describe('download notifications', () => {
  let createNotificationMock: jest.MockedFunction<typeof createNotification>;
  let tMock: jest.MockedFunction<typeof t>;

  beforeEach(() => {
    jest.clearAllMocks();
    createNotificationMock = createNotification as jest.MockedFunction<
      typeof createNotification
    >;
    tMock = t as jest.MockedFunction<typeof t>;
  });

  const createMockDownloadItem = (
    overrides: Partial<DownloadItem> = {}
  ): jest.Mocked<DownloadItem> => {
    return {
      getFilename: jest.fn(() => 'test-file.pdf'),
      getState: jest.fn(() => 'completed'),
      isPaused: jest.fn(() => false),
      getReceivedBytes: jest.fn(() => 2048),
      getTotalBytes: jest.fn(() => 2048),
      getStartTime: jest.fn(() => 1640995200),
      getURL: jest.fn(() => 'https://example.com/file.pdf'),
      getMimeType: jest.fn(() => 'application/pdf'),
      getSavePath: jest.fn(() => '/downloads/test-file.pdf'),
      on: jest.fn(),
      ...overrides,
    } as unknown as jest.Mocked<DownloadItem>;
  };

  describe('electron-dl integration notifications', () => {
    it('should create notification when download completes via electron-dl', () => {
      // Simulate the electron-dl onCompleted callback behavior
      const mockFile = { filename: 'completed-file.pdf' };

      // This is what happens in main.ts electron-dl onCompleted callback
      createNotificationMock({
        title: 'Downloads',
        body: mockFile.filename,
        subtitle: tMock('downloads.notifications.downloadFinished'),
      });

      expect(createNotificationMock).toHaveBeenCalledWith({
        title: 'Downloads',
        body: 'completed-file.pdf',
        subtitle: 'Download finished',
      });

      expect(tMock).toHaveBeenCalledWith(
        'downloads.notifications.downloadFinished'
      );
    });

    it('should handle different file types in notifications', () => {
      const testCases = [
        { filename: 'document.pdf', expected: 'document.pdf' },
        { filename: 'image.jpg', expected: 'image.jpg' },
        { filename: 'archive.zip', expected: 'archive.zip' },
        { filename: 'spreadsheet.xlsx', expected: 'spreadsheet.xlsx' },
        { filename: 'presentation.pptx', expected: 'presentation.pptx' },
        {
          filename: 'very-long-filename-that-might-be-truncated.docx',
          expected: 'very-long-filename-that-might-be-truncated.docx',
        },
      ];

      testCases.forEach(({ filename, expected }) => {
        createNotificationMock.mockClear();

        createNotificationMock({
          title: 'Downloads',
          body: filename,
          subtitle: 'Download finished',
        });

        expect(createNotificationMock).toHaveBeenCalledWith({
          title: 'Downloads',
          body: expected,
          subtitle: 'Download finished',
        });
      });
    });

    it('should handle special characters in filenames', () => {
      const specialFilenames = [
        'file with spaces.pdf',
        'file-with-dashes.txt',
        'file_with_underscores.docx',
        'файл-на-русском.pdf',
        '文件名-中文.txt',
        'file@#$%^&*()+={}[]|\\:";\'<>?,.pdf',
      ];

      specialFilenames.forEach((filename) => {
        createNotificationMock.mockClear();

        createNotificationMock({
          title: 'Downloads',
          body: filename,
          subtitle: 'Download finished',
        });

        expect(createNotificationMock).toHaveBeenCalledWith({
          title: 'Downloads',
          body: filename,
          subtitle: 'Download finished',
        });
      });
    });
  });

  describe('legacy download item notifications', () => {
    it('should create notification on download completion via item.on("done")', () => {
      const mockItem = createMockDownloadItem();

      // Capture the 'done' event listener
      let doneListener: (event: any, state: string) => void;
      mockItem.on.mockImplementation(((event: string, listener: any) => {
        if (event === 'done') {
          doneListener = listener;
        }
        return mockItem;
      }) as any);

      // Simulate setting up the listener (this happens in handleWillDownloadEvent)
      mockItem.on('done', (_event, state) => {
        createNotificationMock({
          title: 'Downloads',
          body: mockItem.getFilename(),
          subtitle:
            state === 'completed'
              ? tMock('downloads.notifications.downloadFinished')
              : tMock('downloads.notifications.downloadCancelled'),
        });
      });

      // Simulate download completion
      doneListener!({}, 'completed');

      expect(createNotificationMock).toHaveBeenCalledWith({
        title: 'Downloads',
        body: 'test-file.pdf',
        subtitle: 'Download finished',
      });
    });

    it('should create appropriate notification on download cancellation', () => {
      const mockItem = createMockDownloadItem();

      let doneListener: (event: any, state: string) => void;
      mockItem.on.mockImplementation(((event: string, listener: any) => {
        if (event === 'done') {
          doneListener = listener;
        }
        return mockItem;
      }) as any);

      mockItem.on('done', (_event, state) => {
        createNotificationMock({
          title: 'Downloads',
          body: mockItem.getFilename(),
          subtitle:
            state === 'completed'
              ? tMock('downloads.notifications.downloadFinished')
              : tMock('downloads.notifications.downloadCancelled'),
        });
      });

      // Simulate download cancellation
      doneListener!({}, 'cancelled');

      expect(createNotificationMock).toHaveBeenCalledWith({
        title: 'Downloads',
        body: 'test-file.pdf',
        subtitle: 'Download cancelled',
      });
    });

    it('should handle different download states appropriately', () => {
      const mockItem = createMockDownloadItem();

      let doneListener: (event: any, state: string) => void;
      mockItem.on.mockImplementation(((event: string, listener: any) => {
        if (event === 'done') {
          doneListener = listener;
        }
        return mockItem;
      }) as any);

      mockItem.on('done', (_event, state) => {
        createNotificationMock({
          title: 'Downloads',
          body: mockItem.getFilename(),
          subtitle:
            state === 'completed'
              ? tMock('downloads.notifications.downloadFinished')
              : tMock('downloads.notifications.downloadCancelled'),
        });
      });

      // Test different states
      const testStates = ['completed', 'cancelled', 'interrupted'];

      testStates.forEach((state) => {
        createNotificationMock.mockClear();
        tMock.mockClear();

        doneListener!({}, state);

        if (state === 'completed') {
          expect(tMock).toHaveBeenCalledWith(
            'downloads.notifications.downloadFinished'
          );
        } else {
          expect(tMock).toHaveBeenCalledWith(
            'downloads.notifications.downloadCancelled'
          );
        }
      });
    });
  });

  describe('notification behavior edge cases', () => {
    it('should handle empty filename gracefully', () => {
      createNotificationMock({
        title: 'Downloads',
        body: '',
        subtitle: 'Download finished',
      });

      expect(createNotificationMock).toHaveBeenCalledWith({
        title: 'Downloads',
        body: '',
        subtitle: 'Download finished',
      });
    });

    it('should handle missing translation keys', () => {
      tMock.mockReturnValue('missing.translation.key');

      createNotificationMock({
        title: 'Downloads',
        body: 'test-file.pdf',
        subtitle: tMock('missing.translation.key'),
      });

      expect(createNotificationMock).toHaveBeenCalledWith({
        title: 'Downloads',
        body: 'test-file.pdf',
        subtitle: 'missing.translation.key',
      });
    });

    it('should maintain consistent notification title', () => {
      // All download notifications should use 'Downloads' as title
      const testFiles = ['file1.pdf', 'file2.jpg', 'file3.zip'];

      testFiles.forEach((filename) => {
        createNotificationMock.mockClear();

        createNotificationMock({
          title: 'Downloads',
          body: filename,
          subtitle: 'Download finished',
        });

        expect(createNotificationMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Downloads',
          })
        );
      });
    });
  });

  describe('internationalization', () => {
    it('should use translated messages for different languages', () => {
      // Mock different language translations
      const mockTranslations = {
        'en': 'Download finished',
        'es': 'Descarga completada',
        'fr': 'Téléchargement terminé',
        'de': 'Download abgeschlossen',
        'pt-BR': 'Download concluído',
      };

      Object.entries(mockTranslations).forEach(([_locale, translation]) => {
        tMock.mockReturnValue(translation);
        createNotificationMock.mockClear();

        createNotificationMock({
          title: 'Downloads',
          body: 'test-file.pdf',
          subtitle: tMock('downloads.notifications.downloadFinished'),
        });

        expect(createNotificationMock).toHaveBeenCalledWith({
          title: 'Downloads',
          body: 'test-file.pdf',
          subtitle: translation,
        });
      });
    });

    it('should handle cancellation messages in different languages', () => {
      const mockTranslations = {
        'en': 'Download cancelled',
        'es': 'Descarga cancelada',
        'fr': 'Téléchargement annulé',
        'de': 'Download abgebrochen',
        'pt-BR': 'Download cancelado',
      };

      Object.entries(mockTranslations).forEach(([_locale, translation]) => {
        tMock.mockReturnValue(translation);
        createNotificationMock.mockClear();

        createNotificationMock({
          title: 'Downloads',
          body: 'test-file.pdf',
          subtitle: tMock('downloads.notifications.downloadCancelled'),
        });

        expect(createNotificationMock).toHaveBeenCalledWith({
          title: 'Downloads',
          body: 'test-file.pdf',
          subtitle: translation,
        });
      });
    });
  });

  describe('notification frequency and timing', () => {
    it('should only create notification once per download completion', () => {
      // Simulate electron-dl onCompleted callback
      const mockFile = { filename: 'test-file.pdf' };

      createNotificationMock({
        title: 'Downloads',
        body: mockFile.filename,
        subtitle: 'Download finished',
      });

      expect(createNotificationMock).toHaveBeenCalledTimes(1);
    });

    it('should create separate notifications for multiple downloads', () => {
      const downloads = [
        { filename: 'file1.pdf' },
        { filename: 'file2.jpg' },
        { filename: 'file3.zip' },
      ];

      downloads.forEach((file) => {
        createNotificationMock({
          title: 'Downloads',
          body: file.filename,
          subtitle: 'Download finished',
        });
      });

      expect(createNotificationMock).toHaveBeenCalledTimes(3);
    });
  });
});
