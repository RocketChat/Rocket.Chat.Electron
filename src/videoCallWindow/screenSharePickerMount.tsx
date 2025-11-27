import i18next from 'i18next';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { ScreenSharePicker } from './screenSharePicker';

let reactRoot: Root | null = null;
let isMounted = false;

export const show = (): void => {
  if (isMounted) {
    return;
  }

  const container = document.getElementById('screen-picker-root');
  if (!container) {
    console.error('Screen picker root container not found');
    return;
  }

  try {
    reactRoot = createRoot(container);
    reactRoot.render(
      <I18nextProvider i18n={i18next}>
        <ScreenSharePicker onUnmount={hide} />
      </I18nextProvider>
    );
    isMounted = true;

    if (process.env.NODE_ENV === 'development') {
      console.log('Screen share picker mounted');
    }
  } catch (error) {
    console.error('Failed to mount screen share picker:', error);
  }
};

export const hide = (): void => {
  if (!isMounted || !reactRoot) {
    return;
  }

  try {
    reactRoot.unmount();
    reactRoot = null;
    isMounted = false;

    if (process.env.NODE_ENV === 'development') {
      console.log('Screen share picker unmounted');
    }
  } catch (error) {
    console.error('Failed to unmount screen share picker:', error);
  }
};
