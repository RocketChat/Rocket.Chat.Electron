import { contextBridge } from 'electron';

import { JitsiMeetElectron, JitsiMeetElectronAPI } from '../jitsi/preload';

declare global {
  interface Window {
    JitsiMeetElectron: JitsiMeetElectronAPI;
  }
}

console.log(
  '[Rocket.Chat Desktop] video-call-window-preload.ts injection start'
);

contextBridge.exposeInMainWorld('JitsiMeetElectron', JitsiMeetElectron);

window.addEventListener('beforeunload', (event) => {
  // Prevent the WebView from closing
  event.preventDefault();

  // Send a message to the main process to handle the close event
  alert('clossing');
});
