import i18next from 'i18next';
import { createRoot } from 'react-dom/client';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import { interpolation, fallbackLng } from '../i18n/common';
import resources from '../i18n/resources';
import { invokeWithRetry } from '../ipc/renderer';
import type { IRetryOptions } from '../ipc/renderer';
import VideoCallWindow from './videoCallWindow';

// Import and apply console override for the video call window renderer
import '../logging/preload';

// Initialize i18n for this window
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

let isWindowDestroying = false;
let reactRoot: any = null;

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

const showFallbackUI = () => {
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

  if (process.env.NODE_ENV === 'development') {
    console.error(
      'Video call window: Showing fallback UI after failed initialization, will auto-reload in 3 seconds'
    );
  }

  // Auto-reload after 3 seconds
  setTimeout(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Video call window: Auto-reloading after fallback UI timeout'
      );
    }
    window.location.reload();
  }, 3000);
};

const triggerURLEvent = (url: string, autoOpenDevtools: boolean): void => {
  const event = new CustomEvent('video-call-url-received', {
    detail: { url, autoOpenDevtools },
  });
  window.dispatchEvent(event);
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
    // Wait for DOM if not ready
    if (document.readyState === 'loading') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Video call window: DOM not ready, waiting...');
      }
      return new Promise<void>((resolve) => {
        document.addEventListener('DOMContentLoaded', () => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'Video call window: DOM ready, continuing initialization'
            );
          }
          start().then(resolve).catch(resolve);
        });
      });
    }

    // Initialize React app
    await setupI18n();
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Creating React root and rendering');
    }

    // Clean up existing root if it exists
    if (reactRoot) {
      reactRoot.unmount();
      reactRoot = null;
    }

    // Clear the root element to avoid React warnings
    rootElement.innerHTML = '';

    reactRoot = createRoot(rootElement);
    reactRoot.render(
      <I18nextProvider i18n={i18next}>
        <VideoCallWindow />
      </I18nextProvider>
    );

    // IPC Handshake with retry
    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Testing IPC handshake...');
    }

    const handshakeRetryOptions: IRetryOptions = {
      maxAttempts: 3,
      retryDelay: 1000,
      logRetries: process.env.NODE_ENV === 'development',
    };

    await invokeWithRetry('video-call-window/handshake', handshakeRetryOptions);

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: IPC handshake successful');
    }

    // Signal renderer ready
    console.log('Video call window: Signaling renderer ready state');
    await invokeWithRetry(
      'video-call-window/renderer-ready',
      handshakeRetryOptions
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Renderer ready, requesting URL');
    }

    // Request URL with custom retry logic
    const urlRetryOptions: IRetryOptions = {
      maxAttempts: 5, // Increased from 3
      retryDelay: 2000, // Increased from 1000ms
      logRetries: process.env.NODE_ENV === 'development',
      shouldRetry: (error, attempt) => {
        // Retry on IPC errors or if result indicates no URL yet
        const isIPCError = error.message.includes('IPC call failed');
        const isNoURLYet = error.message.includes('success: false');

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `Video call window: URL request attempt ${attempt} failed:`,
            {
              error: error.message,
              isIPCError,
              isNoURLYet,
              willRetry: isIPCError || isNoURLYet,
            }
          );
        }

        return isIPCError || isNoURLYet;
      },
    };

    let urlRequestResult;
    try {
      urlRequestResult = await invokeWithRetry(
        'video-call-window/request-url',
        urlRetryOptions
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        'Video call window: Failed to get URL after all retries:',
        error
      );
      throw new Error(`Failed to get video call URL: ${errorMessage}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: URL received:', urlRequestResult);
    }

    // Trigger URL event for VideoCallWindow component
    if (urlRequestResult.url) {
      triggerURLEvent(urlRequestResult.url, urlRequestResult.autoOpenDevtools);
    } else {
      throw new Error('No URL received from main process');
    }

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

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('Video call window global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Video call window unhandled rejection:', event.reason);
  event.preventDefault();
});

// Window lifecycle management
window.addEventListener('beforeunload', () => {
  isWindowDestroying = true;
  if (process.env.NODE_ENV === 'development') {
    console.log('Video call window: Window unloading, stopping retries');
  }

  // Clean up React root
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
});

// Start initialization
if (process.env.NODE_ENV === 'development') {
  console.log('Video call window: Starting initialization...');
}

start().catch((error) => {
  console.error('Video call window: Fatal initialization error:', error);
  showFallbackUI();
});
