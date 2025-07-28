import i18next from 'i18next';
import { createRoot } from 'react-dom/client';
import { initReactI18next, I18nextProvider } from 'react-i18next';

import { fallbackLng, interpolation } from '../i18n/common';
import resources from '../i18n/resources';
import VideoCallWindow from './videoCallWindow';

// Track initialization attempts for debugging
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Initialize i18n for this window
const setupI18n = async () => {
  try {
    // For now we'll use the fallback language (en)
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
    // Use basic fallback without i18n if it fails
    throw error;
  }
};

const start = async (): Promise<void> => {
  initAttempts++;

  // Only log attempts if there were previous failures or in development
  if (initAttempts > 1 || process.env.NODE_ENV === 'development') {
    console.log(
      `Video call window initialization attempt ${initAttempts}/${MAX_INIT_ATTEMPTS}`
    );
  }

  try {
    // Check if DOM is ready
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

    // Initialize i18n before rendering
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

    // Only log success on first attempt or in development
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

    // Retry on low-power devices if we haven't exceeded max attempts
    if (initAttempts < MAX_INIT_ATTEMPTS) {
      console.log(`Video call window: Retrying initialization in 1 second...`);
      setTimeout(() => {
        start().catch((retryError) => {
          console.error('Video call window retry also failed:', retryError);
          showFallbackUI();
        });
      }, 1000);
    } else {
      console.error(
        'Video call window: Max initialization attempts reached, showing fallback UI'
      );
      showFallbackUI();
    }
  }
};

// Fallback UI for when React fails to initialize
const showFallbackUI = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) return;

    rootElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background-color: #2f343d;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <h2>Video Call Loading</h2>
        <p>Initializing video call window...</p>
        <p style="font-size: 14px; color: #ccc; margin-top: 20px;">
          If this message persists, please try restarting the application.
        </p>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #1f5582;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">
          Reload Window
        </button>
      </div>
    `;
    console.log('Video call window: Fallback UI displayed');
  } catch (fallbackError) {
    console.error('Video call window: Even fallback UI failed:', fallbackError);
  }
};

// Add global error handlers for the video call window
window.addEventListener('error', (event) => {
  console.error('Video call window uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Video call window unhandled promise rejection:', event.reason);
});

// Check if we're in a working environment before starting
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  // Start the application with error handling
  start().catch((error) => {
    console.error('Video call window failed to start:', error);
    showFallbackUI();
  });
} else {
  console.error(
    'Video call window: Invalid environment - missing document or window'
  );
}
