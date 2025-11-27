import i18next from 'i18next';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { ScreenSharePicker } from './screenSharePicker';

let reactRoot: Root | null = null;
let isMounted = false;

export const show = (): void => {
  const container = document.getElementById('screen-picker-root');
  if (!container) {
    console.error('Screen picker root container not found');
    return;
  }

  // If already mounted, component's IPC listener will handle showing
  if (isMounted) {
    return;
  }

  // Mount for the first time
  try {
    reactRoot = createRoot(container);
    reactRoot.render(
      <I18nextProvider i18n={i18next}>
        <ScreenSharePicker />
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
  // Don't unmount - component stays mounted for reuse
  // The component handles hiding internally via visible state
  if (process.env.NODE_ENV === 'development') {
    console.log('Screen share picker hidden (kept mounted for reuse)');
  }
};
