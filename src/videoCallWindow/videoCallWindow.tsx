import path from 'path';

import { Box } from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import { useEffect, useRef, useState } from 'react';

import { ScreenSharePicker } from './screenSharePicker';

function VideoCallWindow() {
  const [videoCallUrl, setVideoCallUrl] = useState('');
  const [shouldAutoOpenDevtools, setShouldAutoOpenDevtools] = useState(false);

  const webviewRef =
    useRef<ReturnType<(typeof document)['createElement']>>(null);

  useEffect(() => {
    const handleOpenUrl = async (
      _event: any,
      url: string,
      autoOpenDevtools: boolean = false
    ) => {
      console.log(
        'VideoCallWindow: Received new URL:',
        url,
        'Auto-open devtools:',
        autoOpenDevtools
      );
      setVideoCallUrl(url);
      setShouldAutoOpenDevtools(autoOpenDevtools);
    };

    // Remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners('video-call-window/open-url');
    ipcRenderer.on('video-call-window/open-url', handleOpenUrl);

    return () => {
      ipcRenderer.removeAllListeners('video-call-window/open-url');
    };
  }, []);

  useEffect(() => {
    const webview = webviewRef.current as any;
    if (!webview || !videoCallUrl) return;

    const checkForClosePage = (url: string) => {
      if (url.includes('/close.html') || url.includes('/close2.html')) {
        ipcRenderer.invoke('video-call-window/close-requested');
      }
    };

    const handleNavigate = (event: any) => {
      checkForClosePage(event.url);
    };

    const handleDomReady = () => {
      console.log('VideoCallWindow: Webview DOM ready for URL:', videoCallUrl);

      // Auto-open devtools if the setting is enabled
      if (shouldAutoOpenDevtools) {
        console.log('VideoCallWindow: Auto-opening devtools for webview');
        // Open devtools immediately when webview is ready
        ipcRenderer
          .invoke('video-call-window/open-webview-dev-tools')
          .then((success: boolean) => {
            if (success) {
              console.log('VideoCallWindow: Successfully auto-opened devtools');
            } else {
              console.warn('VideoCallWindow: Failed to auto-open devtools');
            }
          })
          .catch((error: any) => {
            console.error(
              'VideoCallWindow: Error auto-opening devtools:',
              error
            );
          });
      }
    };

    const handleDidFailLoad = (event: any) => {
      console.error('VideoCallWindow: Webview failed to load:', {
        errorCode: event.errorCode,
        errorDescription: event.errorDescription,
        validatedURL: event.validatedURL,
        url: videoCallUrl,
      });
    };

    const handleWebviewAttached = () => {
      console.log('VideoCallWindow: Webview attached for URL:', videoCallUrl);

      // Auto-open devtools immediately when webview is attached if the setting is enabled
      if (shouldAutoOpenDevtools) {
        console.log(
          'VideoCallWindow: Auto-opening devtools immediately on webview attach'
        );
        // Use a small delay to ensure the webview webContents is fully initialized
        setTimeout(() => {
          ipcRenderer
            .invoke('video-call-window/open-webview-dev-tools')
            .then((success: boolean) => {
              if (success) {
                console.log(
                  'VideoCallWindow: Successfully auto-opened devtools on attach'
                );
              } else {
                console.warn(
                  'VideoCallWindow: Failed to auto-open devtools on attach, will retry on dom-ready'
                );
              }
            })
            .catch((error: any) => {
              console.error(
                'VideoCallWindow: Error auto-opening devtools on attach:',
                error
              );
            });
        }, 100); // Small delay to ensure webContents is ready
      }
    };

    // Add event listeners
    webview.addEventListener('webview-attached', handleWebviewAttached);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-fail-load', handleDidFailLoad);

    return () => {
      // Clean up event listeners
      webview.removeEventListener('webview-attached', handleWebviewAttached);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
    };
  }, [videoCallUrl, shouldAutoOpenDevtools]);

  // Don't render webview until we have a URL
  if (!videoCallUrl) {
    return (
      <Box>
        <ScreenSharePicker />
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading video call...
        </div>
      </Box>
    );
  }

  return (
    <Box>
      <ScreenSharePicker />
      <webview
        ref={webviewRef}
        src={videoCallUrl}
        preload={path.join(__dirname, 'preload', 'index.js')}
        webpreferences='nodeIntegration,nativeWindowOpen=true'
        allowpopups={'true' as any}
        partition='persist:jitsi-session'
      />
    </Box>
  );
}

export default VideoCallWindow;
