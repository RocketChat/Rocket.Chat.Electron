import i18next from 'i18next';
import { createRoot } from 'react-dom/client';
import { initReactI18next, I18nextProvider } from 'react-i18next';

import { fallbackLng, interpolation } from '../i18n/common';
import resources from '../i18n/resources';
import VideoCallWindow from './videoCallWindow';

// Initialize i18n for this window
const setupI18n = async () => {
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
};

const start = async () => {
  // Initialize i18n before rendering
  await setupI18n();

  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = createRoot(rootElement);
  root.render(
    <I18nextProvider i18n={i18next}>
      <VideoCallWindow />
    </I18nextProvider>
  );
};

// Start the application
start().catch(console.error);
