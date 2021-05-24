import type { Server } from '../types/Server';

export const LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED =
  'loading-error-view/reload-server-clicked';
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

export type UiActionTypeToPayloadMap = {
  [LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED]: { url: Server['url'] };
  [MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED]: boolean;
  [MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED]: boolean;
  [SIDE_BAR_CONTEXT_MENU_TRIGGERED]: Server['url'];
};
