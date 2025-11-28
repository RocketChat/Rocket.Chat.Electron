import path from 'path';

import { ipcRenderer } from 'electron';
import i18next from 'i18next';

import { interpolation, fallbackLng } from '../i18n/common';
import resources from '../i18n/resources';
import { invokeWithRetry } from '../ipc/renderer';
import type { IRetryOptions } from '../ipc/renderer';

const MAX_INIT_ATTEMPTS = 10;
const MAX_RECOVERY_ATTEMPTS = 3;
const LOADING_TIMEOUT_MS = 15000;
const LOADING_SHOW_DELAY = 500;
const ERROR_SHOW_DELAY = 800;
const ERROR_SHOW_DELAY_404 = 1500;

const RECOVERY_DELAYS = {
  webviewReload: 1000,
  urlRefresh: 2000,
  fullReinitialize: 3000,
};

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'closing';

interface IVideoCallWindowState {
  url: string | null;
  status: Status;
  recoveryAttempt: number;
  webview: HTMLElement | null;
  shouldAutoOpenDevtools: boolean;
  isReloading: boolean;
  hasInitialLoadCompleted: boolean;
  errorMessage: string | null;
}

let initAttempts = 0;
let isWindowDestroying = false;
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let screenPickerModule: typeof import('./screenSharePickerMount') | null = null;
let screenPickerModulePromise: Promise<
  typeof import('./screenSharePickerMount')
> | null = null;

const state: IVideoCallWindowState = {
  url: null,
  status: 'idle',
  recoveryAttempt: 0,
  webview: null,
  shouldAutoOpenDevtools: false,
  isReloading: false,
  hasInitialLoadCompleted: false,
  errorMessage: null,
};

let loadingTimeout: NodeJS.Timeout | null = null;
let recoveryTimeout: NodeJS.Timeout | null = null;
let loadingDisplayTimeout: NodeJS.Timeout | null = null;
let errorDisplayTimeout: NodeJS.Timeout | null = null;

const initializeI18n = async (): Promise<void> => {
  try {
    const languageResult = await invokeWithRetry(
      'video-call-window/get-language',
      {
        maxAttempts: 3,
        retryDelay: 500,
        logRetries: process.env.NODE_ENV === 'development',
      }
    );

    const lng = languageResult?.language || fallbackLng;

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Using language:', lng);
    }

    await i18next.init({
      lng,
      fallbackLng,
      resources: {
        ...(lng &&
          lng !== fallbackLng && {
            [lng]: {
              translation: await resources[lng as keyof typeof resources]?.(),
            },
          }),
        [fallbackLng]: {
          translation: await resources[fallbackLng](),
        },
      },
      interpolation,
      initImmediate: true,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window i18n initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize i18n for video call window:', error);
    throw error;
  }
};

const t = (key: string, defaultValue?: string): string => {
  return i18next.t(key, { defaultValue });
};

const clearAllTimeouts = (): void => {
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
  if (recoveryTimeout) {
    clearTimeout(recoveryTimeout);
    recoveryTimeout = null;
  }
  if (loadingDisplayTimeout) {
    clearTimeout(loadingDisplayTimeout);
    loadingDisplayTimeout = null;
  }
  if (errorDisplayTimeout) {
    clearTimeout(errorDisplayTimeout);
    errorDisplayTimeout = null;
  }
};

const updateLoadingUI = (show: boolean, isReloading: boolean = false): void => {
  const overlay = document.getElementById(
    'loading-overlay-root'
  ) as HTMLElement | null;
  if (!overlay) return;

  if (show) {
    overlay.classList.add('show');
    const text = overlay.querySelector('.loading-text');
    const description = overlay.querySelector('.loading-description');
    if (text) {
      text.textContent = isReloading
        ? t('videoCall.loading.reloading', 'Reloading...')
        : t('videoCall.loading.initial', 'Loading video call...');
    }
    if (description) {
      description.textContent = t(
        'videoCall.loading.description',
        'Please wait while we connect you'
      );
    }
    // Hide webview when showing loading
    if (state.webview) {
      (state.webview as any).style.visibility = 'hidden';
    }
  } else {
    overlay.classList.remove('show');
  }
};

const updateErrorUI = (show: boolean, message: string | null = null): void => {
  const overlay = document.getElementById(
    'error-overlay-root'
  ) as HTMLElement | null;
  if (!overlay) return;

  if (show) {
    overlay.classList.add('show');
    const title = overlay.querySelector('.error-title');
    const announcement = overlay.querySelector('.error-announcement');
    const errorMsg = overlay.querySelector('.error-message');
    const reloadButton = overlay.querySelector(
      '#error-reload-button'
    ) as HTMLButtonElement | null;

    if (title) {
      title.textContent = t('videoCall.error.title', 'Connection Failed');
    }
    if (announcement) {
      announcement.textContent = t(
        'videoCall.error.announcement',
        'Unable to connect to video call'
      );
    }
    if (errorMsg) {
      if (message) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
      } else {
        errorMsg.classList.remove('show');
      }
    }
    if (reloadButton) {
      reloadButton.textContent = t('videoCall.error.reload', 'Reload');
    }
    // Hide webview when showing error
    if (state.webview) {
      (state.webview as any).style.visibility = 'hidden';
    }
  } else {
    overlay.classList.remove('show');
  }
};

const showLoadingWithDelay = (isReloading: boolean = false): void => {
  if (loadingDisplayTimeout) {
    clearTimeout(loadingDisplayTimeout);
  }

  loadingDisplayTimeout = setTimeout(() => {
    if (state.status === 'loading' && !state.errorMessage) {
      updateLoadingUI(true, isReloading);
    }
    loadingDisplayTimeout = null;
  }, LOADING_SHOW_DELAY);
};

const showErrorWithDelay = (
  message: string,
  is404Like: boolean = false
): void => {
  if (errorDisplayTimeout) {
    clearTimeout(errorDisplayTimeout);
  }

  const delay = is404Like ? ERROR_SHOW_DELAY_404 : ERROR_SHOW_DELAY;
  errorDisplayTimeout = setTimeout(() => {
    if (state.status === 'error') {
      updateErrorUI(true, message);
    }
    errorDisplayTimeout = null;
  }, delay);
};

const attemptAutoRecovery = (): void => {
  if (state.recoveryAttempt >= MAX_RECOVERY_ATTEMPTS) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Video call window: Max recovery attempts reached, showing error'
      );
    }
    state.status = 'error';
    state.errorMessage = t(
      'videoCall.error.maxRetriesReached',
      'Failed to load after multiple attempts'
    );
    updateLoadingUI(false);
    updateErrorUI(true, state.errorMessage);
    return;
  }

  const currentAttempt = state.recoveryAttempt + 1;
  state.recoveryAttempt = currentAttempt;
  state.isReloading = true;

  let strategy: string;
  let delay: number;

  switch (currentAttempt) {
    case 1:
      strategy = 'Webview reload';
      delay = RECOVERY_DELAYS.webviewReload;
      break;
    case 2:
      strategy = 'URL refresh';
      delay = RECOVERY_DELAYS.urlRefresh;
      break;
    case 3:
      strategy = 'Full reinitialize';
      delay = RECOVERY_DELAYS.fullReinitialize;
      break;
    default:
      return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `Video call window: Auto-recovery attempt ${currentAttempt}/${MAX_RECOVERY_ATTEMPTS} - ${strategy}`
    );
  }

  recoveryTimeout = setTimeout(() => {
    const webview = state.webview as any;

    switch (currentAttempt) {
      case 1:
        if (webview) {
          webview.reload();
        }
        break;
      case 2:
        if (webview && state.url) {
          webview.src = 'about:blank';
          setTimeout(() => {
            if (webview && state.url) {
              webview.src = state.url;
            }
          }, 500);
        }
        break;
      case 3:
        window.location.reload();
        break;
    }

    recoveryTimeout = null;
  }, delay);
};

const checkForClosePage = async (url: string): Promise<void> => {
  if (url.includes('/close.html') || url.includes('/close2.html')) {
    console.log(
      'Video call window: Close page detected, scheduling window close:',
      url
    );

    state.status = 'closing';
    clearAllTimeouts();
    updateLoadingUI(false);
    updateErrorUI(false);

    setTimeout(async () => {
      try {
        await invokeWithRetry('video-call-window/close-requested', {
          maxAttempts: 2,
          retryDelay: 500,
          logRetries: process.env.NODE_ENV === 'development',
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(
            'Video call window: Close request confirmed by main process'
          );
        }
      } catch (error) {
        console.error(
          'Video call window: Failed to send close request:',
          error
        );
      }
    }, 1000);
  }
};

const setupWebviewEventHandlers = (webview: HTMLElement): void => {
  const webviewElement = webview as any;

  const handleLoadStart = (): void => {
    console.log('Video call window: Load started');

    if (state.status === 'closing') {
      console.log(
        'Video call window: Skipping load start handling - window is closing'
      );
      return;
    }

    if (
      state.hasInitialLoadCompleted &&
      !state.isReloading &&
      state.recoveryAttempt === 0
    ) {
      console.log(
        'Video call window: Skipping loading UI - initial load already completed'
      );
      return;
    }

    state.status = 'loading';
    state.errorMessage = null;
    state.isReloading = false;
    clearAllTimeouts();
    showLoadingWithDelay(false);

    invokeWithRetry('video-call-window/webview-loading', {
      maxAttempts: 2,
      retryDelay: 500,
      logRetries: process.env.NODE_ENV === 'development',
    }).catch((error) => {
      console.error(
        'Video call window: Failed to send webview loading state:',
        error
      );
    });

    loadingTimeout = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          'Video call window: Loading timeout reached - starting auto-recovery'
        );
      }
      loadingTimeout = null;
      attemptAutoRecovery();
    }, LOADING_TIMEOUT_MS);
  };

  const handleNavigate = (event: any): void => {
    console.log('Video call window: Navigation event:', event.url);
    checkForClosePage(event.url);
  };

  const handleDomReady = (): void => {
    console.log('Video call window: Webview DOM ready');

    if (state.shouldAutoOpenDevtools) {
      console.log('Video call window: Auto-opening devtools for webview');
      invokeWithRetry('video-call-window/open-webview-dev-tools', {
        maxAttempts: 2,
        retryDelay: 500,
        logRetries: process.env.NODE_ENV === 'development',
      })
        .then((success: boolean) => {
          if (success) {
            console.log('Video call window: Successfully auto-opened devtools');
          } else {
            console.warn('Video call window: Failed to auto-open devtools');
          }
        })
        .catch((error: any) => {
          console.error(
            'Video call window: Error auto-opening devtools:',
            error
          );
        });
    }
  };

  const handleFinishLoad = (): void => {
    console.log(
      'Video call window: Webview finished loading (all resources loaded)'
    );

    state.recoveryAttempt = 0;
    state.status = 'ready';
    state.hasInitialLoadCompleted = true;
    state.isReloading = false;
    clearAllTimeouts();
    updateLoadingUI(false);
    updateErrorUI(false);

    if (state.webview) {
      (state.webview as any).style.visibility = 'visible';
    }

    invokeWithRetry('video-call-window/webview-ready', {
      maxAttempts: 2,
      retryDelay: 500,
      logRetries: process.env.NODE_ENV === 'development',
    }).catch((error) => {
      console.error(
        'Video call window: Failed to send webview ready state:',
        error
      );
    });

    preloadScreenSharePicker();

    // Pre-warm desktop capturer cache in background to avoid empty state on first open
    ipcRenderer.invoke('video-call-window/prewarm-capturer-cache').catch(() => {
      // Silent failure - cache warming is optional optimization
    });
  };

  const handleDidFailLoad = (event: any): void => {
    const errorInfo = {
      errorCode: event.errorCode,
      errorDescription: event.errorDescription,
      validatedURL: event.validatedURL,
      isMainFrame: event.isMainFrame,
    };

    console.error('Video call window: Webview failed to load:', errorInfo);

    if (event.isMainFrame) {
      clearAllTimeouts();
      state.status = 'error';
      state.errorMessage = `${event.errorDescription} (${event.errorCode})`;
      updateLoadingUI(false);

      const is404LikeError = [-6, -105, -106].includes(event.errorCode);
      showErrorWithDelay(state.errorMessage, is404LikeError);

      ipcRenderer
        .invoke(
          'video-call-window/webview-failed',
          `${event.errorDescription} (${event.errorCode})`
        )
        .catch((error) => {
          console.error(
            'Video call window: Failed to send webview failed state:',
            error
          );
        });
    }
  };

  const handleCrashed = (): void => {
    console.error('Video call window: Webview crashed');

    clearAllTimeouts();
    state.status = 'error';
    state.errorMessage = t('videoCall.error.crashed', 'Webview crashed');
    updateLoadingUI(false);
    updateErrorUI(true, state.errorMessage);

    invokeWithRetry(
      'video-call-window/webview-failed',
      {
        maxAttempts: 2,
        retryDelay: 500,
        logRetries: process.env.NODE_ENV === 'development',
      },
      'Webview crashed'
    ).catch((error) => {
      console.error(
        'Video call window: Failed to send webview failed state:',
        error
      );
    });
  };

  const handleWebviewAttached = (): void => {
    console.log('Video call window: Webview attached');

    invokeWithRetry('video-call-window/webview-created', {
      maxAttempts: 2,
      retryDelay: 500,
      logRetries: process.env.NODE_ENV === 'development',
    }).catch((error) => {
      console.error(
        'Video call window: Failed to send webview created state:',
        error
      );
    });

    if (state.shouldAutoOpenDevtools) {
      setTimeout(() => {
        invokeWithRetry('video-call-window/open-webview-dev-tools', {
          maxAttempts: 2,
          retryDelay: 500,
          logRetries: process.env.NODE_ENV === 'development',
        })
          .then((success: boolean) => {
            if (success) {
              console.log(
                'Video call window: Successfully auto-opened devtools on attach'
              );
            }
          })
          .catch((error: any) => {
            console.error(
              'Video call window: Error auto-opening devtools on attach:',
              error
            );
          });
      }, 100);
    }
  };

  webviewElement.addEventListener('webview-attached', handleWebviewAttached);
  webviewElement.addEventListener('did-start-loading', handleLoadStart);
  webviewElement.addEventListener('did-navigate', handleNavigate);
  webviewElement.addEventListener('dom-ready', handleDomReady);
  webviewElement.addEventListener('did-finish-load', handleFinishLoad);
  webviewElement.addEventListener('did-fail-load', handleDidFailLoad);
  webviewElement.addEventListener('crashed', handleCrashed);
};

const createWebview = (url: string): void => {
  const container = document.getElementById('webview-container');
  if (!container) {
    throw new Error('Webview container not found');
  }

  const htmlPath = window.location.pathname;
  const appDir = path.posix.dirname(htmlPath);
  const preloadRelativePath = path.posix.join(appDir, 'preload', 'preload.js');

  // Convert to file:// URL format required by Electron webview preload attribute
  // window.location.origin is 'file://' on all platforms
  // path.posix.join produces absolute paths starting with '/'
  // Combining them: 'file://' + '/path' = 'file:///path' (correct format)
  // Works on Linux: file:///home/user/app/preload/preload.js
  // Works on macOS: file:///Users/user/app/preload/preload.js
  // Works on Windows: file:///C:/Users/user/app/preload/preload.js
  const preloadPath = `${window.location.origin}${preloadRelativePath}`;

  const webview = document.createElement('webview');
  webview.setAttribute('preload', preloadPath);
  webview.setAttribute(
    'webpreferences',
    'nodeIntegration,nativeWindowOpen=true'
  );
  webview.setAttribute('allowpopups', 'true');
  webview.setAttribute('partition', 'persist:jitsi-session');
  webview.src = url;

  webview.style.cssText = `
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    visibility: hidden;
    z-index: 0;
  `;

  container.appendChild(webview);
  state.webview = webview;
  state.url = url;

  setupWebviewEventHandlers(webview);
};

const preloadScreenSharePicker = async (): Promise<void> => {
  if (screenPickerModule) {
    return;
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Preloading React for screen picker');
    }
    // Track import promise to prevent concurrent imports
    if (!screenPickerModulePromise) {
      screenPickerModulePromise = import('./screenSharePickerMount');
    }
    screenPickerModule = await screenPickerModulePromise;
    screenPickerModulePromise = null;
    screenPickerModule.mount(); // Mount only (stays hidden until IPC event)
    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Screen picker preloaded and mounted');
    }
  } catch (error) {
    console.error('Video call window: Failed to preload React:', error);
    screenPickerModulePromise = null;
  }
};

const handleReload = (): void => {
  console.log('Video call window: Manual reload requested');
  state.isReloading = true;
  state.status = 'loading';
  state.errorMessage = null;
  state.hasInitialLoadCompleted = false;
  state.recoveryAttempt = 0;
  clearAllTimeouts();
  updateErrorUI(false);
  updateLoadingUI(true, true);

  const webview = state.webview as any;
  if (webview) {
    webview.reload();
  }
};

const showFallbackUI = (): void => {
  const fallbackContainer = document.createElement('div');
  fallbackContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2f343d;
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif;
    z-index: 9999;
  `;

  fallbackContainer.innerHTML = `
    <div style="text-align: center;">
      <h2 style="color: #fff; margin: 0;">Video Call Unavailable</h2>
      <p style="color: #ccc; margin: 10px 0;">Unable to initialize video call window</p>
      <p style="color: #999; margin: 10px 0; font-size: 14px;">Retrying automatically in 3 seconds...</p>
    </div>
  `;

  document.body.appendChild(fallbackContainer);

  setTimeout(() => {
    window.location.reload();
  }, 3000);
};

const start = async (): Promise<void> => {
  if (isWindowDestroying) {
    console.log(
      'Video call window: Skipping initialization - window is being destroyed'
    );
    return;
  }

  initAttempts++;

  if (initAttempts > 1 || process.env.NODE_ENV === 'development') {
    console.log(
      `Video call window initialization attempt ${initAttempts}/${MAX_INIT_ATTEMPTS}`
    );
  }

  try {
    if (document.readyState === 'loading') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Video call window: DOM not ready, waiting...');
      }
      return new Promise<void>((resolve) => {
        document.addEventListener('DOMContentLoaded', () => {
          start().then(resolve).catch(resolve);
        });
      });
    }

    await initializeI18n();

    const params = new URLSearchParams(window.location.search);
    let url = params.get('url');
    const autoOpenDevtools = params.get('autoOpenDevtools') === 'true';

    state.shouldAutoOpenDevtools = autoOpenDevtools;

    if (!url) {
      // Try to get URL via IPC if not provided in query params
      try {
        const urlResult = await invokeWithRetry(
          'video-call-window/request-url',
          {
            maxAttempts: 2,
            retryDelay: 500,
            logRetries: process.env.NODE_ENV === 'development',
          }
        );
        if (urlResult?.success && urlResult?.url) {
          url = urlResult.url;
          if (urlResult.autoOpenDevtools !== undefined) {
            state.shouldAutoOpenDevtools = urlResult.autoOpenDevtools;
          }
        }
      } catch (error) {
        console.error(
          'Video call window: Failed to request URL via IPC:',
          error
        );
      }
    }

    if (!url) {
      // No URL available - show error state instead of stuck loading screen
      state.status = 'error';
      state.errorMessage = t(
        'videoCall.error.noUrl',
        'No video call URL provided'
      );
      updateLoadingUI(false);
      showErrorWithDelay(state.errorMessage, false);
      return;
    }

    createWebview(url);

    await invokeWithRetry('video-call-window/url-received', {
      maxAttempts: 2,
      retryDelay: 500,
      logRetries: process.env.NODE_ENV === 'development',
    });

    state.status = 'loading';
    // Show loading immediately for initial load
    updateLoadingUI(true, false);

    const handshakeRetryOptions: IRetryOptions = {
      maxAttempts: 3,
      retryDelay: 1000,
      logRetries: process.env.NODE_ENV === 'development',
    };

    await invokeWithRetry('video-call-window/handshake', handshakeRetryOptions);

    await invokeWithRetry(
      'video-call-window/renderer-ready',
      handshakeRetryOptions
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Successfully initialized');
    }
  } catch (error) {
    console.error(
      `Video call window initialization failed (attempt ${initAttempts}):`,
      error
    );

    if (initAttempts < MAX_INIT_ATTEMPTS && !isWindowDestroying) {
      console.log('Video call window: Retrying initialization in 1 second...');
      setTimeout(() => {
        if (!isWindowDestroying) {
          start().catch((retryError) => {
            console.error('Video call window retry also failed:', retryError);
          });
        }
      }, 1000);
    } else if (!isWindowDestroying) {
      console.error(
        'Video call window: Max initialization attempts reached, showing fallback UI'
      );
      showFallbackUI();
    }
  }
};

window.addEventListener('error', (event) => {
  console.error('Video call window global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Video call window unhandled rejection:', event.reason);
  event.preventDefault();
});

// IPC listener for screen picker (with cleanup on page unload)
const handleOpenScreenPicker = (): void => {
  (async () => {
    try {
      if (!screenPickerModule) {
        // Track import promise to prevent concurrent imports
        if (!screenPickerModulePromise) {
          screenPickerModulePromise = import('./screenSharePickerMount');
        }
        screenPickerModule = await screenPickerModulePromise;
        screenPickerModulePromise = null;
      }
      screenPickerModule.show();
    } catch (error) {
      screenPickerModulePromise = null;
      console.error('Video call window: Failed to open screen picker:', error);
    }
  })();
};

ipcRenderer.on('video-call-window/open-screen-picker', handleOpenScreenPicker);

window.addEventListener('beforeunload', () => {
  isWindowDestroying = true;
  clearAllTimeouts();
  // Clean up IPC listener to prevent memory leaks on reload
  ipcRenderer.removeListener(
    'video-call-window/open-screen-picker',
    handleOpenScreenPicker
  );
});

// Setup reload button handler when DOM is ready
const setupReloadButton = (): void => {
  const reloadButton = document.getElementById('error-reload-button');
  if (reloadButton) {
    reloadButton.addEventListener('click', handleReload);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupReloadButton);
} else {
  setupReloadButton();
}

if (process.env.NODE_ENV === 'development') {
  console.log('Video call window: Starting initialization...');
}

start().catch((error) => {
  console.error('Video call window: Fatal initialization error:', error);
  showFallbackUI();
});
