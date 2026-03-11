import {
  DOWNLOAD_CREATED,
  DOWNLOAD_REMOVED,
  DOWNLOAD_UPDATED,
  DOWNLOADS_CLEARED,
} from '../actions';
import type { Download } from '../common';
import { DownloadStatus } from '../common';
import { downloads } from './downloads';

describe('downloads reducer', () => {
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

  it('should return initial state', () => {
    expect(downloads(undefined, { type: 'UNKNOWN_ACTION' } as any)).toEqual({});
  });

  describe('DOWNLOAD_CREATED', () => {
    it('should add a new download to the state', () => {
      const action = {
        type: DOWNLOAD_CREATED,
        payload: mockDownload,
      } as const;

      const newState = downloads({}, action as any);

      expect(newState).toEqual({
        [mockDownload.itemId]: mockDownload,
      });
    });

    it('should add download to existing state without affecting other downloads', () => {
      const existingDownload: Download = {
        ...mockDownload,
        itemId: 1640995100000,
        fileName: 'existing-file.txt',
      };

      const initialState = {
        [existingDownload.itemId]: existingDownload,
      };

      const newDownload: Download = {
        ...mockDownload,
        itemId: 1640995300000,
        fileName: 'new-file.pdf',
      };

      const action = {
        type: DOWNLOAD_CREATED,
        payload: newDownload,
      };

      const newState = downloads(initialState, action as any);

      expect(newState).toEqual({
        [existingDownload.itemId]: existingDownload,
        [newDownload.itemId]: newDownload,
      });
    });
  });

  describe('DOWNLOAD_UPDATED', () => {
    it('should update an existing download', () => {
      const initialState = {
        [mockDownload.itemId]: mockDownload,
      };

      const updatePayload = {
        itemId: mockDownload.itemId,
        receivedBytes: 1536,
        state: 'progressing' as const,
        endTime: 1640995300000,
      };

      const action = {
        type: DOWNLOAD_UPDATED,
        payload: updatePayload,
      };

      const newState = downloads(initialState, action as any);

      expect(newState[mockDownload.itemId]).toEqual({
        ...mockDownload,
        receivedBytes: 1536,
        endTime: 1640995300000,
      });
    });

    it('should handle download completion', () => {
      const initialState = {
        [mockDownload.itemId]: mockDownload,
      };

      const updatePayload = {
        itemId: mockDownload.itemId,
        state: 'completed' as const,
        status: DownloadStatus.ALL,
        endTime: 1640995400000,
      };

      const action = {
        type: DOWNLOAD_UPDATED,
        payload: updatePayload,
      };

      const newState = downloads(initialState, action as any);

      expect(newState[mockDownload.itemId]).toEqual({
        ...mockDownload,
        state: 'completed',
        endTime: 1640995400000,
      });
    });

    it('should handle download cancellation', () => {
      const initialState = {
        [mockDownload.itemId]: mockDownload,
      };

      const updatePayload = {
        itemId: mockDownload.itemId,
        state: 'cancelled' as const,
        status: DownloadStatus.CANCELLED,
        endTime: 1640995400000,
      };

      const action = {
        type: DOWNLOAD_UPDATED,
        payload: updatePayload,
      };

      const newState = downloads(initialState, action as any);

      expect(newState[mockDownload.itemId]).toEqual({
        ...mockDownload,
        state: 'cancelled',
        status: DownloadStatus.CANCELLED,
        endTime: 1640995400000,
      });
    });

    it('should do nothing if download does not exist', () => {
      const initialState = {
        [mockDownload.itemId]: mockDownload,
      };

      const updatePayload = {
        itemId: 9999999999999, // Non-existent itemId
        receivedBytes: 1536,
      };

      const action = {
        type: DOWNLOAD_UPDATED,
        payload: updatePayload,
      };

      const newState = downloads(initialState, action as any);

      expect(newState).toEqual(initialState);
    });
  });

  describe('DOWNLOAD_REMOVED', () => {
    it('should remove a download from the state', () => {
      const anotherDownload: Download = {
        ...mockDownload,
        itemId: 1640995300000,
        fileName: 'another-file.txt',
      };

      const initialState = {
        [mockDownload.itemId]: mockDownload,
        [anotherDownload.itemId]: anotherDownload,
      };

      const action = {
        type: DOWNLOAD_REMOVED,
        payload: mockDownload.itemId,
      };

      const newState = downloads(initialState, action as any);

      expect(newState).toEqual({
        [anotherDownload.itemId]: anotherDownload,
      });
    });

    it('should do nothing if download does not exist', () => {
      const initialState = {
        [mockDownload.itemId]: mockDownload,
      };

      const action = {
        type: DOWNLOAD_REMOVED,
        payload: 9999999999999, // Non-existent itemId
      };

      const newState = downloads(initialState, action as any);

      expect(newState).toEqual(initialState);
    });
  });

  describe('DOWNLOADS_CLEARED', () => {
    it('should clear all downloads from the state', () => {
      const anotherDownload: Download = {
        ...mockDownload,
        itemId: 1640995300000,
        fileName: 'another-file.txt',
      };

      const initialState = {
        [mockDownload.itemId]: mockDownload,
        [anotherDownload.itemId]: anotherDownload,
      };

      const action = {
        type: DOWNLOADS_CLEARED,
      };

      const newState = downloads(initialState, action as any);

      expect(newState).toEqual({});
    });

    it('should return empty state when already empty', () => {
      const action = {
        type: DOWNLOADS_CLEARED,
      };

      const newState = downloads({}, action as any);

      expect(newState).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle partial update payloads', () => {
      const initialState = {
        [mockDownload.itemId]: mockDownload,
      };

      const action = {
        type: DOWNLOAD_UPDATED,
        payload: {
          itemId: mockDownload.itemId,
          receivedBytes: 1800,
          // Only updating receivedBytes, other fields should remain unchanged
        },
      };

      const newState = downloads(initialState, action as any);

      expect(newState[mockDownload.itemId]).toEqual({
        ...mockDownload,
        receivedBytes: 1800,
      });
    });

    it('should preserve immutability - not mutate original state', () => {
      const initialState = {
        [mockDownload.itemId]: mockDownload,
      };

      const action = {
        type: DOWNLOAD_UPDATED,
        payload: {
          itemId: mockDownload.itemId,
          receivedBytes: 1800,
        },
      };

      const newState = downloads(initialState, action as any);

      // Original state should not be mutated
      expect(initialState[mockDownload.itemId].receivedBytes).toBe(1024);
      expect(newState[mockDownload.itemId].receivedBytes).toBe(1800);
      expect(newState).not.toBe(initialState);
    });

    it('should handle multiple download status types', () => {
      const pausedDownload: Download = {
        ...mockDownload,
        itemId: 1640995300000,
        state: 'paused',
        status: DownloadStatus.PAUSED,
      };

      const cancelledDownload: Download = {
        ...mockDownload,
        itemId: 1640995400000,
        state: 'cancelled',
        status: DownloadStatus.CANCELLED,
      };

      let state: Record<number, Download> = {};

      // Add downloads with different statuses
      state = downloads(state, {
        type: DOWNLOAD_CREATED,
        payload: mockDownload,
      } as any);

      state = downloads(state, {
        type: DOWNLOAD_CREATED,
        payload: pausedDownload,
      } as any);

      state = downloads(state, {
        type: DOWNLOAD_CREATED,
        payload: cancelledDownload,
      } as any);

      expect(Object.keys(state)).toHaveLength(3);
      expect(state[mockDownload.itemId]?.status).toBe(DownloadStatus.ALL);
      expect(state[pausedDownload.itemId]?.status).toBe(DownloadStatus.PAUSED);
      expect(state[cancelledDownload.itemId]?.status).toBe(
        DownloadStatus.CANCELLED
      );
    });
  });
});
