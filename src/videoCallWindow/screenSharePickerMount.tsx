import i18next from 'i18next';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { ScreenSharePicker } from './screenSharePicker';

let reactRoot: Root | null = null;
let setVisibleCallback: ((visible: boolean) => void) | null = null;
let shouldShowOnMount = false; // Track if show() was called before callback was set

export const show = (): void => {
  const container = document.getElementById('screen-picker-root');
  if (!container) {
    console.error('Screen picker root container not found');
    return;
  }

  // If React root already exists, don't create another one
  // This prevents race conditions when show() is called multiple times
  // before the component's useEffect callback sets setVisibleCallback
  if (reactRoot) {
    // If callback is available, trigger visibility immediately
    if (setVisibleCallback) {
      setVisibleCallback(true);
    } else {
      // Callback not set yet (React effect hasn't run), mark that we want to show
      // The callback will check this flag when it's set
      shouldShowOnMount = true;
      // Also use setTimeout as a fallback to retry after React effect runs
      setTimeout(() => {
        if (setVisibleCallback) {
          setVisibleCallback(true);
          shouldShowOnMount = false;
        }
      }, 0);
    }
    return;
  }

  // Mount for the first time
  // Mark that we want to show once mounted
  shouldShowOnMount = true;
  try {
    reactRoot = createRoot(container);
    reactRoot.render(
      <I18nextProvider i18n={i18next}>
        <ScreenSharePicker
          onMounted={(setVisible) => {
            setVisibleCallback = setVisible;
            // If show() was called before this callback was set, trigger visibility now
            if (shouldShowOnMount) {
              setVisible(true);
              shouldShowOnMount = false;
            }
          }}
        />
      </I18nextProvider>
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('Screen share picker mounted');
    }
  } catch (error) {
    console.error('Failed to mount screen share picker:', error);
    // Reset state on error to allow retry
    reactRoot = null;
    setVisibleCallback = null;
    shouldShowOnMount = false;
  }
};

export const hide = (): void => {
  // Don't unmount - component stays mounted for reuse
  // The component handles hiding internally via visible state
  if (process.env.NODE_ENV === 'development') {
    console.log('Screen share picker hidden (kept mounted for reuse)');
  }
};
