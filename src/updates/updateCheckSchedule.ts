export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const UPDATE_CHECK_MIN_FAILURE_BACKOFF_MS = 60 * 60 * 1000;
export const UPDATE_CHECK_MAX_FAILURE_BACKOFF_MS = 6 * 60 * 60 * 1000;

export type UpdateCheckHistory = {
  lastAttemptAt: number | null;
  consecutiveFailures: number;
};

/** 1 h after the first failure, then doubling up to 6 h. */
export const getFailureBackoffMs = (consecutiveFailures: number): number =>
  Math.min(
    UPDATE_CHECK_MIN_FAILURE_BACKOFF_MS *
      2 ** Math.max(0, consecutiveFailures - 1),
    UPDATE_CHECK_MAX_FAILURE_BACKOFF_MS
  );

export const getNextUpdateCheckDelayMs = (
  { lastAttemptAt, consecutiveFailures }: UpdateCheckHistory,
  now: number
): number => {
  if (lastAttemptAt === null) {
    return 0;
  }

  const wait =
    consecutiveFailures > 0
      ? getFailureBackoffMs(consecutiveFailures)
      : UPDATE_CHECK_INTERVAL_MS;

  // Clamped to `wait`: when the system clock moves backwards, the next check
  // must not slip further than one full wait.
  return Math.min(wait, Math.max(0, lastAttemptAt + wait - now));
};
