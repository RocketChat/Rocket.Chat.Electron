import path from 'path';

import {
  Box,
  Button,
  ButtonGroup,
  Margins,
  Throbber,
} from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FailureImage } from '../ui/components/FailureImage';
import { ScreenSharePicker } from './screenSharePicker';

function VideoCallWindow() {
  const { t } = useTranslation();
  const [videoCallUrl, setVideoCallUrl] = useState('');
  const [shouldAutoOpenDevtools, setShouldAutoOpenDevtools] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const webviewRef =
    useRef<ReturnType<(typeof document)['createElement']>>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      // Reset states for new URL
      setIsFailed(false);
      setIsReloading(false);
      setIsLoading(true);
      setErrorMessage(null);

      setVideoCallUrl(url);
      setShouldAutoOpenDevtools(autoOpenDevtools);
    };

    // Add timeout detection for low-power devices that might have IPC issues
    const ipcTimeoutId = setTimeout(() => {
      // Only log this in development or when there are actual issues
      if (process.env.NODE_ENV === 'development') {
        console.info(
          'VideoCallWindow: No IPC message received after 15 seconds - this is normal during development'
        );
        return;
      }

      console.warn(
        'VideoCallWindow: No IPC message received after 15 seconds - checking IPC communication'
      );

      // Test if IPC is working at all
      ipcRenderer
        .invoke('video-call-window/test-ipc')
        .then(() => {
          console.log(
            'VideoCallWindow: IPC test successful, but no URL message received - this may be normal during development'
          );
        })
        .catch((error) => {
          console.error(
            'VideoCallWindow: IPC test failed - communication issues detected:',
            error
          );

          // Auto-recovery: Try to reload the window instead of showing error to user
          console.log(
            'VideoCallWindow: Attempting automatic recovery by reloading...'
          );
          window.location.reload();
        });
    }, 15000); // Increased from 10 to 15 seconds to reduce false positives

    // Remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners('video-call-window/open-url');
    ipcRenderer.on(
      'video-call-window/open-url',
      (event, url, autoOpenDevtools) => {
        clearTimeout(ipcTimeoutId); // Clear timeout since we received the message
        handleOpenUrl(event, url, autoOpenDevtools);
      }
    );

    return () => {
      clearTimeout(ipcTimeoutId);
      ipcRenderer.removeAllListeners('video-call-window/open-url');
    };
  }, []);

  useEffect(() => {
    const webview = webviewRef.current as any;
    if (!webview || !videoCallUrl) return;

    console.log(
      'VideoCallWindow: Setting up webview event handlers for URL:',
      videoCallUrl
    );

    // Helper function to clear loading state
    const clearLoadingState = (reason: string) => {
      console.log(`VideoCallWindow: Clearing loading state - ${reason}`);
      setIsFailed(false);
      setIsReloading(false);
      setIsLoading(false);

      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };

    const checkForClosePage = (url: string) => {
      if (url.includes('/close.html') || url.includes('/close2.html')) {
        ipcRenderer.invoke('video-call-window/close-requested');
      }
    };

    const handleLoadStart = () => {
      console.log('VideoCallWindow: Load started');
      setIsFailed(false);
      setIsReloading(false);
      setIsLoading(true);

      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // Set a fallback timeout to clear loading state if events don't fire
      loadingTimeoutRef.current = setTimeout(() => {
        console.log(
          'VideoCallWindow: Loading timeout reached - treating as failure'
        );

        // Clear the timeout reference
        loadingTimeoutRef.current = null;

        // Set failed state with timeout error
        setIsFailed(true);
        setIsReloading(false);
        setIsLoading(false);
        setErrorMessage(t('videoCall.error.timeout'));
      }, 15000); // 15 second timeout
    };

    const handleNavigate = (event: any) => {
      console.log('VideoCallWindow: Navigation event:', event.url);
      checkForClosePage(event.url);
    };

    const handleDomReady = () => {
      console.log('VideoCallWindow: Webview DOM ready');
      // Don't set loading to false here - wait for did-finish-load

      // Auto-open devtools if the setting is enabled
      if (shouldAutoOpenDevtools) {
        console.log('VideoCallWindow: Auto-opening devtools for webview');
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

    const handleFinishLoad = () => {
      console.log(
        'VideoCallWindow: Webview finished loading (all resources loaded)'
      );
      clearLoadingState('did-finish-load event');
    };

    const handleStopLoading = () => {
      console.log('VideoCallWindow: Webview stopped loading');
      // Only clear loading if we haven't failed - this is a secondary indicator
      if (!isFailed) {
        clearLoadingState('did-stop-loading event');
      }
    };

    const handleDidFailLoad = (event: any) => {
      const errorInfo = {
        errorCode: event.errorCode,
        errorDescription: event.errorDescription,
        validatedURL: event.validatedURL,
        isMainFrame: event.isMainFrame,
      };

      console.error('VideoCallWindow: Webview failed to load:', errorInfo);

      // Only treat main frame failures as actual failures
      if (event.isMainFrame) {
        // Clear loading timeout since we're handling the failure
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }

        setIsFailed(true);
        setIsReloading(false);
        setIsLoading(false);
        setErrorMessage(`${event.errorDescription} (${event.errorCode})`);
      }
    };

    const handleCrashed = () => {
      console.error('VideoCallWindow: Webview crashed');

      // Clear loading timeout since we're handling the crash
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      setIsFailed(true);
      setIsReloading(false);
      setIsLoading(false);
      setErrorMessage(t('videoCall.error.crashed'));
    };

    const handleWebviewAttached = () => {
      console.log('VideoCallWindow: Webview attached');

      // Auto-open devtools immediately when webview is attached if the setting is enabled
      if (shouldAutoOpenDevtools) {
        console.log(
          'VideoCallWindow: Auto-opening devtools immediately on webview attach'
        );
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
        }, 100);
      }
    };

    // Add event listeners
    webview.addEventListener('webview-attached', handleWebviewAttached);
    webview.addEventListener('did-start-loading', handleLoadStart);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-finish-load', handleFinishLoad);
    webview.addEventListener('did-fail-load', handleDidFailLoad);
    webview.addEventListener('crashed', handleCrashed);
    webview.addEventListener('did-stop-loading', handleStopLoading);

    return () => {
      // Clean up event listeners
      webview.removeEventListener('webview-attached', handleWebviewAttached);
      webview.removeEventListener('did-start-loading', handleLoadStart);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-finish-load', handleFinishLoad);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      webview.removeEventListener('crashed', handleCrashed);
      webview.removeEventListener('did-stop-loading', handleStopLoading);

      // Clear loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [videoCallUrl, shouldAutoOpenDevtools, isFailed, t]);

  const handleReload = (): void => {
    console.log('VideoCallWindow: Manual reload requested');
    setIsReloading(true);
    setIsFailed(false);
    setIsLoading(true);
    setErrorMessage(null);

    const webview = webviewRef.current as any;
    if (webview) {
      webview.reload();
    }
  };

  // Don't render webview until we have a URL
  if (!videoCallUrl) {
    return (
      <Box>
        <ScreenSharePicker />
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          height='100vh'
          style={{ backgroundColor: '#2f343d' }}
        >
          <Box fontScale='h3' color='pure-white'>
            {t('videoCall.loading.initial')}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <ScreenSharePicker />

      {/* Loading overlay */}
      {isLoading && !isFailed && (
        <Box
          display='flex'
          flexDirection='column'
          width='100vw'
          height='100vh'
          justifyContent='center'
          alignItems='center'
          zIndex={999}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: '#2f343d',
          }}
        >
          <Box color='pure-white'>
            <Box display='flex' flexDirection='column' alignItems='center'>
              <Margins block='x12'>
                <Throbber inheritColor size='x16' />
              </Margins>
              <Box fontScale='h3' textAlign='center'>
                {isReloading
                  ? t('videoCall.loading.reloading')
                  : t('videoCall.loading.initial')}
              </Box>
              <Box fontScale='h4' textAlign='center' mbs='x8'>
                {t('videoCall.loading.description')}
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Error overlay - following the same pattern as ErrorView */}
      {isFailed && (
        <Box
          display='flex'
          flexDirection='column'
          width='100vw'
          height='100vh'
          justifyContent='center'
          alignItems='center'
          zIndex={1000}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <FailureImage
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 0,
            }}
          />
          <Box is='section' color='pure-white' zIndex={1}>
            <Margins block='x12'>
              <Box display='flex' flexDirection='column' alignItems='center'>
                <Margins block='x8' inline='auto'>
                  <Box fontScale='h1' textAlign='center'>
                    {t('videoCall.error.title')}
                  </Box>

                  <Box fontScale='h3' textAlign='center'>
                    {t('videoCall.error.announcement')}
                  </Box>

                  {errorMessage && (
                    <Box
                      fontScale='h4'
                      color='pure-white'
                      textAlign='center'
                      mbs='x8'
                    >
                      {errorMessage}
                    </Box>
                  )}
                </Margins>
              </Box>
            </Margins>

            <Box display='flex' justifyContent='center'>
              <ButtonGroup align='center'>
                <Button primary onClick={handleReload}>
                  {t('videoCall.error.reload')}
                </Button>
              </ButtonGroup>
            </Box>
          </Box>
        </Box>
      )}

      <webview
        ref={webviewRef}
        src={videoCallUrl}
        preload={path.join(__dirname, 'preload', 'index.js')}
        webpreferences='nodeIntegration,nativeWindowOpen=true'
        allowpopups={'true' as any}
        partition='persist:jitsi-session'
        style={{
          width: '100%',
          height: '100%',
          display: isFailed || isLoading ? 'none' : 'flex',
        }}
      />
    </Box>
  );
}

export default VideoCallWindow;
