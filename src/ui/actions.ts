import type { WebContents } from 'electron';

import type { Server } from '../servers/common';
import type { RootWindowIcon, WindowState } from './common';

export const ABOUT_DIALOG_DISMISSED = 'about-dialog/dismissed';
export const ABOUT_DIALOG_TOGGLE_UPDATE_ON_START =
  'about-dialog/toggle-update-on-start';
export const ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED =
  'about-dialog/update-channel-changed';
export const ADD_SERVER_VIEW_SERVER_ADDED = 'add-server/view-server-added';
export const CLEAR_CACHE_TRIGGERED = 'clear-cache/triggered';
export const CLEAR_CACHE_DIALOG_DISMISSED = 'clear-cache-dialog/dismissed';
export const CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED =
  'clear-cache-dialog/delete-login-data-clicked';
export const CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED =
  'clear-cache-dialog/keep-login-data-clicked';
export const LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED =
  'loading-error-view/reload-server-clicked';
export const MENU_BAR_ABOUT_CLICKED = 'menu-bar/about-clicked';
export const MENU_BAR_ADD_NEW_SERVER_CLICKED =
  'menu-bar/add-new-server-clicked';
export const MENU_BAR_SELECT_SERVER_CLICKED = 'menu-bar/select-server-clicked';
export const MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED =
  'menu-bar/toggle-is-menu-bar-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED =
  'menu-bar/toggle-is-show-window-on-unread-changed-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED =
  'menu-bar/toggle-is-side-bar-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED =
  'menu-bar/toggle-is-tray-icon-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_DEVELOPER_MODE_ENABLED_CLICKED =
  'menu-bar/toggle-is-developer-mode-enabled-clicked';
export const ROOT_WINDOW_ICON_CHANGED = 'root-window/icon-changed';
export const ROOT_WINDOW_STATE_CHANGED = 'root-window/state-changed';
export const VIDEO_CALL_WINDOW_STATE_CHANGED =
  'video-call-window/state-changed';
export const SIDE_BAR_ADD_NEW_SERVER_CLICKED =
  'side-bar/add-new-server-clicked';
export const SIDE_BAR_CONTEXT_MENU_TRIGGERED =
  'side-bar/context-menu-triggered';
export const SIDE_BAR_DOWNLOADS_BUTTON_CLICKED =
  'side-bar/downloads-button-clicked';
export const SIDE_BAR_SETTINGS_BUTTON_CLICKED =
  'side-bar/settings-button-clicked';
export const SIDE_BAR_REMOVE_SERVER_CLICKED = 'side-bar/remove-server-clicked';
export const SIDE_BAR_SERVER_SELECTED = 'side-bar/server-selected';
export const SIDE_BAR_SERVERS_SORTED = 'side-bar/servers-sorted';
export const TOUCH_BAR_FORMAT_BUTTON_TOUCHED =
  'touch-bar/format-button-touched';
export const TOUCH_BAR_SELECT_SERVER_TOUCHED =
  'touch-bar/select-server-touched';
export const UPDATE_DIALOG_DISMISSED = 'update-dialog/dismissed';
export const UPDATE_DIALOG_INSTALL_BUTTON_CLICKED =
  'update-dialog/install-button-clicked';
export const UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED =
  'update-dialog/remind-update-later-clicked';
export const UPDATE_DIALOG_SKIP_UPDATE_CLICKED =
  'update-dialog/skip-update-clicked';
export const WEBVIEW_READY = 'webview/ready';
export const WEBVIEW_ATTACHED = 'webview/attached';
export const WEBVIEW_DID_FAIL_LOAD = 'webview/did-fail-load';
export const WEBVIEW_DID_NAVIGATE = 'webview/did-navigate';
export const WEBVIEW_DID_START_LOADING = 'webview/did-start-loading';
export const WEBVIEW_FAVICON_CHANGED = 'webview/favicon-changed';
export const WEBVIEW_FOCUS_REQUESTED = 'webview/focus-requested';
export const WEBVIEW_MESSAGE_BOX_BLURRED = 'webview/message-box-blurred';
export const WEBVIEW_MESSAGE_BOX_FOCUSED = 'webview/message-box-focused';
export const WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED =
  'webview/screen-sharing-source-requested';
export const WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED =
  'webview/screen-sharing-source-responded';
export const WEBVIEW_SIDEBAR_STYLE_CHANGED = 'webview/sidebar-style-changed';
export const WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED =
  'webview/sidebar-custom-theme-changed';
export const WEBVIEW_GIT_COMMIT_HASH_CHANGED =
  'webview/git-commit-hash-changed';
export const WEBVIEW_GIT_COMMIT_HASH_CHECK = 'webview/git-commit-hash-check';
export const WEBVIEW_TITLE_CHANGED = 'webview/title-changed';
export const WEBVIEW_PAGE_TITLE_CHANGED = 'webview/page-title-changed';
export const WEBVIEW_UNREAD_CHANGED = 'webview/unread-changed';
export const WEBVIEW_USER_LOGGED_IN = 'webview/user-loggedin';
export const WEBVIEW_USER_THEME_APPEARANCE_CHANGED =
  'webview/user-theme-appearance-changed';
export const WEBVIEW_ALLOWED_REDIRECTS_CHANGED =
  'webview/allowed-redirects-changed';
export const SETTINGS_SET_REPORT_OPT_IN_CHANGED =
  'settings/set-bugsnag-opt-in-changed';
export const SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED =
  'settings/set-flashframe-opt-in-changed';
export const SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED =
  'settings/set-hardware-acceleration-opt-in-changed';
export const SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED =
  'settings/set-internalvideochatwindow-opt-in-changed';
export const SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED =
  'settings/set-minimize-on-close-opt-in-changed';
export const SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED =
  'settings/set-is-tray-icon-enabled-changed';
export const SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED =
  'settings/set-is-side-bar-enabled-changed';
export const SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED =
  'settings/set-is-menu-bar-enabled-changed';
export const SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED =
  'settings/set-is-video-call-window-persistence-enabled-changed';
export const SETTINGS_SET_IS_DEVELOPER_MODE_ENABLED_CHANGED =
  'settings/set-is-developer-mode-enabled-changed';
export const SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS =
  'settings/clear-permitted-screen-capture-permissions';
export const SETTINGS_NTLM_CREDENTIALS_CHANGED =
  'settings/ntlm-credentials-changed';
export const SETTINGS_AVAILABLE_BROWSERS_UPDATED =
  'settings/available-browsers-updated';
export const SETTINGS_SELECTED_BROWSER_CHANGED =
  'settings/selected-browser-changed';
export const SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN =
  'notifications/set-has-tray-minimize-notification-shown';
export const VIDEO_CALL_WINDOW_OPEN_URL = 'video-call-window/open-url';
export const DOWNLOADS_BACK_BUTTON_CLICKED = 'downloads/back-button-clicked';
export const WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED =
  'webview/server-supported-versions-updated';
export const WEBVIEW_SERVER_UNIQUE_ID_UPDATED =
  'webview/server-workspace-uid-updated';
export const WEBVIEW_SERVER_IS_SUPPORTED_VERSION =
  'webview/server-is-supported-version';
export const WEBVIEW_SERVER_VERSION_UPDATED = 'webview/version-updated';
export const SUPPORTED_VERSION_DIALOG_DISMISS =
  'supported-versions-dialog/dismiss';
export const WEBVIEW_SERVER_RELOADED = 'webview/server-reloaded';
export const WEBVIEW_PDF_VIEWER_ATTACHED = 'webview/pdf-viewer/attached';
export const SIDE_BAR_SERVER_RELOAD = 'side-bar/server-reload';
export const SIDE_BAR_SERVER_COPY_URL = 'side-bar/server-copy-url';
export const SIDE_BAR_SERVER_OPEN_DEV_TOOLS = 'side-bar/server-open-dev-tools';
export const SIDE_BAR_SERVER_FORCE_RELOAD = 'side-bar/server-force-reload';
export const SIDE_BAR_SERVER_REMOVE = 'side-bar/server-remove';

export type UiActionTypeToPayloadMap = {
  [ABOUT_DIALOG_DISMISSED]: void;
  [ABOUT_DIALOG_TOGGLE_UPDATE_ON_START]: boolean;
  [ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED]: string;
  [ADD_SERVER_VIEW_SERVER_ADDED]: Server['url'];
  [CLEAR_CACHE_TRIGGERED]: WebContents['id'];
  [CLEAR_CACHE_DIALOG_DISMISSED]: void;
  [CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED]: WebContents['id'];
  [CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED]: WebContents['id'];
  [LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED]: { url: Server['url'] };
  [MENU_BAR_ABOUT_CLICKED]: void;
  [MENU_BAR_ADD_NEW_SERVER_CLICKED]: void;
  [MENU_BAR_SELECT_SERVER_CLICKED]: Server['url'];
  [MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_DEVELOPER_MODE_ENABLED_CLICKED]: boolean;
  [ROOT_WINDOW_ICON_CHANGED]: RootWindowIcon | null;
  [ROOT_WINDOW_STATE_CHANGED]: WindowState;
  [VIDEO_CALL_WINDOW_STATE_CHANGED]: WindowState;
  [SIDE_BAR_ADD_NEW_SERVER_CLICKED]: void;
  [SIDE_BAR_CONTEXT_MENU_TRIGGERED]: Server['url'];
  [SIDE_BAR_DOWNLOADS_BUTTON_CLICKED]: void;
  [SIDE_BAR_SETTINGS_BUTTON_CLICKED]: void;
  [SIDE_BAR_REMOVE_SERVER_CLICKED]: Server['url'];
  [SIDE_BAR_SERVER_SELECTED]: Server['url'];
  [SIDE_BAR_SERVERS_SORTED]: Server['url'][];
  [SIDE_BAR_SERVER_RELOAD]: Server['url'];
  [SIDE_BAR_SERVER_COPY_URL]: Server['url'];
  [SIDE_BAR_SERVER_OPEN_DEV_TOOLS]: Server['url'];
  [SIDE_BAR_SERVER_FORCE_RELOAD]: Server['url'];
  [SIDE_BAR_SERVER_REMOVE]: Server['url'];
  [TOUCH_BAR_FORMAT_BUTTON_TOUCHED]:
    | 'bold'
    | 'italic'
    | 'strike'
    | 'inline_code'
    | 'multi_line';
  [TOUCH_BAR_SELECT_SERVER_TOUCHED]: string;
  [UPDATE_DIALOG_DISMISSED]: void;
  [UPDATE_DIALOG_INSTALL_BUTTON_CLICKED]: void;
  [UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED]: void;
  [UPDATE_DIALOG_SKIP_UPDATE_CLICKED]: string | null;
  [WEBVIEW_READY]: { url: Server['url']; webContentsId: number };
  [WEBVIEW_ATTACHED]: { url: Server['url']; webContentsId: number };
  [WEBVIEW_DID_FAIL_LOAD]: { url: Server['url']; isMainFrame: boolean };
  [WEBVIEW_DID_NAVIGATE]: { url: Server['url']; pageUrl: Server['lastPath'] };
  [WEBVIEW_DID_START_LOADING]: { url: Server['url'] };
  [WEBVIEW_FAVICON_CHANGED]: { url: Server['url']; favicon: Server['favicon'] };
  [WEBVIEW_FOCUS_REQUESTED]: { url: string; view: 'server' | 'downloads' };
  [WEBVIEW_MESSAGE_BOX_BLURRED]: void;
  [WEBVIEW_MESSAGE_BOX_FOCUSED]: void;
  [WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED]: void;
  [WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED]: string | null;
  [WEBVIEW_SIDEBAR_STYLE_CHANGED]: {
    url: Server['url'];
    style: Server['style'];
  };
  [WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED]: {
    url: Server['url'];
    customTheme: Server['customTheme'];
  };
  [WEBVIEW_TITLE_CHANGED]: { url: Server['url']; title: Server['title'] };
  [WEBVIEW_PAGE_TITLE_CHANGED]: {
    url: Server['url'];
    pageTitle: Server['pageTitle'];
  };
  [WEBVIEW_UNREAD_CHANGED]: { url: Server['url']; badge: Server['badge'] };
  [WEBVIEW_USER_LOGGED_IN]: {
    url: Server['url'];
    userLoggedIn: Server['userLoggedIn'];
  };
  [WEBVIEW_USER_THEME_APPEARANCE_CHANGED]: {
    url: Server['url'];
    themeAppearance: Server['themeAppearance'];
  };
  [WEBVIEW_GIT_COMMIT_HASH_CHECK]: {
    url: Server['url'];
    gitCommitHash: Server['gitCommitHash'];
  };
  [WEBVIEW_GIT_COMMIT_HASH_CHANGED]: {
    url: Server['url'];
    gitCommitHash: Server['gitCommitHash'];
  };
  [WEBVIEW_ALLOWED_REDIRECTS_CHANGED]: {
    url: Server['url'];
    allowedRedirects: Server['allowedRedirects'];
  };
  [SETTINGS_SET_REPORT_OPT_IN_CHANGED]: boolean;
  [SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED]: boolean;
  [SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED]: boolean;
  [SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED]: boolean;
  [SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED]: boolean;
  [SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED]: boolean;
  [SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED]: boolean;
  [SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED]: boolean;
  [SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED]: boolean;
  [SETTINGS_SET_IS_DEVELOPER_MODE_ENABLED_CHANGED]: boolean;
  [SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS]: void;
  [SETTINGS_NTLM_CREDENTIALS_CHANGED]: boolean;
  [SETTINGS_AVAILABLE_BROWSERS_UPDATED]: string[];
  [SETTINGS_SELECTED_BROWSER_CHANGED]: string | null;
  [SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN]: boolean;
  [VIDEO_CALL_WINDOW_OPEN_URL]: { url: string };
  [DOWNLOADS_BACK_BUTTON_CLICKED]: string;
  [WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED]: {
    url: Server['url'];
    supportedVersions: Server['supportedVersions'];
    source: Server['supportedVersionsSource'];
  };
  [WEBVIEW_SERVER_UNIQUE_ID_UPDATED]: {
    url: Server['url'];
    uniqueID: Server['uniqueID'];
  };
  [WEBVIEW_SERVER_IS_SUPPORTED_VERSION]: {
    url: Server['url'];
    isSupportedVersion: Server['isSupportedVersion'];
  };
  [WEBVIEW_SERVER_VERSION_UPDATED]: {
    url: Server['url'];
    version: Server['version'];
  };
  [SUPPORTED_VERSION_DIALOG_DISMISS]: { url: Server['url'] };
  [WEBVIEW_SERVER_RELOADED]: {
    url: Server['url'];
  };
  [WEBVIEW_PDF_VIEWER_ATTACHED]: { WebContentsId: number };
};
