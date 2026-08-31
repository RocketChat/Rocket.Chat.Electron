import { PaletteStyleTag } from '@rocket.chat/fuselage';
import type { Themes } from '@rocket.chat/fuselage/dist/components/PaletteStyleTag/types/themes';
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { setupI18n } from '../i18n/renderer';
import '../logging/preload';
import { createRendererReduxStore } from '../store';
import { whenReady } from '../whenReady';
import { SettingsWindow } from './SettingsWindow';

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

const ThemedSettingsWindow = () => {
  const theme = useSystemTheme();

  return (
    <>
      <PaletteStyleTag theme={theme} selector=':root' />
      <SettingsWindow paletteTheme={theme === 'dark' ? 'dark' : 'light'} />
    </>
  );
};

const start = async (): Promise<void> => {
  // Settings are redux state synced from the main process, so this window
  // joins the same store rather than reimplementing them over IPC.
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
      <ThemedSettingsWindow />
    </Provider>
  );

  window.addEventListener('beforeunload', () => {
    root.unmount();
  });
};

start().catch(console.error);
