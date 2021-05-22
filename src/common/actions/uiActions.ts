import type { Server } from '../types/Server';

export const ABOUT_DIALOG_DISMISSED = 'about-dialog/dismissed';
export const ABOUT_DIALOG_TOGGLE_UPDATE_ON_START =
  'about-dialog/toggle-update-on-start';
export const LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED =
  'loading-error-view/reload-server-clicked';
export const MENU_BAR_ABOUT_CLICKED = 'menu-bar/about-clicked';
export const MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED =
  'menu-bar/toggle-is-menu-bar-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED =
  'menu-bar/toggle-is-show-window-on-unread-changed-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED =
  'menu-bar/toggle-is-side-bar-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED =
  'menu-bar/toggle-is-tray-icon-enabled-clicked';
export const SIDE_BAR_CONTEXT_MENU_TRIGGERED =
  'side-bar/context-menu-triggered';
export const SIDE_BAR_DOWNLOADS_BUTTON_CLICKED =
  'side-bar/downloads-button-clicked';
export const SIDE_BAR_SERVER_SELECTED = 'side-bar/server-selected';
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
export const WEBVIEW_MESSAGE_BOX_BLURRED = 'webview/message-box-blurred';
export const WEBVIEW_MESSAGE_BOX_FOCUSED = 'webview/message-box-focused';

export type UiActionTypeToPayloadMap = {
  [ABOUT_DIALOG_DISMISSED]: void;
  [ABOUT_DIALOG_TOGGLE_UPDATE_ON_START]: boolean;
  [LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED]: { url: Server['url'] };
  [MENU_BAR_ABOUT_CLICKED]: void;
  [MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED]: boolean;
  [SIDE_BAR_CONTEXT_MENU_TRIGGERED]: Server['url'];
  [SIDE_BAR_DOWNLOADS_BUTTON_CLICKED]: void;
  [SIDE_BAR_SERVER_SELECTED]: Server['url'];
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
  [WEBVIEW_MESSAGE_BOX_BLURRED]: void;
  [WEBVIEW_MESSAGE_BOX_FOCUSED]: void;
};
