import i18next from 'i18next';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { interpolation, fallbackLng } from '../i18n/common';
import resources from '../i18n/resources';
import { invokeWithRetry } from '../ipc/renderer';
import type { IRetryOptions } from '../ipc/renderer';
import VideoCallWindow from './videoCallWindow';

let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

let isWindowDestroying = false;
let reactRoot: any = null;

const initializeI18n = async () => {
  try {
    // Get the system language from main process
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
    await initializeI18n();
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
      console.log('Video call window: Renderer ready');
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
