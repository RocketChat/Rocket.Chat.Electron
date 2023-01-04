import { ipcRenderer } from 'electron';
import React, { useEffect, useRef, useState } from 'react';

import { ScreenSharePicker } from './screenSharePicker';

function VideoCallWindow() {
  const [videoCallUrl, setVideoCallUrl] = useState('http://tibia.com');

  const webviewRef = useRef<ReturnType<typeof document['createElement']>>(null);

  useEffect(() => {
    ipcRenderer.once(
      'video-call-window/open-url',
      async (_event, url: string) => {
        console.log('videoCallWindow/open-url', url);
        setVideoCallUrl(url);
      }
    );
  }, [videoCallUrl]);

  const handleAttachReady = (): void => {
    console.log('handleAttachReady');
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }
    console.log('webview', webview);
    console.log('webview.getWebContents()', webview.getWebContentsId());
    // webview.removeEventListener('dom-ready', handleAttachReady);
    const webContentsId = webview.getWebContentsId();
    ipcRenderer.invoke('video-call-window/web-contents-id', webContentsId);
  };

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }
    webview.addEventListener('dom-ready', handleAttachReady);
  }, [videoCallUrl]);

  return (
    <div>
      <ScreenSharePicker />
      <webview ref={webviewRef} src={videoCallUrl}></webview>
    </div>
  );
}

export default VideoCallWindow;
