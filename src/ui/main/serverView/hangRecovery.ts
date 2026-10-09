import type { WebContents } from 'electron';
import { powerMonitor } from 'electron';

// A server view whose renderer is stuck cannot be reloaded or navigated: every
// reload waits on the hung process. The only way out is to kill that renderer
// so the next load starts a fresh process.
const unresponsiveWebContents = new WeakSet<WebContents>();
const killedForRecovery = new WeakSet<WebContents>();

export const markUnresponsive = (webContents: WebContents): void => {
  unresponsiveWebContents.add(webContents);
};

export const markResponsive = (webContents: WebContents): void => {
  unresponsiveWebContents.delete(webContents);
};

export const isUnresponsive = (webContents: WebContents): boolean =>
  unresponsiveWebContents.has(webContents);

export const RECOVERY_KILL_TIMEOUT_MS = 10_000;

// The kill is asynchronous: a load started before the stuck renderer is gone
// fails with ERR_FAILED and leaves the view crashed, so resolve only once the
// renderer has exited.
export const terminateIfUnresponsive = async (
  webContents: WebContents
): Promise<boolean> => {
  if (webContents.isDestroyed() || !unresponsiveWebContents.has(webContents)) {
    return false;
  }

  unresponsiveWebContents.delete(webContents);
  killedForRecovery.add(webContents);

  await new Promise<void>((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      webContents.removeListener('render-process-gone', done);
      webContents.removeListener('destroyed', done);
      resolve();
    };
    const timer = setTimeout(done, RECOVERY_KILL_TIMEOUT_MS);
    webContents.once('render-process-gone', done);
    webContents.once('destroyed', done);
    webContents.forcefullyCrashRenderer();
  });

  return true;
};

// The `render-process-gone` that follows our own kill is part of a recovery
// already in progress, not a crash to report.
export const consumeRecoveryKill = (webContents: WebContents): boolean =>
  killedForRecovery.delete(webContents);

export const HEARTBEAT_INTERVAL_MS = 5_000;
export const HEARTBEAT_TIMEOUT_MS = 15_000;

type HeartbeatCallbacks = {
  onStall: () => void;
  onRecover: () => void;
};

// Electron's `unresponsive` only fires when an input event or navigation goes
// unanswered, so an idle or background server view can hang unnoticed. The
// heartbeat runs a no-op in the page's main world: it cannot complete while
// the page's main thread is stuck, and IPC is not subject to the timer
// throttling of hidden pages.
export const startHeartbeat = (
  webContents: WebContents,
  { onStall, onRecover }: HeartbeatCallbacks
): { reset: () => void } => {
  let pendingSince: number | null = null;
  let probe = 0;
  let stalled = false;

  const reset = (): void => {
    pendingSince = null;
    probe += 1;
    stalled = false;
  };

  const beat = (): void => {
    if (webContents.isDestroyed()) {
      stop();
      return;
    }

    if (pendingSince !== null) {
      if (
        !stalled &&
        performance.now() - pendingSince >= HEARTBEAT_TIMEOUT_MS
      ) {
        stalled = true;
        onStall();
      }
      return;
    }

    const current = ++probe;
    pendingSince = performance.now();
    webContents.executeJavaScript('0').then(
      () => {
        if (current !== probe) {
          return;
        }
        pendingSince = null;
        if (stalled) {
          stalled = false;
          onRecover();
        }
      },
      () => {
        // The frame went away mid-navigation; that is not a hang.
        if (current === probe) {
          pendingSince = null;
        }
      }
    );
  };

  const handleResume = (): void => {
    if (pendingSince !== null) {
      pendingSince = performance.now();
    }
  };

  const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
  powerMonitor.on('resume', handleResume);

  const stop = (): void => {
    clearInterval(timer);
    powerMonitor.off('resume', handleResume);
  };

  webContents.once('destroyed', stop);

  return { reset };
};
