import path from 'path';

import { Box } from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import { useEffect, useRef, useState } from 'react';

import { ScreenSharePicker } from './screenSharePicker';

function VideoCallWindow() {
  const [videoCallUrl, setVideoCallUrl] = useState('');

  const webviewRef =
    useRef<ReturnType<(typeof document)['createElement']>>(null);

  useEffect(() => {
    ipcRenderer.once(
      'video-call-window/open-url',
      async (_event, url: string) => {
        setVideoCallUrl(url);
      }
    );

    return () => {};
  }, []);

  useEffect(() => {
    const webview = webviewRef.current as any;
    if (!webview) return;

    const checkForClosePage = (url: string) => {
      if (url.includes('/close.html') || url.includes('/close2.html')) {
        ipcRenderer.invoke('video-call-window/close-requested');
      }
    };

    const handleNavigate = (event: any) => {
      checkForClosePage(event.url);
    };

    webview.addEventListener('did-navigate', handleNavigate);

    return () => {
      webview.removeEventListener('did-navigate', handleNavigate);
    };
  }, [videoCallUrl]);

  return (
    <Box>
      <ScreenSharePicker />
      <webview
        ref={webviewRef}
        src={videoCallUrl}
        preload={path.join(__dirname, 'preload', 'index.js')}
        webpreferences='nodeIntegration,nativeWindowOpen=true'
        allowpopups={'true' as any}
      />
    </Box>
  );
}

export default VideoCallWindow;
