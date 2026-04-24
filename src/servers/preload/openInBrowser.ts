import { ipcRenderer } from 'electron';

export const openInBrowser = (url: string): void => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      console.warn(
        `[RocketChatDesktop.openInBrowser] blocked non-http(s) URL: ${parsed.protocol}`
      );
      return;
    }
    ipcRenderer.invoke('browser/open-url', parsed.toString());
  } catch (error) {
    console.warn('[RocketChatDesktop.openInBrowser] invalid URL:', error);
  }
};
