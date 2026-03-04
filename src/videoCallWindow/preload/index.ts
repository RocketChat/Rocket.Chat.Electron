import { contextBridge, ipcRenderer } from 'electron';
import './jitsiBridge';

// Expose any necessary APIs to the webview content
contextBridge.exposeInMainWorld('videoCallWindow', {
  // Add methods here if needed for communication with the main process
  requestScreenSharing: async () => {
    // Directly invoke the screen picker
    await ipcRenderer.invoke('video-call-window/open-screen-picker');
    return new Promise<string | null>((resolve) => {
      ipcRenderer.once(
        'video-call-window/screen-sharing-source-responded',
        (_event, id) => {
          resolve(id);
        }
      );
    });
  },
  getAuthCredentials: async (): Promise<{
    userId: string;
    authToken: string;
    serverUrl: string;
  } | null> => {
    return ipcRenderer.invoke('video-call-window/get-credentials');
  },
});

// Proactive credential injection to Rocket.Chat iframes (used by Pexip)
const injectCredentialsToRcIframes = async (): Promise<void> => {
  const credentials = await ipcRenderer.invoke(
    'video-call-window/get-credentials'
  );
  if (!credentials) return;

  const { userId, authToken, serverUrl } = credentials;
  const targetOrigin = new URL(serverUrl).origin;

  const sendToMatchingIframes = (): void => {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeSrc = iframe.src || iframe.getAttribute('src') || '';
        if (
          iframeSrc.startsWith(serverUrl) ||
          iframeSrc.startsWith(targetOrigin)
        ) {
          iframe.contentWindow?.postMessage(
            { type: 'rc-auth-credentials', userId, authToken },
            targetOrigin
          );
        }
      } catch {
        // Ignore cross-origin errors
      }
    }
  };

  // Watch for new iframes being added to the DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLIFrameElement) {
          node.addEventListener('load', sendToMatchingIframes, { once: true });
        }
        if (node instanceof HTMLElement) {
          const nestedIframes = node.querySelectorAll('iframe');
          for (const iframe of nestedIframes) {
            iframe.addEventListener('load', sendToMatchingIframes, {
              once: true,
            });
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Also check existing iframes
  sendToMatchingIframes();
};

// Start iframe credential injection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectCredentialsToRcIframes();
  });
} else {
  injectCredentialsToRcIframes();
}
