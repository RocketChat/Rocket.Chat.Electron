import {
  app,
  BrowserWindow,
  shell,
  webContents,
  clipboard,
  Menu,
  WebContents,
  DidNavigateEvent,
  DidFailLoadEvent,
  MenuItemConstructorOptions,
  Event,
  Input,
  WebPreferences,
  ContextMenuParams,
  session,
  UploadRawData,
  UploadBlob,
  UploadFile,
} from 'electron';
import i18next from 'i18next';

import { setupPreloadReload } from '../../app/main/dev';
import { isProtocolAllowed } from '../../navigation/main';
import { Server } from '../../servers/common';
import { Dictionary } from '../../spellChecking/common';
import { importSpellCheckingDictionaries, getCorrectionsForMisspelling } from '../../spellChecking/main';
import { dispatch, select, listen } from '../../store';
import {
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_DID_FAIL_LOAD,
  WEBVIEW_ATTACHED,
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
} from '../actions';
import { browseForSpellCheckingDictionary } from './dialogs';

const t = i18next.t.bind(i18next);

const webContentsByServerUrl = new Map<Server['url'], WebContents>();

export const getWebContentsByServerUrl = (serverUrl: string): WebContents =>
  webContentsByServerUrl.get(serverUrl);

export const getAllServerWebContents = (): WebContents[] =>
  Array.from(webContentsByServerUrl.values());

const initializeServerWebContents = (serverUrl: string, guestWebContents: WebContents, rootWindow: BrowserWindow): void => {
  webContentsByServerUrl.set(serverUrl, guestWebContents);

  guestWebContents.addListener('destroyed', () => {
    webContentsByServerUrl.delete(serverUrl);
  });

  const handleDidStartLoading = (): void => {
    dispatch({ type: WEBVIEW_DID_START_LOADING, payload: { url: serverUrl } });
    rootWindow.webContents.send(WEBVIEW_DID_START_LOADING, serverUrl);
  };

  const handleDidFailLoad = (
    _event: DidFailLoadEvent,
    errorCode: number,
    _errorDescription: string,
    _validatedURL: string,
    isMainFrame: boolean,
    _frameProcessId: number,
    _frameRoutingId: number,
  ): void => {
    if (errorCode === -3) {
      console.warn('Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004');
      return;
    }

    dispatch({
      type: WEBVIEW_DID_FAIL_LOAD,
      payload: { url: serverUrl, isMainFrame },
    });
  };

  const handleDomReady = (): void => {
    guestWebContents.focus();
  };

  const handleDidNavigateInPage = (
    _event: DidNavigateEvent,
    pageUrl: string,
    _isMainFrame: boolean,
    _frameProcessId: number,
    _frameRoutingId: number,
  ): void => {
    dispatch({
      type: WEBVIEW_DID_NAVIGATE,
      payload: {
        url: serverUrl,
        pageUrl,
      },
    });
  };

  const handleContextMenu = async (event: Event, params: ContextMenuParams): Promise<void> => {
    event.preventDefault();

    const dictionaries = select(({ spellCheckingDictionaries }) => spellCheckingDictionaries);

    type Params = Partial<ContextMenuParams> & {
      corrections: string[];
      dictionaries: Dictionary[];
    };

    const createSpellCheckingMenuTemplate = ({
      isEditable,
      corrections,
      dictionaries,
    }: Params): MenuItemConstructorOptions[] => {
      if (!isEditable) {
        return [];
      }

      return [
        ...corrections ? [
          ...corrections.length === 0
            ? [
              {
                label: t('contextMenu.noSpellingSuggestions'),
                enabled: false,
              },
            ]
            : corrections.slice(0, 6).map<MenuItemConstructorOptions>((correction) => ({
              label: correction,
              click: () => {
                guestWebContents.replaceMisspelling(correction);
              },
            })),
          ...corrections.length > 6 ? [
            {
              label: t('contextMenu.moreSpellingSuggestions'),
              submenu: corrections.slice(6).map<MenuItemConstructorOptions>((correction) => ({
                label: correction,
                click: () => {
                  guestWebContents.replaceMisspelling(correction);
                },
              })),
            },
          ] : [],
          { type: 'separator' },
        ] as MenuItemConstructorOptions[] : [],
        {
          label: t('contextMenu.spellingLanguages'),
          enabled: dictionaries.length > 0,
          submenu: [
            ...dictionaries.map<MenuItemConstructorOptions>(({ name, enabled }) => ({
              label: name,
              type: 'checkbox',
              checked: enabled,
              click: ({ checked }) => {
                dispatch({
                  type: WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
                  payload: { name, enabled: checked },
                });
              },
            })),
            { type: 'separator' },
            {
              label: t('contextMenu.browseForLanguage'),
              click: async () => {
                const filePaths = await browseForSpellCheckingDictionary(rootWindow);
                importSpellCheckingDictionaries(filePaths);
              },
            },
          ],
        },
        { type: 'separator' },
      ];
    };

    const createImageMenuTemplate = ({
      mediaType,
      srcURL,
    }: Params): MenuItemConstructorOptions[] => (
      mediaType === 'image' ? [
        {
          label: t('contextMenu.saveImageAs'),
          click: () => guestWebContents.downloadURL(srcURL),
        },
        { type: 'separator' },
      ] : []
    );

    const createLinkMenuTemplate = ({
      linkURL,
      linkText,
    }: Params): MenuItemConstructorOptions[] => (
      linkURL
        ? [
          {
            label: t('contextMenu.openLink'),
            click: () => shell.openExternal(linkURL),
          },
          {
            label: t('contextMenu.copyLinkText'),
            click: () => clipboard.write({ text: linkText, bookmark: linkText }),
            enabled: !!linkText,
          },
          {
            label: t('contextMenu.copyLinkAddress'),
            click: () => clipboard.write({ text: linkURL, bookmark: linkText }),
          },
          { type: 'separator' },
        ]
        : []
    );

    const createDefaultMenuTemplate = ({
      editFlags: {
        canUndo = false,
        canRedo = false,
        canCut = false,
        canCopy = false,
        canPaste = false,
        canSelectAll = false,
      },
    }: Params): MenuItemConstructorOptions[] => [
      {
        label: t('contextMenu.undo'),
        role: 'undo',
        accelerator: 'CommandOrControl+Z',
        enabled: canUndo,
      },
      {
        label: t('contextMenu.redo'),
        role: 'redo',
        accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
        enabled: canRedo,
      },
      { type: 'separator' },
      {
        label: t('contextMenu.cut'),
        role: 'cut',
        accelerator: 'CommandOrControl+X',
        enabled: canCut,
      },
      {
        label: t('contextMenu.copy'),
        role: 'copy',
        accelerator: 'CommandOrControl+C',
        enabled: canCopy,
      },
      {
        label: t('contextMenu.paste'),
        role: 'paste',
        accelerator: 'CommandOrControl+V',
        enabled: canPaste,
      },
      {
        label: t('contextMenu.selectAll'),
        role: 'selectAll',
        accelerator: 'CommandOrControl+A',
        enabled: canSelectAll,
      },
    ];

    const props = {
      ...params,
      corrections: await getCorrectionsForMisspelling(params.selectionText),
      dictionaries,
    };

    const template = [
      ...createSpellCheckingMenuTemplate(props),
      ...createImageMenuTemplate(props),
      ...createLinkMenuTemplate(props),
      ...createDefaultMenuTemplate(props),
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: rootWindow });
  };

  const handleBeforeInputEvent = (_event: Event, { type, key }: Input): void => {
    if (type !== 'keyUp' && type !== 'keyDown') {
      return;
    }

    const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    if (key !== shortcutKey) {
      return;
    }

    rootWindow.webContents.sendInputEvent({ type, keyCode: key, modifiers: [] });
  };

  guestWebContents.addListener('did-start-loading', handleDidStartLoading);
  guestWebContents.addListener('did-fail-load', handleDidFailLoad);
  guestWebContents.addListener('dom-ready', handleDomReady);
  guestWebContents.addListener('did-navigate-in-page', handleDidNavigateInPage);
  guestWebContents.addListener('context-menu', handleContextMenu);
  guestWebContents.addListener('before-input-event', handleBeforeInputEvent);
};

export const attachGuestWebContentsEvents = (rootWindow: BrowserWindow): void => {
  const handleWillAttachWebview = (_event: Event, webPreferences: WebPreferences, _params: Record<string, string>): void => {
    delete webPreferences.enableBlinkFeatures;
    webPreferences.preload = `${ app.getAppPath() }/app/preload.js`;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = true;
    webPreferences.nodeIntegrationInSubFrames = true;
    webPreferences.enableRemoteModule = false;
    webPreferences.webSecurity = true;
    webPreferences.contextIsolation = true;
    webPreferences.worldSafeExecuteJavaScript = true;
  };

  const handleDidAttachWebview = (_event: Event, webContents: WebContents): void => {
    // webContents.send('console-warn', '%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
    // webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.description'));
    // webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));

    if (process.env.NODE_ENV === 'development') {
      setupPreloadReload(webContents);
    }

    webContents.addListener('new-window', (event, url, _frameName, disposition, options, _additionalFeatures, referrer, postBody) => {
      event.preventDefault();

      if (disposition === 'foreground-tab' || disposition === 'background-tab') {
        isProtocolAllowed(url).then((allowed) => {
          if (!allowed) {
            return;
          }

          shell.openExternal(url);
        });
        return;
      }

      const newWindow = new BrowserWindow({
        ...options,
        show: false,
      });

      newWindow.once('ready-to-show', () => {
        newWindow.show();
      });

      isProtocolAllowed(url).then((allowed) => {
        if (!allowed) {
          newWindow.destroy();
          return;
        }

        newWindow.loadURL(url, {
          httpReferrer: referrer,
          ...postBody && {
            extraHeaders: `Content-Type: ${ postBody.contentType }; boundary=${ postBody.boundary }`,
            postData: postBody.data as unknown as (UploadRawData[] | UploadBlob[] | UploadFile[]),
          },
        });
      });

      event.newGuest = newWindow;
    });
  };

  listen(WEBVIEW_ATTACHED, (action) => {
    const guestWebContents = webContents.fromId(action.payload.webContentsId);
    initializeServerWebContents(action.payload.url, guestWebContents, rootWindow);
  });

  listen(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload.url);
    guestWebContents.loadURL(action.payload.url);
  });

  listen(SIDE_BAR_CONTEXT_MENU_TRIGGERED, (action) => {
    const { payload: serverUrl } = action;

    const menuTemplate: MenuItemConstructorOptions[] = [
      {
        label: t('sidebar.item.reload'),
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          guestWebContents.loadURL(serverUrl);
        },
      },
      {
        label: t('sidebar.item.remove'),
        click: () => {
          dispatch({ type: SIDE_BAR_REMOVE_SERVER_CLICKED, payload: serverUrl });
        },
      },
      { type: 'separator' },
      {
        label: t('sidebar.item.openDevTools'),
        click: () => {
          const guestWebContents = getWebContentsByServerUrl(serverUrl);
          guestWebContents.openDevTools();
        },
      },
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup({
      window: rootWindow,
    });
  });

  const webviewsSession = session.fromPartition('persist:rocketchat-server');
  webviewsSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    switch (permission) {
      case 'media':
      case 'geolocation':
      case 'notifications':
      case 'midiSysex':
      case 'pointerLock':
      case 'fullscreen':
        callback(true);
        return;

      case 'openExternal':
        isProtocolAllowed(details.externalURL).then(callback);
        return;

      default:
        callback(false);
    }
  });

  rootWindow.webContents.addListener('will-attach-webview', handleWillAttachWebview);
  rootWindow.webContents.addListener('did-attach-webview', handleDidAttachWebview);
};
