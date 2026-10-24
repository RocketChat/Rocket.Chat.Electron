import { ipcRenderer } from 'electron';

import { invoke } from '../../ipc/renderer';
import { openInternalVideoChatWindow } from './internalVideoChatWindow';

// Conference call pages are queued by the main process
// (ui/main/serverView/conferenceWindow.ts) and pulled from here.
// `/conference/:id` is the Pexip provider's embedded call page, which needs the
// Pexip session sharing to load signed in.
const openPendingConference = async (): Promise<void> => {
  const url = await invoke('server-view/take-pending-conference');
  if (url) {
    openInternalVideoChatWindow(url, { providerName: 'pexip' });
  }
};

const openPendingConferenceSafely = (): void => {
  openPendingConference().catch((error) => {
    console.error('Failed to open conference window:', error);
  });
};

let listening = false;

export const listenToConferenceWindowRequests = (): void => {
  if (listening) {
    return;
  }
  listening = true;

  ipcRenderer.on(
    'server-view/conference-requested',
    openPendingConferenceSafely
  );
  openPendingConferenceSafely();
};
