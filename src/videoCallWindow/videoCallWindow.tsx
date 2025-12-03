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

import { invokeWithRetry } from '../ipc/renderer';
import { FailureImage } from '../ui/components/FailureImage';
import { ScreenSharePicker } from './screenSharePicker';

const MAX_RECOVERY_ATTEMPTS = 3;
const LOADING_TIMEOUT_MS = 15000;
const LOADING_SHOW_DELAY = 500; // Delay before showing loading spinner to prevent quick flashes
const ERROR_SHOW_DELAY = 800; // Delay before showing error to prevent flicker during retries
const ERROR_SHOW_DELAY_404 = 1500; // Longer delay for 404 errors which often flicker during initial load

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

  const [videoCallUrl, setVideoCallUrl] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('url') || '';
  });
  const [shouldAutoOpenDevtools, setShouldAutoOpenDevtools] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autoOpenDevtools') === 'true';
  });
  const [isFailed, setIsFailed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoading, setIsLoading] = useState(!!videoCallUrl); // Keep for internal state logic
  const [showLoading, setShowLoading] = useState(!!videoCallUrl); // Delayed loading display - start true if we have URL (prevents grey screen)
  const [showError, setShowError] = useState(false); // Delayed error display
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const [isClosing, setIsClosing] = useState(false); // Track if window is about to close
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState(false); // Track if initial load completed successfully

  const webviewRef = useRef<any>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetRecoveryState = (): void => {
    setRecoveryAttempt(0);
  };

  useEffect(() => {
    // Listen for URL received events from bootstrap
    const handleUrlReceived = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { url, autoOpenDevtools } = customEvent.detail;

      console.log(
        'VideoCallWindow: Received URL event:',
        url,
        'Auto-open devtools:',
        autoOpenDevtools
      );

      // Reset states for new URL
      setIsFailed(false);
      setIsReloading(false);
      setIsLoading(true);
      setErrorMessage(null);
      setHasInitialLoadCompleted(false); // Reset for new URL

      setVideoCallUrl(url);
      setShouldAutoOpenDevtools(autoOpenDevtools);

      // Confirm URL received
      try {
        await invokeWithRetry('video-call-window/url-received', {
          maxAttempts: 2,
          retryDelay: 500,
          logRetries: process.env.NODE_ENV === 'development',
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(
            'VideoCallWindow: URL received confirmation acknowledged by main process'
          );
        }
      } catch (error) {
        console.error(
          'VideoCallWindow: Failed to send URL received confirmation:',
          error
        );
      }
    };

    // Add event listener for URL events
    window.addEventListener('video-call-url-received', handleUrlReceived);

    const handleOpenUrl = async (
      _event: any,
      url: string,
      autoOpenDevtools: boolean = false
    ) => {
      console.log(
        'VideoCallWindow: Received new URL via IPC:',
        url,
        'Auto-open devtools:',
        autoOpenDevtools
      );

      // Reset states for new URL
      setIsFailed(false);
      setIsReloading(false);
      setIsLoading(true);
      setErrorMessage(null);
      setHasInitialLoadCompleted(false); // Reset for new URL

      setVideoCallUrl(url);
      setShouldAutoOpenDevtools(autoOpenDevtools);

      // Confirm URL received
      try {
        await invokeWithRetry('video-call-window/url-received', {
          maxAttempts: 2,
          retryDelay: 500,
          logRetries: process.env.NODE_ENV === 'development',
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(
            'VideoCallWindow: URL received confirmation acknowledged by main process'
          );
        }
      } catch (error) {
        console.error(
          'VideoCallWindow: Failed to send URL received confirmation:',
          error
        );
      }
    };

    // Keep IPC listener for potential future direct calls
    ipcRenderer.removeAllListeners('video-call-window/open-url');
    ipcRenderer.on('video-call-window/open-url', handleOpenUrl);

    return () => {
      ipcRenderer.removeAllListeners('video-call-window/open-url');
      window.removeEventListener('video-call-url-received', handleUrlReceived);
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

    const checkForClosePage = async (url: string) => {
      if (url.includes('/close.html') || url.includes('/close2.html')) {
        console.log(
          'VideoCallWindow: Close page detected, scheduling window close:',
          url
        );

        // Immediately set closing state to prevent loading UI flicker
        setIsClosing(true);

        // Clear any pending display timeouts to prevent flickers
        if (loadingDisplayTimeoutRef.current) {
          clearTimeout(loadingDisplayTimeoutRef.current);
          loadingDisplayTimeoutRef.current = null;
        }

        if (errorDisplayTimeoutRef.current) {
          clearTimeout(errorDisplayTimeoutRef.current);
          errorDisplayTimeoutRef.current = null;
        }

        // Hide any currently displayed UI
        setShowLoading(false);
        setShowError(false);

        // Add delay to prevent crash during navigation to close2.html
        // This allows the webview to complete the navigation before window destruction
        setTimeout(async () => {
          try {
            await invokeWithRetry('video-call-window/close-requested', {
              maxAttempts: 2,
              retryDelay: 500,
              logRetries: process.env.NODE_ENV === 'development',
            });
            if (process.env.NODE_ENV === 'development') {
              console.log(
                'VideoCallWindow: Close request confirmed by main process'
              );
            }
          } catch (error) {
            console.error(
              'VideoCallWindow: Failed to send close request:',
              error
            );
          }
        }, 1000); // 1 second delay to let navigation complete and prevent crash
      }
    };

    const handleLoadStart = () => {
      console.log('VideoCallWindow: Load started');

      // Don't update state or show loading UI if window is closing
      if (isClosing) {
        console.log(
          'VideoCallWindow: Skipping load start handling - window is closing'
        );
        return;
      }

      // Don't show loading UI if initial load has already completed (subsequent navigations)
      // BUT allow loading UI during recovery attempts or manual reloads
      if (hasInitialLoadCompleted && !isReloading && recoveryAttempt === 0) {
        console.log(
          'VideoCallWindow: Skipping loading UI - initial load already completed, this is likely a navigation within the video call'
        );
        return;
      }

      setIsFailed(false);
      setIsReloading(false);
      setIsLoading(true);
      setShowError(false);

      // Clear any pending display timeouts
      if (loadingDisplayTimeoutRef.current) {
        clearTimeout(loadingDisplayTimeoutRef.current);
        loadingDisplayTimeoutRef.current = null;
      }

      if (errorDisplayTimeoutRef.current) {
        clearTimeout(errorDisplayTimeoutRef.current);
        errorDisplayTimeoutRef.current = null;
      }

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }

      // Delay showing loading spinner to prevent quick flashes
      loadingDisplayTimeoutRef.current = setTimeout(() => {
        // Only show loading if we're still actually loading (not finished) and not closing
        // Allow loading during recovery attempts or manual reloads even if initial load completed
        const shouldShowLoading =
          isLoading &&
          !isFailed &&
          !isClosing &&
          (!hasInitialLoadCompleted || isReloading || recoveryAttempt > 0);

        if (shouldShowLoading) {
          console.log('VideoCallWindow: Showing loading spinner after delay');
          setShowLoading(true);
        } else {
          console.log(
            'VideoCallWindow: Skipping loading spinner - already finished loading or window is closing'
          );
        }
        loadingDisplayTimeoutRef.current = null;
      }, LOADING_SHOW_DELAY);

      invokeWithRetry('video-call-window/webview-loading', {
        maxAttempts: 2,
        retryDelay: 500,
        logRetries: process.env.NODE_ENV === 'development',
      })
        .then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'VideoCallWindow: Webview loading state confirmed by main process'
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
        invokeWithRetry('video-call-window/open-webview-dev-tools', {
          maxAttempts: 2,
          retryDelay: 500,
          logRetries: process.env.NODE_ENV === 'development',
        })
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

      // Clear pending loading display timeout if it hasn't fired yet
      if (loadingDisplayTimeoutRef.current) {
        clearTimeout(loadingDisplayTimeoutRef.current);
        loadingDisplayTimeoutRef.current = null;
      }

      // Hide loading immediately on success to make it feel snappy
      setIsLoading(false);
      setShowLoading(false);
      setIsFailed(false);
      setShowError(false);

      // Mark that initial load has completed successfully
      setHasInitialLoadCompleted(true);

      invokeWithRetry('video-call-window/webview-ready', {
        maxAttempts: 2,
        retryDelay: 500,
        logRetries: process.env.NODE_ENV === 'development',
      })
        .then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'VideoCallWindow: Webview ready state confirmed by main process'
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
        // Don't immediately hide loading on stop-loading, let finish-load handle it
        // This prevents flicker when both events fire quickly
        console.log(
          'VideoCallWindow: Waiting for finish-load to complete transition'
        );
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

        // Clear pending loading display
        if (loadingDisplayTimeoutRef.current) {
          clearTimeout(loadingDisplayTimeoutRef.current);
          loadingDisplayTimeoutRef.current = null;
        }

        setIsLoading(false);
        setShowLoading(false);
        setIsReloading(false);
        setIsFailed(true);
        setErrorMessage(`${event.errorDescription} (${event.errorCode})`);

        // Use longer delay for 404-like errors which tend to flicker during initial load
        // Error codes: -6 = ERR_FILE_NOT_FOUND, -105 = ERR_NAME_NOT_RESOLVED, -106 = ERR_INTERNET_DISCONNECTED
        const is404LikeError = [-6, -105, -106].includes(event.errorCode);
        const errorDelay = is404LikeError
          ? ERROR_SHOW_DELAY_404
          : ERROR_SHOW_DELAY;

        // Delay showing error to prevent flicker during quick retry attempts
        errorDisplayTimeoutRef.current = setTimeout(() => {
          // Only show error if we're still in failed state (not recovered)
          if (isFailed && !isLoading) {
            console.log(
              `VideoCallWindow: Showing error screen after ${errorDelay}ms delay`
            );
            setShowError(true);
          } else {
            console.log(
              'VideoCallWindow: Skipping error screen - state recovered'
            );
          }
          errorDisplayTimeoutRef.current = null;
        }, errorDelay);

        ipcRenderer
          .invoke(
            'video-call-window/webview-failed',
            `${event.errorDescription} (${event.errorCode})`
          )
          .then((result) => {
            if (result?.success && process.env.NODE_ENV === 'development') {
              console.log(
                'VideoCallWindow: Webview failed state confirmed by main process'
              );
            } else if (!result?.success) {
              console.warn(
                'VideoCallWindow: Main process did not confirm webview failed state'
              );
            }
          })
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

      // Clear pending loading display
      if (loadingDisplayTimeoutRef.current) {
        clearTimeout(loadingDisplayTimeoutRef.current);
        loadingDisplayTimeoutRef.current = null;
      }

      setIsLoading(false);
      setShowLoading(false);
      setIsReloading(false);
      setIsFailed(true);
      setErrorMessage(t('videoCall.error.crashed'));

      // Show error immediately for crashes (more serious than load failures)
      setShowError(true);

      invokeWithRetry(
        'video-call-window/webview-failed',
        {
          maxAttempts: 2,
          retryDelay: 500,
          logRetries: process.env.NODE_ENV === 'development',
        },
        'Webview crashed'
      )
        .then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'VideoCallWindow: Webview crashed state confirmed by main process'
            );
          }
        })
        .catch((error) => {
          console.error(
            'VideoCallWindow: Failed to send webview failed state:',
            error
          );
        });
    };

    const handleWebviewAttached = () => {
      console.log('VideoCallWindow: Webview attached');

      invokeWithRetry('video-call-window/webview-created', {
        maxAttempts: 2,
        retryDelay: 500,
        logRetries: process.env.NODE_ENV === 'development',
      })
        .then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              'VideoCallWindow: Webview created state confirmed by main process'
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
          invokeWithRetry('video-call-window/open-webview-dev-tools', {
            maxAttempts: 2,
            retryDelay: 500,
            logRetries: process.env.NODE_ENV === 'development',
          })
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

      // Clean up all timeout references
      [
        loadingTimeoutRef,
        recoveryTimeoutRef,
        loadingDisplayTimeoutRef,
        errorDisplayTimeoutRef,
      ].forEach((ref) => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });
    };
  }, [
    videoCallUrl,
    shouldAutoOpenDevtools,
    isFailed,
    isLoading,
    isReloading,
    recoveryAttempt,
    isClosing,
    hasInitialLoadCompleted,
    t,
  ]);

  const handleReload = (): void => {
    console.log('VideoCallWindow: Manual reload requested');
    setIsReloading(true);
    setIsFailed(false);
    setIsLoading(true);
    setErrorMessage(null);
    setHasInitialLoadCompleted(false); // Reset for manual reload
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
      {showLoading && !showError && !isClosing && (
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

      {showError && !isClosing && (
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
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          visibility:
            showError || showLoading || isLoading ? 'hidden' : 'visible',
          zIndex: 0,
        }}
      />
    </Box>
  );
};

export default VideoCallWindow;
