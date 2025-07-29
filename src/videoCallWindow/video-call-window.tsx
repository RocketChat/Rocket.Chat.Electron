import i18next from 'i18next';
import { createRoot } from 'react-dom/client';
import { initReactI18next, I18nextProvider } from 'react-i18next';

import { fallbackLng, interpolation } from '../i18n/common';
import resources from '../i18n/resources';
import VideoCallWindow from './videoCallWindow';

let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

let isWindowDestroying = false;

const setupI18n = async () => {
  try {
    const lng = fallbackLng;

    await i18next.use(initReactI18next).init({
      lng,
      fallbackLng,
      resources: {
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

const waitForDOMReady = (): Promise<void> => {
  if (document.readyState !== 'loading') {
    return Promise.resolve();
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Video call window: DOM not ready, waiting...');
  }

  return new Promise<void>((resolve) => {
    document.addEventListener('DOMContentLoaded', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Video call window: DOM ready, continuing initialization');
      }
      start().then(resolve).catch(resolve);
    });
  });
};

const initializeReactApp = async (): Promise<void> => {
  await setupI18n();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Video call window: Creating React root and rendering');
  }

  const root = createRoot(rootElement);
  root.render(
    <I18nextProvider i18n={i18next}>
      <VideoCallWindow />
    </I18nextProvider>
  );
};

const performIPCHandshake = async (): Promise<boolean> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Video call window: Testing IPC handshake...');
  }

  const handshakeResult = await window
    .require('electron')
    .ipcRenderer.invoke('video-call-window/handshake');

  if (!handshakeResult?.success) {
    console.log('Video call window: IPC not ready yet, retrying...');
    return false;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(
      'Video call window: IPC handshake successful:',
      handshakeResult
    );
  }
  return true;
};

const signalRendererReady = async (): Promise<boolean> => {
  console.log('Video call window: Signaling renderer ready state');

  const rendererReadyResult = await window
    .require('electron')
    .ipcRenderer.invoke('video-call-window/renderer-ready');

  if (!rendererReadyResult?.success) {
    console.log('Video call window: Renderer not ready yet, retrying...');
    return false;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Video call window: Renderer ready, requesting URL');
  }
  return true;
};

const requestVideoCallURL = async (
  retryCount = 0
): Promise<{
  url: string;
  autoOpenDevtools: boolean;
} | null> => {
  const MAX_URL_RETRIES = 3;
  const URL_RETRY_DELAY = 1000; // Give slower machines time to process

  try {
    const urlRequestResult = await window
      .require('electron')
      .ipcRenderer.invoke('video-call-window/request-url');

    if (!urlRequestResult?.success || !urlRequestResult?.url) {
      console.log(
        `Video call window: No URL available yet (attempt ${retryCount + 1}/${MAX_URL_RETRIES + 1})`
      );

      // Immediate retry for URL request if we still have attempts
      if (retryCount < MAX_URL_RETRIES && !isWindowDestroying) {
        console.log(
          `Video call window: Retrying URL request in ${URL_RETRY_DELAY}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, URL_RETRY_DELAY));
        return requestVideoCallURL(retryCount + 1);
      }

      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: URL received:', urlRequestResult);
    }

    return {
      url: urlRequestResult.url,
      autoOpenDevtools: urlRequestResult.autoOpenDevtools,
    };
  } catch (error) {
    console.error(
      `Video call window: URL request failed (attempt ${retryCount + 1}/${MAX_URL_RETRIES + 1}):`,
      error
    );

    // Retry on IPC failure if we still have attempts
    if (retryCount < MAX_URL_RETRIES && !isWindowDestroying) {
      console.log(
        `Video call window: Retrying URL request after IPC error in ${URL_RETRY_DELAY}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, URL_RETRY_DELAY));
      return requestVideoCallURL(retryCount + 1);
    }

    return null;
  }
};

const triggerURLEvent = (url: string, autoOpenDevtools: boolean): void => {
  const event = new CustomEvent('video-call-url-received', {
    detail: { url, autoOpenDevtools },
  });
  window.dispatchEvent(event);
};

const scheduleRetry = (errorType: string): void => {
  if (initAttempts < MAX_INIT_ATTEMPTS && !isWindowDestroying) {
    setTimeout(() => {
      if (!isWindowDestroying) {
        start().catch((retryError) => {
          console.error(
            `Video call window ${errorType} retry failed:`,
            retryError
          );
        });
      }
    }, 1000);
  } else if (!isWindowDestroying) {
    console.error(
      `Video call window: Max ${errorType} attempts reached, showing fallback UI`
    );
    showFallbackUI();
  }
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
      return waitForDOMReady();
    }

    await initializeReactApp();

    const handshakeSuccess = await performIPCHandshake();
    if (!handshakeSuccess) {
      scheduleRetry('IPC');
      return;
    }

    const rendererReadySuccess = await signalRendererReady();
    if (!rendererReadySuccess) {
      scheduleRetry('renderer-ready');
      return;
    }

    const urlData = await requestVideoCallURL();
    if (!urlData) {
      scheduleRetry('URL request');
      return;
    }

    triggerURLEvent(urlData.url, urlData.autoOpenDevtools);

    if (initAttempts === 1 && process.env.NODE_ENV !== 'development') {
      console.log('Video call window: Successfully initialized');
    } else if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Successfully initialized and rendered');
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

const showFallbackUI = () => {
  if (isWindowDestroying) {
    console.log(
      'Video call window: Skipping fallback UI - window is being destroyed'
    );
    return;
  }

  try {
    let retryCount = 0;
    const MAX_FALLBACK_RETRIES = 4;
    const RETRY_DELAYS = [3000, 6000, 8000, 10000];

    const attemptAutoRecovery = () => {
      if (isWindowDestroying) return;

      retryCount++;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `VideoCallWindow: Auto-recovery attempt ${retryCount}/${MAX_FALLBACK_RETRIES}`
        );
      }

      if (retryCount <= MAX_FALLBACK_RETRIES) {
        setTimeout(
          () => {
            if (!isWindowDestroying) {
              window.location.reload();
            }
          },
          RETRY_DELAYS[retryCount - 1]
        );
      } else {
        console.error(
          'VideoCallWindow: Auto-recovery failed after maximum attempts'
        );
      }
    };

    console.log('VideoCallWindow: Starting silent auto-recovery');

    setTimeout(attemptAutoRecovery, 3000);
  } catch (fallbackError) {
    console.error(
      'VideoCallWindow: Auto-recovery setup failed:',
      fallbackError
    );
    setTimeout(() => {
      if (!isWindowDestroying) {
        window.location.reload();
      }
    }, 1000);
  }
};

window.addEventListener('error', (event) => {
  console.error('Video call window uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Video call window unhandled promise rejection:', event.reason);
});

window.addEventListener('beforeunload', () => {
  isWindowDestroying = true;
  console.log('Video call window: Setting destruction flag - window unloading');
});

window.addEventListener('unload', () => {
  isWindowDestroying = true;
  console.log('Video call window: Window unloaded');
});

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  start().catch((error) => {
    console.error('Video call window failed to start:', error);
    showFallbackUI();
  });
} else {
  console.error(
    'Video call window: Invalid environment - missing document or window'
  );
}
