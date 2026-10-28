import { ipcRenderer } from 'electron';

import { E2EE_SEARCH_CHANNEL } from './ipc';
import type { BridgeMethod } from './ipc';
import type { SearchIndexBackend } from './types';

const call =
  (method: BridgeMethod) =>
  (...args: unknown[]): Promise<any> =>
    ipcRenderer.invoke(E2EE_SEARCH_CHANNEL, method, ...args);

// `RocketChatDesktop.e2eeSearch`. The page sends no server URL: the main
// process takes the server from the sender webview.
export const e2eeSearch: SearchIndexBackend = {
  open: call('open'),
  upsert: call('upsert'),
  remove: call('remove'),
  removeRoom: call('removeRoom'),
  listRooms: call('listRooms'),
  search: call('search'),
  getRoomState: call('getRoomState'),
  setRoomState: call('setRoomState'),
  stats: call('stats'),
  wipe: call('wipe'),
  close: call('close'),
};
