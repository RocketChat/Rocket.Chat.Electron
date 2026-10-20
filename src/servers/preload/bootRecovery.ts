import { reloadServer } from './reloadServer';

// `bootWatchdog.ts` reads this key in its CDP probe; keep both in sync.
export const BOOT_RECOVERY_ATTEMPTS_KEY =
  'rocketChatDesktopBootRecoveryAttempts';
export const MAX_BOOT_RECOVERY_ATTEMPTS = 2;

const getBootRecoveryAttempts = (): number => {
  try {
    return (
      Number(window.sessionStorage.getItem(BOOT_RECOVERY_ATTEMPTS_KEY)) || 0
    );
  } catch (error) {
    return 0;
  }
};

// Reloading in place never recovers a wedged webview (stale service worker or
// cache keeps serving a broken bundle), so recovery goes through
// reloadServer(), which clears the service worker and cache storage before
// reloading. The sessionStorage counter survives those reloads and caps the
// attempts, so a genuinely broken server degrades instead of reload-looping.
export const attemptBootRecovery = (reason: string): void => {
  const attempts = getBootRecoveryAttempts();

  if (attempts >= MAX_BOOT_RECOVERY_ATTEMPTS) {
    console.error(
      `[Rocket.Chat Desktop] ${reason}. Boot recovery attempts exhausted (${attempts}); giving up. Restart the app or use "Reload Clearing Cache" to retry.`
    );
    return;
  }

  try {
    window.sessionStorage.setItem(
      BOOT_RECOVERY_ATTEMPTS_KEY,
      String(attempts + 1)
    );
  } catch (error) {
    // Without a persisted counter every reload would read zero attempts and
    // recover again, forever — safer to not recover at all.
    console.error(
      `[Rocket.Chat Desktop] ${reason}. Boot recovery is disabled because sessionStorage is unavailable.`
    );
    return;
  }

  console.error(
    `[Rocket.Chat Desktop] ${reason}. Triggering force reload with cache clear to recover (attempt ${
      attempts + 1
    } of ${MAX_BOOT_RECOVERY_ATTEMPTS})...`
  );
  reloadServer();
};

export const resetBootRecovery = (): void => {
  try {
    window.sessionStorage.removeItem(BOOT_RECOVERY_ATTEMPTS_KEY);
  } catch (error) {
    // sessionStorage unavailable; nothing to reset
  }
};
