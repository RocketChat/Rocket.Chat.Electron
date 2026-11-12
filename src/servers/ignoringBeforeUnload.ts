import type { WebContents } from 'electron';

// Chromium emits `will-prevent-unload` before `did-start-navigation`, so the
// override covers only the navigation that `navigate` starts. A navigation
// that never starts a new document (a fragment-only URL, or a `loadURL` that
// fails early) ends the override when its promise settles.
export const ignoringBeforeUnload = <T>(
  webContents: WebContents,
  navigate: () => T
): T => {
  const ignoreBeforeUnload = (event: Electron.Event): void => {
    event.preventDefault();
  };
  const stopIgnoring = (): void => {
    webContents.off('will-prevent-unload', ignoreBeforeUnload);
    webContents.off('did-start-navigation', stopOnNewDocument);
  };
  const stopOnNewDocument = (
    details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>
  ): void => {
    if (!details.isMainFrame || details.isSameDocument) return;
    stopIgnoring();
  };
  webContents.once('will-prevent-unload', ignoreBeforeUnload);
  webContents.on('did-start-navigation', stopOnNewDocument);
  const result = navigate();
  if (result instanceof Promise) result.then(stopIgnoring, stopIgnoring);
  return result;
};
