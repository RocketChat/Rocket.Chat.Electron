import type { WebContents } from 'electron';

// A storage wipe force-closes the page's IndexedDB connections. A page that
// keeps running with them crashes on its next lazy import, so the reload after
// the wipe must happen. A page's `beforeunload` handler cannot cancel it,
// because `setupIgnoreBeforeUnload` ignores that handler in every webContents.
export const reloadAfterStorageWipe = (guestWebContents: WebContents): void => {
  guestWebContents.reloadIgnoringCache();
};
