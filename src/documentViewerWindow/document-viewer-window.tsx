import { PaletteStyleTag } from '@rocket.chat/fuselage';
import type { Themes } from '@rocket.chat/fuselage/dist/components/PaletteStyleTag/types/themes';
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { setupI18n } from '../i18n/renderer';
import '../logging/preload';
import { createRendererReduxStore } from '../store';
import { whenReady } from '../whenReady';
import { DocumentViewerWindow } from './DocumentViewerWindow';

const useSystemTheme = (): Themes => {
  const [theme, setTheme] = useState<Themes>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return theme;
};

const ThemedDocumentViewerWindow = () => {
  const theme = useSystemTheme();

  return (
    <>
      <PaletteStyleTag theme={theme} selector=':root' />
      <DocumentViewerWindow
        paletteTheme={theme === 'dark' ? 'dark' : 'light'}
      />
    </>
  );
};

const start = async (): Promise<void> => {
  // The viewer itself needs no app state, but the store is what the shared
  // chrome and the PDF webview's attach handler dispatch through.
  const reduxStore = await createRendererReduxStore();

  await whenReady();
  await setupI18n();

  const container = document.getElementById('root');

  if (!container) {
    throw new Error('cannot find the container node for React');
  }

  const root = createRoot(container);

  root.render(
    <Provider store={reduxStore}>
      <ThemedDocumentViewerWindow />
    </Provider>
  );

  window.addEventListener('beforeunload', () => {
    root.unmount();
  });
};

start().catch(console.error);
