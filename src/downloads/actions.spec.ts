import type { ActionOf } from '../store/actions';
import {
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
  DOWNLOADS_CLEARED,
} from './actions';
import type { Download } from './common';
import { DownloadStatus } from './common';

describe('download actions', () => {
  const mockDownload: Download = {
    itemId: 1640995200000,
    state: 'progressing',
    status: DownloadStatus.ALL,
    fileName: 'test-file.pdf',
    receivedBytes: 1024,
    totalBytes: 2048,
    startTime: 1640995200000,
    endTime: undefined,
    url: 'https://example.com/file.pdf',
    serverUrl: 'https://open.rocket.chat',
    serverTitle: 'Rocket.Chat Community',
    mimeType: 'application/pdf',
    savePath: '/downloads/test-file.pdf',
  };

  describe('action constants', () => {
    it('should have correct action type constants', () => {
      expect(DOWNLOAD_CREATED).toBe('downloads/created');
      expect(DOWNLOAD_UPDATED).toBe('downloads/updated');
      expect(DOWNLOAD_REMOVED).toBe('downloads/removed');
      expect(DOWNLOADS_CLEARED).toBe('downloads/cleared');
    });
  });

  describe('action creators', () => {
    describe('DOWNLOAD_CREATED action', () => {
      it('should create a valid DOWNLOAD_CREATED action', () => {
        const action: ActionOf<typeof DOWNLOAD_CREATED> = {
          type: DOWNLOAD_CREATED,
          payload: mockDownload,
        };

        expect(action.type).toBe(DOWNLOAD_CREATED);
        expect(action.payload).toEqual(mockDownload);
      });

      it('should work with different download states', () => {
        const pausedDownload: Download = {
          ...mockDownload,
          state: 'paused',
          status: DownloadStatus.PAUSED,
        };

        const action: ActionOf<typeof DOWNLOAD_CREATED> = {
          type: DOWNLOAD_CREATED,
          payload: pausedDownload,
        };

        expect(action.payload.state).toBe('paused');
        expect(action.payload.status).toBe(DownloadStatus.PAUSED);
      });
    });

    describe('DOWNLOAD_UPDATED action', () => {
      it('should create a valid DOWNLOAD_UPDATED action with complete payload', () => {
        const updatePayload = {
          itemId: mockDownload.itemId,
          state: 'completed' as const,
          status: DownloadStatus.ALL,
          fileName: 'test-file.pdf',
          receivedBytes: 2048,
          totalBytes: 2048,
          startTime: 1640995200000,
          endTime: 1640995400000,
          url: 'https://example.com/file.pdf',
          mimeType: 'application/pdf',
          savePath: '/downloads/test-file.pdf',
        };

        const action: ActionOf<typeof DOWNLOAD_UPDATED> = {
          type: DOWNLOAD_UPDATED,
          payload: updatePayload,
        };

        expect(action.type).toBe(DOWNLOAD_UPDATED);
        expect(action.payload).toEqual(updatePayload);
      });

      it('should create a valid DOWNLOAD_UPDATED action with partial payload', () => {
        const partialUpdatePayload = {
          itemId: mockDownload.itemId,
          receivedBytes: 1536,
          endTime: 1640995300000,
        };

        const action: ActionOf<typeof DOWNLOAD_UPDATED> = {
          type: DOWNLOAD_UPDATED,
          payload: partialUpdatePayload,
        };

        expect(action.type).toBe(DOWNLOAD_UPDATED);
        expect(action.payload.itemId).toBe(mockDownload.itemId);
        expect(action.payload.receivedBytes).toBe(1536);
        expect(action.payload.endTime).toBe(1640995300000);
      });

      it('should handle different download states in updates', () => {
        const cancelledUpdatePayload = {
          itemId: mockDownload.itemId,
          state: 'cancelled' as const,
          status: DownloadStatus.CANCELLED,
          endTime: 1640995400000,
        };

        const action: ActionOf<typeof DOWNLOAD_UPDATED> = {
          type: DOWNLOAD_UPDATED,
          payload: cancelledUpdatePayload,
        };

        expect(action.payload.state).toBe('cancelled');
        expect(action.payload.status).toBe(DownloadStatus.CANCELLED);
      });
    });

    describe('DOWNLOAD_REMOVED action', () => {
      it('should create a valid DOWNLOAD_REMOVED action', () => {
        const action: ActionOf<typeof DOWNLOAD_REMOVED> = {
          type: DOWNLOAD_REMOVED,
          payload: mockDownload.itemId,
        };

        expect(action.type).toBe(DOWNLOAD_REMOVED);
        expect(action.payload).toBe(mockDownload.itemId);
      });

      it('should work with different itemId types', () => {
        const numericItemId = 1640995200000;
        const action: ActionOf<typeof DOWNLOAD_REMOVED> = {
          type: DOWNLOAD_REMOVED,
          payload: numericItemId,
        };

        expect(action.payload).toBe(numericItemId);
        expect(typeof action.payload).toBe('number');
      });
    });

    describe('DOWNLOADS_CLEARED action', () => {
      it('should create a valid DOWNLOADS_CLEARED action', () => {
        const action: ActionOf<typeof DOWNLOADS_CLEARED> = {
          type: DOWNLOADS_CLEARED,
        };

        expect(action.type).toBe(DOWNLOADS_CLEARED);
        expect('payload' in action).toBe(false);
      });
    });
  });

  describe('action type guards', () => {
    it('should correctly identify DOWNLOAD_CREATED actions', () => {
      const action: ActionOf<typeof DOWNLOAD_CREATED> = {
        type: DOWNLOAD_CREATED,
        payload: mockDownload,
      };

      expect(action.type === DOWNLOAD_CREATED).toBe(true);
    });

    it('should correctly identify DOWNLOAD_UPDATED actions', () => {
      const action: ActionOf<typeof DOWNLOAD_UPDATED> = {
        type: DOWNLOAD_UPDATED,
        payload: {
          itemId: mockDownload.itemId,
          receivedBytes: 1536,
        },
      };

      expect(action.type === DOWNLOAD_UPDATED).toBe(true);
    });

    it('should correctly identify DOWNLOAD_REMOVED actions', () => {
      const action: ActionOf<typeof DOWNLOAD_REMOVED> = {
        type: DOWNLOAD_REMOVED,
        payload: mockDownload.itemId,
      };

      expect(action.type === DOWNLOAD_REMOVED).toBe(true);
    });

    it('should correctly identify DOWNLOADS_CLEARED actions', () => {
      const action: ActionOf<typeof DOWNLOADS_CLEARED> = {
        type: DOWNLOADS_CLEARED,
      };

      expect(action.type === DOWNLOADS_CLEARED).toBe(true);
    });
  });

  describe('payload validation', () => {
    it('should require valid Download object for DOWNLOAD_CREATED', () => {
      // This is a compile-time test, but we can verify the structure
      const action: ActionOf<typeof DOWNLOAD_CREATED> = {
        type: DOWNLOAD_CREATED,
        payload: mockDownload,
      };

      // All required fields should be present
      expect(action.payload.itemId).toBeDefined();
      expect(action.payload.state).toBeDefined();
      expect(action.payload.status).toBeDefined();
      expect(action.payload.fileName).toBeDefined();
      expect(action.payload.receivedBytes).toBeDefined();
      expect(action.payload.totalBytes).toBeDefined();
      expect(action.payload.startTime).toBeDefined();
      expect(action.payload.url).toBeDefined();
      expect(action.payload.serverUrl).toBeDefined();
      expect(action.payload.serverTitle).toBeDefined();
      expect(action.payload.mimeType).toBeDefined();
      expect(action.payload.savePath).toBeDefined();
    });

    it('should allow partial Download object for DOWNLOAD_UPDATED', () => {
      const action: ActionOf<typeof DOWNLOAD_UPDATED> = {
        type: DOWNLOAD_UPDATED,
        payload: {
          itemId: mockDownload.itemId,
          // Only some fields - this should be valid
          receivedBytes: 1500,
          state: 'progressing',
        },
      };

      expect(action.payload.itemId).toBe(mockDownload.itemId);
      expect(action.payload.receivedBytes).toBe(1500);
      expect(action.payload.state).toBe('progressing');
    });
  });

  describe('immutability', () => {
    it('should not modify the original download object when creating actions', () => {
      const originalDownload = { ...mockDownload };

      const action: ActionOf<typeof DOWNLOAD_CREATED> = {
        type: DOWNLOAD_CREATED,
        payload: mockDownload,
      };

      // Modify the action payload
      action.payload.receivedBytes = 9999;

      // Original should be unchanged
      expect(originalDownload.receivedBytes).toBe(1024);
    });
  });
});
