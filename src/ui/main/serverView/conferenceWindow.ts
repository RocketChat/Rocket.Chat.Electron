import type { WebContents } from 'electron';

import { isConferencePageUrl } from '../../../servers/common';
import type { Server } from '../../../servers/common';

// A conference page that hosts the call itself (`/conference/:id`, optionally
// `?scheduled=true`) is built to run in its own window: loaded into a server
// view it replaces the whole app, and reloads keep landing on it. Only the
// `?callUrl=` variant, which opens the call and redirects home, belongs in the
// server view.
export const isConferenceCallPageUrl = (
  pageUrl: string,
  serverUrl: Server['url']
): boolean => {
  if (!isConferencePageUrl(pageUrl, serverUrl)) {
    return false;
  }
  try {
    return !new URL(pageUrl).searchParams.has('callUrl');
  } catch {
    return false;
  }
};

// Conference pages are queued per server and pulled by that server's preload,
// which opens them through the internal video chat window. Pulling instead of
// pushing keeps a request made before the preload listens (e.g. a deep link
// that cold-starts the app) from being lost, and opens it exactly once.
const pendingConferenceUrls = new Map<Server['url'], string>();

export const requestConferenceWindow = (
  serverUrl: Server['url'],
  serverWebContents: WebContents,
  conferenceUrl: string
): void => {
  pendingConferenceUrls.set(serverUrl, conferenceUrl);
  if (!serverWebContents.isDestroyed()) {
    serverWebContents.send('server-view/conference-requested');
  }
};

export const takePendingConferenceUrl = (
  serverUrl: Server['url'] | undefined
): string | null => {
  if (!serverUrl) {
    return null;
  }
  const conferenceUrl = pendingConferenceUrls.get(serverUrl) ?? null;
  pendingConferenceUrls.delete(serverUrl);
  return conferenceUrl;
};
