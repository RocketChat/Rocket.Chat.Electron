import type { WebContents } from 'electron';

// A storage wipe force-closes the page's IndexedDB connections. A page that
// keeps running with them crashes on its next lazy import, so the reload after
// the wipe must happen. A page's `beforeunload` handler can cancel a reload,
// so this ignores it for this one reload only.
export const reloadAfterStorageWipe = (guestWebContents: WebContents): void => {
  const ignoreBeforeUnload = (event: Electron.Event): void => {
    event.preventDefault();
  };
  const stopIgnoring = (
    details: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>
  ): void => {
    if (!details.isMainFrame || details.isSameDocument) return;
    guestWebContents.off('will-prevent-unload', ignoreBeforeUnload);
    guestWebContents.off('did-start-navigation', stopIgnoring);
  };
  guestWebContents.once('will-prevent-unload', ignoreBeforeUnload);
  guestWebContents.on('did-start-navigation', stopIgnoring);
  guestWebContents.reloadIgnoringCache();
};
