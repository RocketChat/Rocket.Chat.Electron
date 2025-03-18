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
        console.log('videoCallWindow/open-url', url);
        setVideoCallUrl(url);
      }
    );

    // Listen for Jitsi screen share requests
    ipcRenderer.on('video-call-window/jitsi-screen-share-requested', () => {
      console.log('Jitsi screen share requested');
      ipcRenderer.send('video-call-window/open-screen-picker');
    });

    return () => {
      ipcRenderer.removeAllListeners(
        'video-call-window/jitsi-screen-share-requested'
      );
    };
  }, []);

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
