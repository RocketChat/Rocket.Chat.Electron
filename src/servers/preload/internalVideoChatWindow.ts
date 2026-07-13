import { ipcRenderer } from 'electron';

import { safeSelect } from '../../store';
import { openExternal } from '../../utils/browserLauncher';

export const getInternalVideoChatWindowEnabled = (): boolean =>
  safeSelect(
    ({ isInternalVideoChatWindowEnabled }) => isInternalVideoChatWindowEnabled
  ) ?? false;

export type videoCallWindowOptions = {
  providerName?: string | undefined;
  credentials?: {
    userId: string;
    authToken: string;
  };
};

const getCredentialsForPexip = (
  options: videoCallWindowOptions | undefined
): videoCallWindowOptions | undefined => {
  if (options?.providerName !== 'pexip') {
    return options;
  }

  const authToken = localStorage.getItem('Meteor.loginToken');
  const userId = localStorage.getItem('Meteor.userId');
  if (authToken && userId) {
    return {
      ...options,
      credentials: { userId, authToken },
    };
  }

  return options;
};

type ConferenceCallRequest = {
  callUrl: string;
  provider: string | undefined;
};

const processConferenceCallRequest = ({
  callUrl,
  provider,
}: ConferenceCallRequest): void => {
  let sameOrigin = false;
  try {
    sameOrigin = new URL(callUrl).origin === window.location.origin;
  } catch {
    // Malformed callUrl: fall through with sameOrigin = false, no enrichment.
    // openInternalVideoChatWindow re-validates the URL and no-ops if invalid.
  }

  openInternalVideoChatWindow(
    callUrl,
    provider && sameOrigin ? { providerName: provider } : undefined
  );
};

let ready = false;
let pendingRequest: ConferenceCallRequest | null = null;

export const flushPendingConferenceCallRequest = (): void => {
  ready = true;
  if (pendingRequest) {
    processConferenceCallRequest(pendingRequest);
    pendingRequest = null;
  }
};

let listening = false;

// Registers the ipcRenderer listener early (before the renderer redux store
// exists), since the main process may deliver a cold-start deep link before
// the preload's store-init handshake completes and ipcRenderer does not
// buffer events sent before a listener is attached. Actual processing is
// deferred until flushPendingConferenceCallRequest() marks readiness, because
// getInternalVideoChatWindowEnabled() depends on the store being ready.
export const listenToConferenceCallRequests = (): void => {
  if (listening) {
    return;
  }
  listening = true;

  ipcRenderer.on(
    'conference/open-call-requested',
    (_event, payload: { callUrl?: unknown; provider?: unknown }) => {
      const { callUrl, provider } = payload;
      if (typeof callUrl !== 'string' || !callUrl) {
        return;
      }
      const request: ConferenceCallRequest = {
        callUrl,
        provider:
          typeof provider === 'string' && provider
            ? provider.toLowerCase()
            : undefined,
      };
      if (ready) {
        processConferenceCallRequest(request);
      } else {
        pendingRequest = request;
      }
    }
  );
};

export const openInternalVideoChatWindow = (
  url: string,
  options: videoCallWindowOptions | undefined
): void => {
  const validUrl = new URL(url);
  const allowedProtocols = ['http:', 'https:'];
  if (!allowedProtocols.includes(validUrl.protocol)) {
    return;
  }
  if (!process.mas && getInternalVideoChatWindowEnabled()) {
    const enrichedOptions = getCredentialsForPexip(options);
    switch (options?.providerName) {
      case 'jitsi':
        // window.open(validUrl.href, 'Video Call', 'scrollbars=true');
        // We will open Jitsi on browser instead of opening a new window for compatibility from their side
        ipcRenderer.invoke(
          'video-call-window/open-window',
          validUrl.href,
          enrichedOptions
        );
        break;
      case 'googlemeet':
        openExternal(validUrl.href);
        break;
      default:
        ipcRenderer.invoke(
          'video-call-window/open-window',
          validUrl.href,
          enrichedOptions
        );
        break;
    }
  } else {
    openExternal(validUrl.href);
  }
};
