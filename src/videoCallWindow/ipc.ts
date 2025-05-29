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
        webContents.session.setPermissionRequestHandler(
          async (_webContents, permission, callback, details) => {
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

                  if (process.platform === 'win32') {
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
                }

                callback(allowed);
                break;
              }

              case 'geolocation':
              case 'notifications':
              case 'midiSysex':
              case 'pointerLock':
              case 'fullscreen':
                callback(true);
                return;

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
