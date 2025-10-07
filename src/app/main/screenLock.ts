/* eslint-disable import/no-duplicates */
// eslint-disable-next-line import/order
import { watch, dispatch, listen } from '../../store';
import type { RootState } from '../../store/rootReducer';
import {
  MENU_BAR_LOCK_SCREEN_CLICKED,
  WEBVIEW_FOCUS_REQUESTED,
  WEBVIEW_MESSAGE_BOX_FOCUSED,
  WEBVIEW_USER_LOGGED_IN,
} from '../../ui/actions';
import { getRootWindow } from '../../ui/main/rootWindow';

let inactivityTimer: NodeJS.Timeout | null = null;
let suspended = false; // when true, don't auto-start timer (e.g., right after locking)
let currentTimeoutSeconds = 0;
let lastBlurAt = 0; // timestamp in ms of most recent blur
let blurStartTimeout: NodeJS.Timeout | null = null;
const BLUR_START_DELAY_MS = 500;
// Small grace window after a blur during which activity events are ignored to avoid races
const GRACE_WINDOW_MS = 300;
let lastStartAt = 0; // timestamp when startTimer last started
const MIN_CLEAR_IGNORE_MS = 400; // ignore clears for some reasons within this time after start
let rootWindowFocused = true; // tracked focus state to avoid race conditions

const clearTimer = (reason?: string) => {
  const now = Date.now();
  // If timer started very recently, ignore clears for non-critical reasons to avoid races
  if (
    lastStartAt &&
    now - lastStartAt < MIN_CLEAR_IGNORE_MS &&
    reason &&
    ['redux-action', 'ipc-message', 'user-activity-action'].includes(reason)
  ) {
    return;
  }

  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
};

const startTimer = () => {
  clearTimer();
  if (!currentTimeoutSeconds || suspended) {
    return;
  }

  lastStartAt = Date.now();
  inactivityTimer = setTimeout(async () => {
    try {
      // Dispatch the same action as the menu lock so existing listeners handle showing the lock view.
      dispatch({ type: MENU_BAR_LOCK_SCREEN_CLICKED });

      // After locking, suspend automatic timer until window regains focus (unlock will focus window).
      suspended = true;
      clearTimer('locked');
    } catch (e) {
      // ignore
    }
  }, currentTimeoutSeconds * 1000);
};

export const setupScreenLock = (): void => {
  // Watch store for timeout changes
  watch(
    ({ screenLockTimeoutSeconds }: RootState) => screenLockTimeoutSeconds,
    (timeout) => {
      currentTimeoutSeconds = timeout ?? 0;
      if (currentTimeoutSeconds > 0) {
        // Start timer only if the root window is not focused (we run timer while app is unfocused)
        getRootWindow()
          .then((rootWindow) => {
            if (!rootWindow.isFocused()) {
              rootWindowFocused = false;
              startTimer();
            } else {
              rootWindowFocused = true;
              clearTimer('timeout-focused');
            }
          })
          .catch(() => {
            // If root window isn't available, default to starting timer
            startTimer();
          });
      } else {
        clearTimer('timeout-disabled');
      }
    }
  );

  // Instead of reacting to any redux action (which can include internal
  // state updates that race with blur), listen only for explicit user
  // activity actions coming from webviews or UI, and clear the timer then.
  const onUserActivity = () => {
    // ignore activity if it happens immediately after blur (likely caused by blur handling)
    const now = Date.now();
    if (now - lastBlurAt < GRACE_WINDOW_MS) {
      return;
    }

    // Only treat this as user activity if the root window is focused (tracked flag)
    if (!rootWindowFocused) {
      return;
    }

    // clear any pending blur-start and the auto-lock timer
    if (blurStartTimeout) {
      clearTimeout(blurStartTimeout);
      blurStartTimeout = null;
    }
    suspended = false;
    clearTimer('user-activity-action');
  };

  listen(WEBVIEW_FOCUS_REQUESTED, onUserActivity);
  listen(WEBVIEW_MESSAGE_BOX_FOCUSED, onUserActivity);
  listen(WEBVIEW_USER_LOGGED_IN, onUserActivity);

  // Attach listeners to root window to detect activity
  const attachRootWindowListeners = () => {
    getRootWindow()
      .then((rootWindow) => {
        // Clear timer on focus (user returned to app)
        rootWindow.addListener('focus', () => {
          rootWindowFocused = true;
          suspended = false;
          if (blurStartTimeout) {
            clearTimeout(blurStartTimeout);
            blurStartTimeout = null;
          }
          clearTimer('focus');
        });

        // Start timer on blur (user left the app) — delay start slightly to avoid races
        rootWindow.addListener('blur', () => {
          rootWindowFocused = false;
          suspended = false;
          lastBlurAt = Date.now();
          if (blurStartTimeout) {
            clearTimeout(blurStartTimeout);
          }
          blurStartTimeout = setTimeout(() => {
            blurStartTimeout = null;
            // Only start the timer if the window is still unfocused
            try {
              if (!rootWindow.isFocused()) {
                startTimer();
              }
            } catch (e) {
              // ignore
            }
          }, BLUR_START_DELAY_MS);
        });

        // Any input while focused is activity: clear timer
        rootWindow.webContents.on('before-input-event', () => {
          suspended = false;
          if (blurStartTimeout) {
            clearTimeout(blurStartTimeout);
            blurStartTimeout = null;
          }
          clearTimer('before-input-event');
        });

        // IPC messages from renderer indicate activity: clear timer
        rootWindow.webContents.on('ipc-message', () => {
          try {
            // Ignore IPCs that happen immediately after blur (they may be caused
            // by blur handling in renderers). Use a small grace window.
            const now = Date.now();
            if (now - lastBlurAt < GRACE_WINDOW_MS) {
              return;
            }
            if (!rootWindow.isFocused()) {
              return;
            }
            suspended = false;
            if (blurStartTimeout) {
              clearTimeout(blurStartTimeout);
              blurStartTimeout = null;
            }
            clearTimer('ipc-message');
          } catch (e) {
            // ignore
          }
        });
      })
      .catch(() => {
        setTimeout(attachRootWindowListeners, 500);
      });
  };
  attachRootWindowListeners();
};
