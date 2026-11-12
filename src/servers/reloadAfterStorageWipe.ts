import type { WebContents } from 'electron';

import { ignoringBeforeUnload } from './ignoringBeforeUnload';

// A storage wipe force-closes the page's IndexedDB connections. A page that
// keeps running with them crashes on its next lazy import, so the reload after
// the wipe must happen even when a `beforeunload` handler tries to cancel it.
export const reloadAfterStorageWipe = (guestWebContents: WebContents): void =>
  ignoringBeforeUnload(guestWebContents, () =>
    guestWebContents.reloadIgnoringCache()
  );
