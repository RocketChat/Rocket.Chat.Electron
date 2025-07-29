import i18next from 'i18next';
import { createRoot } from 'react-dom/client';
import { initReactI18next, I18nextProvider } from 'react-i18next';

import { fallbackLng, interpolation } from '../i18n/common';
import resources from '../i18n/resources';
import VideoCallWindow from './videoCallWindow';

let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

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
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'Video call window: DOM ready, continuing initialization'
            );
          }
          start().then(resolve).catch(resolve);
        });
      });
    }

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

    if (process.env.NODE_ENV === 'development') {
      console.log('Video call window: Testing IPC handshake...');
    }

    const handshakeResult = await window
      .require('electron')
      .ipcRenderer.invoke('video-call-window/handshake');

    if (process.env.NODE_ENV === 'development') {
      console.log(
        'Video call window: IPC handshake successful:',
        handshakeResult
      );
    }

    console.log('Video call window: Signaling renderer ready state');
    await window
      .require('electron')
      .ipcRenderer.invoke('video-call-window/renderer-ready');

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
      console.log(`Video call window: Retrying initialization in 1 second...`);
      setTimeout(() => {
        if (!isWindowDestroying) {
          start().catch((retryError) => {
            console.error('Video call window retry also failed:', retryError);
            if (!isWindowDestroying) {
              showFallbackUI();
            }
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
