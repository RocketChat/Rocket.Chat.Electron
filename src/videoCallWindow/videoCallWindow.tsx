import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';

import { ScreenSharePicker } from './screenSharePicker';

function VideoCallWindow() {
  const [videoCallUrl, setVideoCallUrl] = useState('http://tibia.com');

  useEffect(() => {
    console.log('videoCallUrl', videoCallUrl);
    ipcRenderer.once(
      'video-call-window/open-url',
      async (_event, url: string) => {
        console.log('videoCallWindow/open-url', url);
        setVideoCallUrl(url);
      }
    );
  }, [videoCallUrl]);

  return (
    <div>
      <ScreenSharePicker />
      <webview src={videoCallUrl}></webview>
    </div>
  );
}

export default VideoCallWindow;
