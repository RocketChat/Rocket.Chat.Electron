import type { WebContents } from 'electron';

// Chromium emits `will-prevent-unload` before `did-start-navigation`, so the
// override covers only the navigation that `navigate` starts.
export const ignoringBeforeUnload = <T>(
  webContents: WebContents,
  navigate: () => T
): T => {
  const ignoreBeforeUnload = (event: Electron.Event): void => {
    event.preventDefault();
  };
  const stopIgnoring = (
    details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>
  ): void => {
    if (!details.isMainFrame || details.isSameDocument) return;
    webContents.off('will-prevent-unload', ignoreBeforeUnload);
    webContents.off('did-start-navigation', stopIgnoring);
  };
  webContents.once('will-prevent-unload', ignoreBeforeUnload);
  webContents.on('did-start-navigation', stopIgnoring);
  return navigate();
};
