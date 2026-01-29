import { PaletteStyleTag } from '@rocket.chat/fuselage';
import type { Themes } from '@rocket.chat/fuselage/dist/components/PaletteStyleTag/types/themes';
import i18next from 'i18next';
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { initReactI18next, I18nextProvider } from 'react-i18next';

import { fallbackLng, interpolation } from '../i18n/common';
// Import and apply console override for the log viewer window renderer
import '../logging/preload';
import resources from '../i18n/resources';
import LogViewerWindow from './logViewerWindow';

const useSystemTheme = (): Themes => {
  const [theme, setTheme] = useState<Themes>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return theme;
};

const ThemedLogViewerWindow = () => {
  const theme = useSystemTheme();

  return (
    <>
      <PaletteStyleTag theme={theme} selector=':root' />
      <LogViewerWindow />
    </>
  );
};

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
      <ThemedLogViewerWindow />
    </I18nextProvider>
  );
};

// Start the application
start().catch(console.error);
