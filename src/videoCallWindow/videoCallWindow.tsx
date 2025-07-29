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

const MAX_RECOVERY_ATTEMPTS = 3;
const LOADING_TIMEOUT_MS = 15000;
const RECOVERY_DELAYS = {
  webviewReload: 1000,
  urlRefresh: 2000,
  fullReinitialize: 3000,
};

const RECOVERY_STRATEGIES = {
  webviewReload: 'Webview reload',
  urlRefresh: 'URL refresh',
  fullReinitialize: 'Full reinitialize',
} as const;

const VideoCallWindow = () => {
  const { t } = useTranslation();

  const [videoCallUrl, setVideoCallUrl] = useState('');
  const [shouldAutoOpenDevtools, setShouldAutoOpenDevtools] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);

  const webviewRef = useRef<any>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearLoadingState = (reason: string): void => {
    console.log(`VideoCallWindow: Clearing loading state - ${reason}`);
    setIsFailed(false);
    setIsReloading(false);
    setIsLoading(false);

    [loadingTimeoutRef, recoveryTimeoutRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  };

  const resetRecoveryState = (): void => {
    setRecoveryAttempt(0);
  };

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

      // Confirm URL received
      try {
        await ipcRenderer.invoke('video-call-window/url-received');
        if (process.env.NODE_ENV === 'development') {
          console.log('VideoCallWindow: URL received confirmation sent');
        }
      } catch (error) {
        console.error(
          'VideoCallWindow: Failed to send URL received confirmation:',
          error
        );
      }
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

    console.log(
      'VideoCallWindow: Setting up webview event handlers for URL:',
      videoCallUrl
    );

    // Auto-recovery function that tries different strategies
    const attemptAutoRecovery = (): void => {
      if (recoveryAttempt >= MAX_RECOVERY_ATTEMPTS) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            'VideoCallWindow: Max recovery attempts reached, showing error'
          );
        }
        setIsFailed(true);
        setIsLoading(false);
        setIsReloading(false);
        setErrorMessage(
          t(
            'videoCall.error.maxRetriesReached',
            'Failed to load after multiple attempts'
          )
        );
        return;
      }

      const currentAttempt = recoveryAttempt + 1;
      setRecoveryAttempt(currentAttempt);

      const getRecoveryConfig = (attempt: number) => {
        switch (attempt) {
          case 1:
            return {
              strategy: RECOVERY_STRATEGIES.webviewReload,
              delay: RECOVERY_DELAYS.webviewReload,
            };
          case 2:
            return {
              strategy: RECOVERY_STRATEGIES.urlRefresh,
              delay: RECOVERY_DELAYS.urlRefresh,
            };
          case 3:
            return {
              strategy: RECOVERY_STRATEGIES.fullReinitialize,
              delay: RECOVERY_DELAYS.fullReinitialize,
            };
          default:
            return null;
        }
      };

      const config = getRecoveryConfig(currentAttempt);
      if (!config) return;

      setIsReloading(true);

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `VideoCallWindow: Auto-recovery attempt ${currentAttempt}/${MAX_RECOVERY_ATTEMPTS} - ${config.strategy}`
        );
      }

      recoveryTimeoutRef.current = setTimeout(() => {
        const webview = webviewRef.current;

        switch (currentAttempt) {
          case 1:
            if (webview) {
              webview.reload();
            }
            break;
          case 2:
            if (webview && videoCallUrl) {
              webview.src = 'about:blank';
              setTimeout(() => {
                webview.src = videoCallUrl;
              }, 500);
            }
            break;
          case 3:
            window.location.reload();
            break;
        }

        recoveryTimeoutRef.current = null;
      }, config.delay);
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

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }

      ipcRenderer
        .invoke('video-call-window/webview-loading')
        .then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'VideoCallWindow: Webview loading state sent to main process'
            );
          }
        })
        .catch((error) => {
          console.error(
            'VideoCallWindow: Failed to send webview loading state:',
            error
          );
        });

      loadingTimeoutRef.current = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            'VideoCallWindow: Loading timeout reached - starting auto-recovery'
          );
        }
        loadingTimeoutRef.current = null;
        attemptAutoRecovery();
      }, LOADING_TIMEOUT_MS);
    };

    const handleNavigate = (event: any) => {
      console.log('VideoCallWindow: Navigation event:', event.url);
      checkForClosePage(event.url);
    };

    const handleDomReady = () => {
      console.log('VideoCallWindow: Webview DOM ready');

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

      resetRecoveryState();
      clearLoadingState('did-finish-load event');

      ipcRenderer
        .invoke('video-call-window/webview-ready')
        .then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'VideoCallWindow: Webview ready state sent to main process'
            );
          }
        })
        .catch((error) => {
          console.error(
            'VideoCallWindow: Failed to send webview ready state:',
            error
          );
        });
    };

    const handleStopLoading = () => {
      console.log('VideoCallWindow: Webview stopped loading');
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

      if (event.isMainFrame) {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }

        setIsFailed(true);
        setIsReloading(false);
        setIsLoading(false);
        setErrorMessage(`${event.errorDescription} (${event.errorCode})`);

        ipcRenderer
          .invoke(
            'video-call-window/webview-failed',
            `${event.errorDescription} (${event.errorCode})`
          )
          .catch((error) => {
            console.error(
              'VideoCallWindow: Failed to send webview failed state:',
              error
            );
          });
      }
    };

    const handleCrashed = () => {
      console.error('VideoCallWindow: Webview crashed');

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      setIsFailed(true);
      setIsReloading(false);
      setIsLoading(false);
      setErrorMessage(t('videoCall.error.crashed'));

      ipcRenderer
        .invoke('video-call-window/webview-failed', 'Webview crashed')
        .catch((error) => {
          console.error(
            'VideoCallWindow: Failed to send webview failed state:',
            error
          );
        });
    };

    const handleWebviewAttached = () => {
      console.log('VideoCallWindow: Webview attached');

      ipcRenderer
        .invoke('video-call-window/webview-created')
        .then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'VideoCallWindow: Webview created state sent to main process'
            );
          }
        })
        .catch((error) => {
          console.error(
            'VideoCallWindow: Failed to send webview created state:',
            error
          );
        });

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
      webview.removeEventListener('webview-attached', handleWebviewAttached);
      webview.removeEventListener('did-start-loading', handleLoadStart);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-finish-load', handleFinishLoad);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      webview.removeEventListener('crashed', handleCrashed);
      webview.removeEventListener('did-stop-loading', handleStopLoading);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
    };
  }, [videoCallUrl, shouldAutoOpenDevtools, isFailed, recoveryAttempt, t]);

  const handleReload = (): void => {
    console.log('VideoCallWindow: Manual reload requested');
    setIsReloading(true);
    setIsFailed(false);
    setIsLoading(true);
    setErrorMessage(null);
    resetRecoveryState();

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }

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

      {/* Loading overlay with escape option */}
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
};

export default VideoCallWindow;
