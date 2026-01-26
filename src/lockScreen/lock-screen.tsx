import i18next from 'i18next';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { interpolation, fallbackLng } from '../i18n/common';
import resources from '../i18n/resources';
import LockScreen from './LockScreen';

let reactRoot: any = null;

const initializeI18n = async () => {
  try {
    const browserLang = (navigator.language ||
      fallbackLng) as keyof typeof resources;
    const lng = browserLang || fallbackLng;

    // Build resources object with fallback and chosen language (async import)
    const res: Record<string, any> = {};

    // Load selected language if available
    if (resources[lng]) {
      try {
        res[lng] = { translation: await resources[lng]() };
      } catch (e) {
        // ignore, will fallback
      }
    }

    // Ensure fallback language is present
    if (!res[fallbackLng]) {
      res[fallbackLng] = { translation: await resources[fallbackLng]() };
    }

    await i18next.init({
      lng,
      fallbackLng,
      resources: res,
      interpolation,
      initImmediate: false,
    });
  } catch (error) {
    console.error('Failed to initialize i18n for lock screen:', error);
    // proceed without translations
  }
};

const start = async () => {
  if (document.readyState === 'loading') {
    return new Promise<void>((resolve) => {
      document.addEventListener('DOMContentLoaded', () =>
        start().then(resolve).catch(resolve)
      );
    });
  }

  // Initialize i18n before rendering
  await initializeI18n();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    // Nothing to mount
    return;
  }

  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }

  rootElement.innerHTML = '';
  reactRoot = createRoot(rootElement);
  reactRoot.render(
    <I18nextProvider i18n={i18next}>
      <LockScreen />
    </I18nextProvider>
  );
};

window.addEventListener('beforeunload', () => {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
});

start().catch((e) => {
  console.error('Lock screen initialization failed', e);
});
