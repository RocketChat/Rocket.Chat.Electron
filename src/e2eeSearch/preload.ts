import { ipcRenderer } from 'electron';

import { E2EE_SEARCH_CHANNEL, E2EE_SEARCH_EVENT_CHANNEL } from './ipc';
import type { BridgeMethod } from './ipc';
import type { E2EESearchIndexEvent, SearchIndexBackend } from './types';

const call =
  (method: BridgeMethod) =>
  (...args: unknown[]): Promise<any> =>
    ipcRenderer.invoke(E2EE_SEARCH_CHANNEL, method, ...args);

let generation = 0;
let eventToken: string | undefined;
let ready = false;
let pendingLost = false;
const listeners = new Set<(event: E2EESearchIndexEvent) => void>();

const notifyListener = (
  listener: (event: E2EESearchIndexEvent) => void,
  event: E2EESearchIndexEvent
) => {
  try {
    listener(event);
  } catch {
    // A page callback must not suppress another consumer's recovery event.
  }
};

const endSession = () => {
  generation += 1;
  eventToken = undefined;
  ready = false;
  pendingLost = false;
  listeners.clear();
};

ipcRenderer?.on(
  E2EE_SEARCH_EVENT_CHANNEL,
  (_event, token: unknown, value: unknown) => {
    if (token !== eventToken || typeof value !== 'object' || value === null)
      return;
    const { type } = value as { type?: unknown };
    if (type !== 'lost' && type !== 'changed') return;
    if (type === 'lost') pendingLost = true;
    if (!ready) return;
    const run = generation;
    for (const listener of [...listeners]) {
      if (run !== generation) break;
      if (listeners.has(listener)) notifyListener(listener, { type });
    }
  }
);

// The main process derives the server from the sender webview.
export const e2eeSearch: SearchIndexBackend = {
  async open(scope) {
    endSession();
    const run = generation;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    eventToken = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    try {
      const result = await call('open')(scope, eventToken);
      if (run === generation) {
        ready = !result.locked;
        if (!ready) eventToken = undefined;
      }
      return result;
    } catch (error) {
      if (run === generation) endSession();
      throw error;
    }
  },
  upsert: call('upsert'),
  remove: call('remove'),
  removeRoom: call('removeRoom'),
  listRooms: call('listRooms'),
  search: call('search'),
  searchRecentPage: call('searchRecentPage'),
  onIndexEvent(listener) {
    if (!ready) throw new Error('E2EE search index is not open');
    const run = generation;
    listeners.add(listener);
    if (pendingLost) {
      queueMicrotask(() => {
        if (run === generation && listeners.has(listener))
          notifyListener(listener, { type: 'lost' });
      });
    }
    return () => {
      if (run === generation) listeners.delete(listener);
    };
  },
  getRoomState: call('getRoomState'),
  setRoomState: call('setRoomState'),
  stats: call('stats'),
  wipe: (...args) => {
    endSession();
    return call('wipe')(...args);
  },
  close: () => {
    endSession();
    return call('close')();
  },
};
