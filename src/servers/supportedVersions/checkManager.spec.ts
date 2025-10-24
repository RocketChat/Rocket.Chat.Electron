import * as storeModule from '../../store';
import {
  DEBOUNCE_DELAY,
  THROTTLE_INTERVAL,
  MAX_RETRY_ATTEMPTS,
  FAILURE_THRESHOLD,
  RETRY_DELAYS,
  debounce,
  shouldThrottle,
  recordCheckAttempt,
  scheduleVersionCheck,
  cancelVersionCheck,
  getServerFailureCount,
  isFailureThresholdReached,
} from './checkManager';

// Mock the store
jest.mock('../../store', () => ({
  select: jest.fn(() => ({ versionCheckFailureCount: 0 })),
}));

describe('checkManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('debounce', () => {
    it('should debounce multiple rapid calls', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      // Call multiple times rapidly
      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should have been called only once with last argument
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call3');

      jest.useRealTimers();
    });

    it('should reset debounce timer on new calls', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn('call1');
      jest.advanceTimersByTime(500);

      // Call again, should reset timer
      debouncedFn('call2');
      jest.advanceTimersByTime(500);

      // Should still not be called (timer reset)
      expect(mockFn).not.toHaveBeenCalled();

      // Advance remaining time
      jest.advanceTimersByTime(500);

      // Now should be called
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call2');

      jest.useRealTimers();
    });
  });

  describe('throttle', () => {
    it('should prevent checks within 30 second window', () => {
      const serverUrl = 'https://test.com';

      // Record a check
      recordCheckAttempt(serverUrl);

      // Should be throttled immediately after
      expect(shouldThrottle(serverUrl)).toBe(true);
    });

    it('should allow checks after throttle period', () => {
      jest.useFakeTimers();
      const serverUrl = 'https://test.com';

      // Record a check
      recordCheckAttempt(serverUrl);

      // Fast-forward past throttle interval
      jest.advanceTimersByTime(THROTTLE_INTERVAL + 1000);

      // Should not be throttled anymore
      expect(shouldThrottle(serverUrl)).toBe(false);

      jest.useRealTimers();
    });

    it('should not throttle first check', () => {
      const serverUrl = 'https://new-server.com';

      // First check should not be throttled
      expect(shouldThrottle(serverUrl)).toBe(false);
    });
  });

  describe('retry logic', () => {
    it('should retry failed checks up to 3 times', async () => {
      jest.useFakeTimers();
      const serverUrl = 'https://test.com';
      const mockCheckFn = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      scheduleVersionCheck(serverUrl, mockCheckFn, { immediate: true });

      // Execute immediate check (retry 0)
      await jest.advanceTimersByTimeAsync(0);
      expect(mockCheckFn).toHaveBeenCalledTimes(1);

      // Wait for retry 1 (5s delay)
      await jest.advanceTimersByTimeAsync(RETRY_DELAYS[1]);
      expect(mockCheckFn).toHaveBeenCalledTimes(2);

      // Wait for retry 2 (15s delay)
      await jest.advanceTimersByTimeAsync(RETRY_DELAYS[2]);
      expect(mockCheckFn).toHaveBeenCalledTimes(3);

      // Should not retry a 4th time
      await jest.advanceTimersByTimeAsync(30000);
      expect(mockCheckFn).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('should use exponential backoff delays', async () => {
      expect(RETRY_DELAYS[0]).toBe(0);
      expect(RETRY_DELAYS[1]).toBe(5000);
      expect(RETRY_DELAYS[2]).toBe(15000);
    });

    it('should stop retrying after max attempts', async () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(3);
    });

    it('should not retry on success', async () => {
      jest.useFakeTimers();
      const serverUrl = 'https://test.com';
      const mockCheckFn = jest.fn().mockResolvedValue(undefined);

      scheduleVersionCheck(serverUrl, mockCheckFn, { immediate: true });

      // Execute immediate check
      await jest.advanceTimersByTimeAsync(0);
      expect(mockCheckFn).toHaveBeenCalledTimes(1);

      // Wait for potential retries
      await jest.advanceTimersByTimeAsync(30000);

      // Should still only be called once (no retries on success)
      expect(mockCheckFn).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('scheduleVersionCheck', () => {
    it('should schedule immediate checks with no delay', async () => {
      jest.useFakeTimers();
      const serverUrl = 'https://test.com';
      const mockCheckFn = jest.fn().mockResolvedValue(undefined);

      scheduleVersionCheck(serverUrl, mockCheckFn, { immediate: true });

      // Should execute immediately
      await jest.advanceTimersByTimeAsync(0);
      expect(mockCheckFn).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should debounce non-immediate checks', async () => {
      jest.useFakeTimers();
      const serverUrl = 'https://debounce-test.com'; // Unique URL to avoid throttle
      const mockCheckFn = jest.fn().mockResolvedValue(undefined);

      scheduleVersionCheck(serverUrl, mockCheckFn, { immediate: false });

      // Should not execute immediately
      await jest.advanceTimersByTimeAsync(0);
      expect(mockCheckFn).not.toHaveBeenCalled();

      // Should execute after debounce delay
      await jest.advanceTimersByTimeAsync(DEBOUNCE_DELAY);
      expect(mockCheckFn).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should cancel existing pending checks', async () => {
      jest.useFakeTimers();
      const serverUrl = 'https://cancel-test.com'; // Unique URL to avoid throttle
      const mockCheckFn = jest.fn().mockResolvedValue(undefined);

      // Schedule first check
      scheduleVersionCheck(serverUrl, mockCheckFn, { immediate: false });

      // Schedule second check before first executes
      await jest.advanceTimersByTimeAsync(DEBOUNCE_DELAY / 2);
      scheduleVersionCheck(serverUrl, mockCheckFn, { immediate: false });

      // Advance past original delay
      await jest.advanceTimersByTimeAsync(DEBOUNCE_DELAY / 2);
      expect(mockCheckFn).not.toHaveBeenCalled();

      // Advance to new delay
      await jest.advanceTimersByTimeAsync(DEBOUNCE_DELAY / 2);
      expect(mockCheckFn).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should respect throttle for non-immediate checks', () => {
      jest.useFakeTimers();
      const serverUrl = 'https://test.com';
      const mockCheckFn = jest.fn().mockResolvedValue(undefined);

      // Record a recent check
      recordCheckAttempt(serverUrl);

      // Try to schedule another non-immediate check
      scheduleVersionCheck(serverUrl, mockCheckFn, { immediate: false });

      // Should be throttled and not scheduled
      jest.advanceTimersByTime(DEBOUNCE_DELAY);
      expect(mockCheckFn).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('cancelVersionCheck', () => {
    it('should cancel pending checks', async () => {
      jest.useFakeTimers();
      const serverUrl = 'https://test.com';
      const mockCheckFn = jest.fn().mockResolvedValue(undefined);

      scheduleVersionCheck(serverUrl, mockCheckFn, { immediate: false });

      // Cancel before execution
      cancelVersionCheck(serverUrl);

      // Advance time
      await jest.advanceTimersByTimeAsync(DEBOUNCE_DELAY);

      // Should not have been called
      expect(mockCheckFn).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('failure tracking', () => {
    it('should correctly track failure count', () => {
      const selectMock = storeModule.select as jest.Mock;
      selectMock.mockReturnValue({
        versionCheckFailureCount: 2,
      });

      const count = getServerFailureCount('https://test.com');
      expect(count).toBe(2);
    });

    it('should return 0 for servers with no failures', () => {
      const selectMock = storeModule.select as jest.Mock;
      selectMock.mockReturnValue(undefined);

      const count = getServerFailureCount('https://test.com');
      expect(count).toBe(0);
    });

    it('should identify when threshold is reached', () => {
      const selectMock = storeModule.select as jest.Mock;

      selectMock.mockReturnValue({
        versionCheckFailureCount: FAILURE_THRESHOLD,
      });
      expect(isFailureThresholdReached('https://test.com')).toBe(true);

      selectMock.mockReturnValue({
        versionCheckFailureCount: FAILURE_THRESHOLD + 1,
      });
      expect(isFailureThresholdReached('https://test.com')).toBe(true);

      selectMock.mockReturnValue({
        versionCheckFailureCount: FAILURE_THRESHOLD - 1,
      });
      expect(isFailureThresholdReached('https://test.com')).toBe(false);
    });

    it('should use correct failure threshold', () => {
      expect(FAILURE_THRESHOLD).toBe(3);
    });
  });
});
