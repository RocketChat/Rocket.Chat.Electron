import path from 'path';
import process from 'process';

import type {
  Event,
  WebContents,
  MediaAccessPermissionRequest,
} from 'electron';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  screen,
  systemPreferences,
  shell,
} from 'electron';

import { packageJsonInformation } from '../app/main/app';
import { handle } from '../ipc/main';
import { isProtocolAllowed } from '../navigation/main';
import { select, dispatchLocal } from '../store';
import { VIDEO_CALL_WINDOW_STATE_CHANGED } from '../ui/actions';
import { debounce } from '../ui/main/debounce';
import { askForMediaPermissionSettings } from '../ui/main/dialogs';
import { isInsideSomeScreen, getRootWindow } from '../ui/main/rootWindow';
import { openExternal } from '../utils/browserLauncher';

export const handleDesktopCapturerGetSources = () => {
  handle('desktop-capturer-get-sources', async (_event, opts) => {
    const options = Array.isArray(opts) ? opts[0] : opts;
    return desktopCapturer.getSources(options);
  });
};

const fetchVideoCallWindowState = async (browserWindow: BrowserWindow) => {
  return {
    focused: browserWindow.isFocused(),
    visible: browserWindow.isVisible(),
    maximized: false,
    minimized: false,
    fullscreen: false,
    normal: true,
    bounds: browserWindow.getNormalBounds(),
  };
};

export const startVideoCallWindowHandler = (): void => {
  handle(
    'video-call-window/screen-recording-is-permission-granted',
    async () => {
      if (process.platform === 'darwin') {
        const permission = systemPreferences.getMediaAccessStatus('screen');
        return permission === 'granted';
      }
      return true;
    }
  );

  handle('video-call-window/open-screen-picker', async (_event) => {
    // This is handled by the renderer process (screenSharePicker.tsx)
    // The handler exists to satisfy the IPC call from preload script
  });

  handle('video-call-window/open-window', async (_event, url) => {
    const validUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    if (validUrl.hostname.match(/(\.)?g\.co$/)) {
      openExternal(validUrl.toString());
      return;
    }
    if (allowedProtocols.includes(validUrl.protocol)) {
      const mainWindow = await getRootWindow();
      const winBounds = await mainWindow.getNormalBounds();

      const centeredWindowPosition = {
        x: winBounds.x + winBounds.width / 2,
        y: winBounds.y + winBounds.height / 2,
      };

      const actualScreen = screen.getDisplayNearestPoint({
        x: centeredWindowPosition.x,
        y: centeredWindowPosition.y,
      });

      // Get persisted window state and persistence setting
      const state = select((state) => ({
        videoCallWindowState: state.videoCallWindowState,
        isVideoCallWindowPersistenceEnabled:
          state.isVideoCallWindowPersistenceEnabled,
      }));

      let { x, y, width, height } = state.videoCallWindowState.bounds;

      // If persistence is disabled or no valid state exists, calculate default position and size
      if (
        !state.isVideoCallWindowPersistenceEnabled ||
        !x ||
        !y ||
        width === 0 ||
        height === 0 ||
        !isInsideSomeScreen({ x, y, width, height })
      ) {
        width = Math.round(actualScreen.workAreaSize.width * 0.8);
        height = Math.round(actualScreen.workAreaSize.height * 0.8);
        x = Math.round(
          (actualScreen.workArea.width - width) / 2 + actualScreen.workArea.x
        );
        y = Math.round(
          (actualScreen.workArea.height - height) / 2 + actualScreen.workArea.y
        );
      }

      const videoCallWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInSubFrames: true,
          contextIsolation: false,
          webviewTag: true,
        },
        show: false,
      });

      // Block navigation to smb:// protocol
      videoCallWindow.webContents.on(
        'will-navigate',
        (event: Event, url: string) => {
          if (url.toLowerCase().startsWith('smb://')) {
            event.preventDefault();
          }
        }
      );
      videoCallWindow.webContents.setWindowOpenHandler(
        ({ url }: { url: string }) => {
          if (url.toLowerCase().startsWith('smb://')) {
            return { action: 'deny' };
          }
          return { action: 'allow' };
        }
      );

      // Only track window state changes if persistence is enabled
      if (state.isVideoCallWindowPersistenceEnabled) {
        const fetchAndDispatchWindowState = debounce(async () => {
          dispatchLocal({
            type: VIDEO_CALL_WINDOW_STATE_CHANGED,
            payload: await fetchVideoCallWindowState(videoCallWindow),
          });
        }, 1000);

        videoCallWindow.addListener('show', fetchAndDispatchWindowState);
        videoCallWindow.addListener('hide', fetchAndDispatchWindowState);
        videoCallWindow.addListener('focus', fetchAndDispatchWindowState);
        videoCallWindow.addListener('blur', fetchAndDispatchWindowState);
        videoCallWindow.addListener('maximize', fetchAndDispatchWindowState);
        videoCallWindow.addListener('unmaximize', fetchAndDispatchWindowState);
        videoCallWindow.addListener('minimize', fetchAndDispatchWindowState);
        videoCallWindow.addListener('restore', fetchAndDispatchWindowState);
        videoCallWindow.addListener('resize', fetchAndDispatchWindowState);
        videoCallWindow.addListener('move', fetchAndDispatchWindowState);
      }

      videoCallWindow.loadFile(
        path.join(app.getAppPath(), 'app/video-call-window.html')
      );

      videoCallWindow.once('ready-to-show', () => {
        videoCallWindow.setTitle(packageJsonInformation.productName);
        videoCallWindow.webContents.send('video-call-window/open-url', url);
        videoCallWindow.show();
      });

      // Handle close request from Jitsi bridge
      handle('video-call-window/close-requested', async () => {
        videoCallWindow.close();
      });

      videoCallWindow.on('closed', () => {
        // Clean up the IPC handler to prevent duplicate registration
        ipcMain.removeHandler('video-call-window/close-requested');
      });

      const handleDidAttachWebview = (
        _event: Event,
        webContents: WebContents
      ): void => {
        // Set up window open handler for external protocols (like zoommtg://)
        webContents.setWindowOpenHandler(
          ({ url, disposition }: { url: string; disposition: any }) => {
            console.log('Video call window open handler:', {
              url,
              disposition,
            });

            // For external protocols and new windows, open them externally
            if (
              disposition === 'foreground-tab' ||
              disposition === 'background-tab' ||
              disposition === 'new-window'
            ) {
              isProtocolAllowed(url).then((allowed) => {
                if (allowed) {
                  openExternal(url);
                }
              });
              return { action: 'deny' };
            }

            // Allow other window opens to proceed normally
            return { action: 'allow' };
          }
        );

        // Handle navigation to external protocols in video call windows
        webContents.on('will-navigate', (event: any, url: string) => {
          console.log('Video call window will-navigate:', url);

          try {
            const parsedUrl = new URL(url);

            // Check if this is an external protocol (not http/https)
            if (
              !['http:', 'https:', 'file:', 'data:', 'about:'].includes(
                parsedUrl.protocol
              )
            ) {
              console.log(
                'External protocol detected in video call window:',
                parsedUrl.protocol
              );
              event.preventDefault();

              isProtocolAllowed(url).then((allowed) => {
                if (allowed) {
                  openExternal(url);
                }
              });
            }
          } catch (e) {
            // If URL parsing fails, let the default handling proceed
            console.warn('Failed to parse URL in video call window:', url, e);
          }
        });

        webContents.session.setPermissionRequestHandler(
          async (
            _webContents: any,
            permission: any,
            callback: any,
            details: any
          ) => {
            console.log(
              'Video call window permission request',
              permission,
              details
            );
            switch (permission) {
              case 'media': {
                const { mediaTypes = [] } =
                  details as MediaAccessPermissionRequest;

                if (process.platform === 'darwin') {
                  const allowed =
                    (!mediaTypes.includes('audio') ||
                      (await systemPreferences.askForMediaAccess(
                        'microphone'
                      ))) &&
                    (!mediaTypes.includes('video') ||
                      (await systemPreferences.askForMediaAccess('camera')));
                  callback(allowed);
                  break;
                }

                // For non-macOS platforms (including Linux), check system permissions on Windows only
                if (process.platform === 'win32') {
                  let microphoneAllowed = true;
                  let cameraAllowed = true;

                  if (mediaTypes.includes('audio')) {
                    const micStatus =
                      systemPreferences.getMediaAccessStatus('microphone');
                    microphoneAllowed = micStatus === 'granted';
                  }

                  if (mediaTypes.includes('video')) {
                    const camStatus =
                      systemPreferences.getMediaAccessStatus('camera');
                    cameraAllowed = camStatus === 'granted';
                  }

                  const allowed = microphoneAllowed && cameraAllowed;

                  if (!allowed) {
                    console.log('Media permissions denied by system:', {
                      microphone: microphoneAllowed,
                      camera: cameraAllowed,
                      requestedTypes: mediaTypes,
                    });

                    let permissionType: 'microphone' | 'camera' | 'both';
                    if (
                      mediaTypes.includes('audio') &&
                      mediaTypes.includes('video')
                    ) {
                      permissionType = 'both';
                    } else if (mediaTypes.includes('audio')) {
                      permissionType = 'microphone';
                    } else {
                      permissionType = 'camera';
                    }

                    askForMediaPermissionSettings(
                      permissionType,
                      videoCallWindow
                    ).then((openSettings) => {
                      if (openSettings) {
                        shell.openExternal('ms-settings:privacy-microphone');
                      }
                    });
                  }

                  callback(allowed);
                  break;
                }

                // For Linux and other platforms, always allow media access
                callback(true);
                break;
              }

              case 'geolocation':
              case 'notifications':
              case 'midiSysex':
              case 'pointerLock':
              case 'fullscreen':
                callback(true);
                return;

              case 'openExternal': {
                // Allow external protocol handling for video call windows
                // This is essential for Zoom, Teams, and other external app launches
                callback(true);
                return;
              }

              default:
                callback(false);
            }
          }
        );

        webContents.session.setDisplayMediaRequestHandler((_request, cb) => {
          videoCallWindow.webContents.send(
            'video-call-window/open-screen-picker'
          );
          ipcMain.once(
            'video-call-window/screen-sharing-source-responded',
            (_event, id) => {
              if (!id) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                cb(null);
                return;
              }

              desktopCapturer
                .getSources({ types: ['window', 'screen'] })
                .then((sources) => {
                  cb({ video: sources.find((s) => s.id === id) });
                });
            }
          );
        });
      };

      videoCallWindow.webContents.addListener(
        'did-attach-webview',
        handleDidAttachWebview
      );
    }
  });
};
