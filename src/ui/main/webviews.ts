import path from 'path';

import {
  app,
  BrowserView,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  clipboard,
  ContextMenuParams,
  DidFailLoadEvent,
  DidNavigateEvent,
  Event,
  Input,
  Menu,
  MenuItemConstructorOptions,
  NewWindowWebContentsEvent,
  PostBody,
  Referrer,
  session,
  shell,
  UploadBlob,
  UploadFile,
  UploadRawData,
  WebContents,
} from 'electron';
import i18next from 'i18next';

import { setupPreloadReload } from '../../app/main/dev';
import { isProtocolAllowed } from '../../navigation/main';
import { Server } from '../../servers/common';
import { Dictionary } from '../../spellChecking/common';
import { importSpellCheckingDictionaries, getCorrectionsForMisspelling } from '../../spellChecking/main';
import { dispatch, select, listen, watch } from '../../store';
import {
  WEBVIEW_DID_NAVIGATE,
  WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_DID_FAIL_LOAD,
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_REMOVE_SERVER_CLICKED,
  WEBVIEW_PRELOAD_INFO_REQUESTED,
  WEBVIEW_PRELOAD_INFO_RESPONDED,
} from '../actions';
import { browseForSpellCheckingDictionary } from './dialogs';

const t = i18next.t.bind(i18next);

class ServerWebView {
  static instances = new Set<ServerWebView>();

  url: Server['url'];

  parent: BrowserWindow;

  browserView: BrowserView;

  unsubscribeFromIsSideBarVisible: () => void;

  constructor(server: Server, parent: BrowserWindow) {
    ServerWebView.instances.add(this);

    this.url = server.url;
    this.parent = parent;

    this.browserView = new BrowserView({
      webPreferences: {
        preload: path.join(app.getAppPath(), 'app/preload.js'),
        nodeIntegration: false,
        nodeIntegrationInWorker: true,
        nodeIntegrationInSubFrames: true,
        enableRemoteModule: false,
        webSecurity: true,
        contextIsolation: true,
        worldSafeExecuteJavaScript: true,
        partition: 'persist:rocketchat-server',
      },
    });

    if (process.env.NODE_ENV === 'development') {
      setupPreloadReload(this.browserView.webContents);
    }

    // webContents.send('console-warn', '%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
    // webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.description'));
    // webContents.send('console-warn', '%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));

    this.browserView.webContents.addListener('new-window', this.handleNewWindow);
    this.browserView.webContents.addListener('did-start-loading', this.handleDidStartLoading);
    this.browserView.webContents.addListener('did-fail-load', this.handleDidFailLoad);
    this.browserView.webContents.addListener('dom-ready', this.handleDomReady);
    this.browserView.webContents.addListener('did-navigate-in-page', this.handleDidNavigateInPage);
    this.browserView.webContents.addListener('context-menu', this.handleContextMenu);
    this.browserView.webContents.addListener('before-input-event', this.handleBeforeInputEvent);

    setImmediate((lastPath, url) => {
      this.browserView.webContents.loadURL(lastPath ?? url);
    }, server.lastPath, server.url);
  }

  destroy(): void {
    this.parent.removeBrowserView(this.browserView);
    this.browserView.destroy();
  }

  handleNewWindow = (
    event: NewWindowWebContentsEvent,
    url: string,
    _frameName: string,
    disposition: ('default' | 'foreground-tab' | 'background-tab' | 'new-window' | 'save-to-disk' | 'other'),
    options: BrowserWindowConstructorOptions,
    _additionalFeatures: string[],
    referrer: Referrer,
    postBody: PostBody,
  ): void => {
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
  }

  handleDidStartLoading = (): void => {
    dispatch({
      type: WEBVIEW_DID_START_LOADING,
      payload: {
        url: this.url,
      },
    });
  }

  handleDidFailLoad = (
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
      payload: {
        url: this.url,
        isMainFrame,
      },
    });
  };

  handleDomReady = (): void => {
    this.browserView.webContents.focus();
  }

  handleDidNavigateInPage = (
    _event: DidNavigateEvent,
    pageUrl: string,
    _isMainFrame: boolean,
    _frameProcessId: number,
    _frameRoutingId: number,
  ): void => {
    dispatch({
      type: WEBVIEW_DID_NAVIGATE,
      payload: {
        url: this.url,
        pageUrl,
      },
    });
  }

  handleContextMenu = async (event: Event, params: ContextMenuParams): Promise<void> => {
    const serverWebContents = this.browserView.webContents;

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
                serverWebContents.replaceMisspelling(correction);
              },
            })),
          ...corrections.length > 6 ? [
            {
              label: t('contextMenu.moreSpellingSuggestions'),
              submenu: corrections.slice(6).map<MenuItemConstructorOptions>((correction) => ({
                label: correction,
                click: () => {
                  serverWebContents.replaceMisspelling(correction);
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
                const filePaths = await browseForSpellCheckingDictionary(this.parent);
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
          click: () => serverWebContents.downloadURL(srcURL),
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
    menu.popup({ window: this.parent });
  }

  handleBeforeInputEvent = (_event: Event, { type, key }: Input): void => {
    if (type !== 'keyUp' && type !== 'keyDown') {
      return;
    }

    const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    if (key !== shortcutKey) {
      return;
    }

    this.parent.webContents.sendInputEvent({ type, keyCode: key, modifiers: [] });
  }

  show(): void {
    this.parent.addBrowserView(this.browserView);

    this.unsubscribeFromIsSideBarVisible = watch(({
      servers,
      isSideBarEnabled,
    }) => servers.length > 0 && isSideBarEnabled, (isSideBarVisible) => {
      const sidebarWidth = isSideBarVisible ? 68 : 0;
      this.browserView.setBounds({
        x: sidebarWidth,
        y: 0,
        width: this.parent.getContentBounds().width - sidebarWidth,
        height: this.parent.getContentBounds().height,
      });
    });

    this.browserView.setAutoResize({
      width: true,
      height: true,
    });
  }

  hide(): void {
    this.unsubscribeFromIsSideBarVisible();
    this.parent.removeBrowserView(this.browserView);
  }
}

export const getWebContentsByServerUrl = (serverUrl: string): WebContents =>
  Array.from(ServerWebView.instances.values()).find((serverWebView) => serverWebView.url === serverUrl)?.browserView.webContents;

export const getAllServerWebContents = (): WebContents[] =>
  Array.from(ServerWebView.instances.values(), (serverWebView) => serverWebView.browserView.webContents);

export const attachGuestWebContentsEvents = (rootWindow: BrowserWindow): void => {
  listen(LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, (action) => {
    const guestWebContents = getWebContentsByServerUrl(action.payload.url);
    guestWebContents.loadURL(action.payload.url);
  });

  listen(WEBVIEW_PRELOAD_INFO_REQUESTED, (action) => {
    const { webContentsId } = action.meta;
    const serverWebView = Array.from(ServerWebView.instances.values())
      .find((serverWebView) => serverWebView.browserView.webContents.id === webContentsId);

    if (!serverWebView) {
      return;
    }

    dispatch({
      type: WEBVIEW_PRELOAD_INFO_RESPONDED,
      payload: {
        url: serverWebView.url,
      },
      meta: {
        response: true,
        id: action.meta.id,
      },
    });
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

  watch(({ servers }) => servers, (servers) => {
    ServerWebView.instances.forEach((serverWebView) => {
      const kept = servers.some((server) => server.url === serverWebView.url);
      if (kept) {
        return;
      }

      serverWebView.destroy();
      ServerWebView.instances.delete(serverWebView);
    });

    servers.forEach((server) => {
      const present = Array.from(ServerWebView.instances.values()).some((serverWebView) => serverWebView.url === server.url);
      if (present) {
        return;
      }

      ServerWebView.instances.add(new ServerWebView(server, rootWindow));
    });
  });

  watch(({
    currentServerUrl,
    servers,
  }) => (servers.find((server) => server.url === currentServerUrl)?.failed ? null : currentServerUrl), (currentServerUrl, prevCurrentServerUrl) => {
    ServerWebView.instances.forEach((serverWebView) => {
      if (serverWebView.url === currentServerUrl) {
        serverWebView.show();
      }

      if (serverWebView.url === prevCurrentServerUrl) {
        serverWebView.hide();
      }
    });
  });
};
