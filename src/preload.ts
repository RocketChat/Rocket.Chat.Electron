import { contextBridge, webFrame, ipcRenderer } from 'electron';

import { invoke } from './ipc/renderer';
import type { JitsiMeetElectronAPI } from './jitsi/preload';
import { JitsiMeetElectron } from './jitsi/preload';
import { listenToNotificationsRequests } from './notifications/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import type { RocketChatDesktopAPI } from './servers/preload/api';
import { RocketChatDesktop } from './servers/preload/api';
import { setServerUrl } from './servers/preload/urls';
import { createRendererReduxStore, listen } from './store';
import { WEBVIEW_DID_NAVIGATE } from './ui/actions';
import { debounce } from './ui/main/debounce';
import { listenToMessageBoxEvents } from './ui/preload/messageBox';
import { handleTrafficLightsSpacing } from './ui/preload/sidebar';
import { whenReady } from './whenReady';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    JitsiMeetElectron: JitsiMeetElectronAPI;
    RocketChatDesktop: RocketChatDesktopAPI;
  }
}

// popup window読み込み
contextBridge.exposeInMainWorld('electronAPI', {
  openChatPopup: (origin: string, chatPath: string) =>
    ipcRenderer.invoke('open-chat-popup', origin, chatPath),
});

// popup window へメインから送る
window.addEventListener('message', (event) => {
  console.log(event); // checke evet
  if (event.data?.type === 'openChatPopup' && location.origin) {
    console.log(
      '[preload] received postMessage for openChatPopup:',
      event.data.path
    );
    ipcRenderer.invoke('open-chat-popup', location.origin, event.data.path);
    window.electronAPI?.openChatPopup(location.origin, event.data.path);
  }
});

// popupwinowボタン挿入
window.addEventListener('load', () => {
  const insertButton = () => {
    const header = document.querySelector(
      '[aria-label="Primary Room actions"]'
    );
    if (!header || header.querySelector('.open-popup-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'open-popup-btn';
    btn.textContent = 'ポップアップ';
    // 右寄せのスタイル
    btn.style.marginLeft = 'auto'; // 左側にスペースをとることで右端へ寄せる
    btn.style.padding = '4px 8px';
    btn.style.background = '#1d74f5';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.display = 'block';
    btn.onclick = () => {
      window.postMessage(
        {
          type: 'openChatPopup',
          origin: location.origin,
          path: location.pathname,
        },
        '*'
      );
    };
    header.appendChild(btn);
  };

  const observer = new MutationObserver(insertButton);
  observer.observe(document.body, { childList: true, subtree: true });
  insertButton();
});

console.log('[Rocket.Chat Desktop] Preload.ts');

contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);
contextBridge.exposeInMainWorld('RocketChatDesktop', RocketChatDesktop);

let retryCount = 0;

const start = async (): Promise<void> => {
  console.log('[Rocket.Chat Desktop] Preload.ts start fired');
  const serverUrl = await invoke('server-view/get-url');

  if (retryCount > 5) return;

  if (!serverUrl) {
    console.log('[Rocket.Chat Desktop] serverUrl is not defined');
    console.log('[Rocket.Chat Desktop] Preload start - retrying in 1 seconds');
    setTimeout(start, 1000);
    retryCount += 1;
    return;
  }

  window.removeEventListener('load', start);

  setServerUrl(serverUrl);

  await whenReady();

  await createRendererReduxStore();

  await invoke('server-view/ready');

  console.log('[Rocket.Chat Desktop] waiting for RocketChatDesktop.onReady');
  RocketChatDesktop.onReady(() => {
    console.log('[Rocket.Chat Desktop] RocketChatDesktop.onReady fired');
    listen(
      WEBVIEW_DID_NAVIGATE,
      debounce(() => {
        const resources = webFrame.getResourceUsage();
        // TODO: make this configurable
        if (resources.images.size > 50 * 1024 * 1024) {
          webFrame.clearCache();
        }
      }, 1000 * 30)
    );

    listenToNotificationsRequests();
    listenToScreenSharingRequests();
    listenToMessageBoxEvents();
    handleTrafficLightsSpacing();
  });
};

console.log('[Rocket.Chat Desktop] waiting for window load');
window.addEventListener('load', start);
