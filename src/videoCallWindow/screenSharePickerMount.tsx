import i18next from 'i18next';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { ScreenSharePicker } from './screenSharePicker';

let reactRoot: Root | null = null;
let setVisibleCallback: ((visible: boolean) => void) | null = null;
let shouldShowOnMount = false;

export const mount = (): void => {
  const container = document.getElementById('screen-picker-root');
  if (!container) {
    console.error('Screen picker root container not found');
    return;
  }

  if (reactRoot) {
    return;
  }

  try {
    reactRoot = createRoot(container);
    reactRoot.render(
      <I18nextProvider i18n={i18next}>
        <ScreenSharePicker
          onMounted={(setVisible) => {
            setVisibleCallback = setVisible;
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
    reactRoot = null;
    setVisibleCallback = null;
    shouldShowOnMount = false;
  }
};

export const show = (): void => {
  if (!reactRoot) {
    // Set flag BEFORE mounting so onMounted callback can see it during render
    shouldShowOnMount = true;
    mount();
    return;
  }

  if (setVisibleCallback) {
    setVisibleCallback(true);
  } else {
    shouldShowOnMount = true;
    setTimeout(() => {
      if (setVisibleCallback) {
        setVisibleCallback(true);
        shouldShowOnMount = false;
      }
    }, 0);
  }
};
