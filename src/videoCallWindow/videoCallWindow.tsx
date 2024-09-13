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
  }, [videoCallUrl]);

  return (
    <Box>
      <ScreenSharePicker />
      <webview
        ref={webviewRef}
        src={videoCallUrl}
        preload='./preload.js'
        webpreferences='nodeIntegration,nativeWindowOpen=true'
        allowpopups={'true' as any}
      />
    </Box>
  );
}

export default VideoCallWindow;
