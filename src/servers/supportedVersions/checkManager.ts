import { select } from '../../store';

export const DEBOUNCE_DELAY = 5000; // 5 seconds
export const THROTTLE_INTERVAL = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const FAILURE_THRESHOLD = 3; // Require 3 consecutive failures
export const RETRY_DELAYS = [0, 5000, 15000]; // 0s, 5s, 15s

type PendingCheck = {
  url: string;
  timeoutId: NodeJS.Timeout;
  retryCount: number;
};

const pendingChecks = new Map<string, PendingCheck>();
const lastCheckTimes = new Map<string, number>();

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, delay);
  };
};

export const shouldThrottle = (serverUrl: string): boolean => {
  const lastCheckTime = lastCheckTimes.get(serverUrl);
  if (!lastCheckTime) return false;

  const timeSinceLastCheck = Date.now() - lastCheckTime;
  return timeSinceLastCheck < THROTTLE_INTERVAL;
};

export const recordCheckAttempt = (serverUrl: string): void => {
  lastCheckTimes.set(serverUrl, Date.now());
};

export const scheduleVersionCheck = (
  serverUrl: string,
  checkFn: (url: string) => Promise<void>,
  options: { immediate?: boolean; retry?: number } = {}
): void => {
  const { immediate = false, retry = 0 } = options;

  // Cancel any pending check for this server
  const existing = pendingChecks.get(serverUrl);
  if (existing) {
    clearTimeout(existing.timeoutId);
  }

  // Check throttle limit unless it's a retry or immediate
  if (!immediate && !retry && shouldThrottle(serverUrl)) {
    console.log(
      `[SupportedVersions] Throttling check for ${serverUrl}, last check was too recent`
    );
    return;
  }

  let delay = DEBOUNCE_DELAY;
  if (immediate) {
    delay = 0;
  } else if (retry) {
    delay = RETRY_DELAYS[retry] || 0;
  }

  console.log(
    `[SupportedVersions] Scheduling check for ${serverUrl} in ${delay}ms (retry: ${retry})`
  );

  const timeoutId = setTimeout(async () => {
    pendingChecks.delete(serverUrl);
    recordCheckAttempt(serverUrl);

    try {
      await checkFn(serverUrl);
      console.log(`[SupportedVersions] Check succeeded for ${serverUrl}`);
    } catch (error) {
      console.error(
        `[SupportedVersions] Check failed for ${serverUrl}, attempt ${retry + 1}/${MAX_RETRY_ATTEMPTS}`,
        error
      );

      // Retry with exponential backoff
      if (retry < MAX_RETRY_ATTEMPTS - 1) {
        scheduleVersionCheck(serverUrl, checkFn, {
          immediate: false,
          retry: retry + 1,
        });
      } else {
        console.error(
          `[SupportedVersions] All retry attempts exhausted for ${serverUrl}`
        );
      }
    }
  }, delay);

  pendingChecks.set(serverUrl, {
    url: serverUrl,
    timeoutId,
    retryCount: retry,
  });
};

export const cancelVersionCheck = (serverUrl: string): void => {
  const pending = pendingChecks.get(serverUrl);
  if (pending) {
    clearTimeout(pending.timeoutId);
    pendingChecks.delete(serverUrl);
    console.log(`[SupportedVersions] Cancelled pending check for ${serverUrl}`);
  }
};

export const getServerFailureCount = (serverUrl: string): number => {
  const server = select(({ servers }) =>
    servers.find((s) => s.url === serverUrl)
  );
  return server?.versionCheckFailureCount || 0;
};

export const isFailureThresholdReached = (serverUrl: string): boolean => {
  return getServerFailureCount(serverUrl) >= FAILURE_THRESHOLD;
};
