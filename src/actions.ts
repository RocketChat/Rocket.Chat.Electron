import { Certificate, EditFlags } from 'electron';

import { FluxStandardAction } from './structs/fsa';
import { ExtendedNotificationOptions } from './structs/notifications';
import { Server } from './structs/servers';
import { Dictionary } from './structs/spellChecking';
import { WindowState } from './structs/ui';

export const ABOUT_DIALOG_DISMISSED = 'about-dialog/dismissed';
export const ABOUT_DIALOG_TOGGLE_UPDATE_ON_START = 'about-dialog/toggle-update-on-start';
export const ADD_SERVER_VIEW_SERVER_ADDED = 'add-server/view-server-added';
export const APP_ERROR_THROWN = 'app/error-thrown';
export const APP_PATH_SET = 'app/path-set';
export const APP_VERSION_SET = 'app/version-set';
export const CERTIFICATES_CLEARED = 'certificates/cleared';
export const CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED = 'certificates/client-certificate-requested';
export const CERTIFICATES_UPDATED = 'certificates/updated';
export const DEEP_LINKS_SERVER_ADDED = 'deep-links/server-added';
export const DEEP_LINKS_SERVER_FOCUSED = 'deep-links/server-focused';
export const LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED = 'loading-error-view/reload-server-clicked';
export const MENU_BAR_ABOUT_CLICKED = 'menu-bar/about-clicked';
export const MENU_BAR_ADD_NEW_SERVER_CLICKED = 'menu-bar/add-new-server-clicked';
export const MENU_BAR_SELECT_SERVER_CLICKED = 'menu-bar/select-server-clicked';
export const MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED = 'menu-bar/toggle-is-menu-bar-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED = 'menu-bar/toggle-is-show-window-on-unread-changed-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED = 'menu-bar/toggle-is-side-bar-enabled-clicked';
export const MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED = 'menu-bar/toggle-is-tray-icon-enabled-clicked';
export const PERSISTABLE_VALUES_MERGED = 'persistable-values/merged';
export const ROOT_WINDOW_EDIT_FLAGS_CHANGED = 'root-window/edit-flags-changed';
export const ROOT_WINDOW_STATE_CHANGED = 'root-window/state-changed';
export const ROOT_WINDOW_WEBCONTENTS_FOCUSED = 'root-window/webcontents-focused';
export const SCREEN_SHARING_DIALOG_DISMISSED = 'screen-sharing-dialog/dismissed';
export const SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED = 'select-client-certificate-dialog/certificate-selected';
export const SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED = 'select-client-certificatedialog/dismissed';
export const SERVER_VALIDATION_REQUESTED = 'server/validation-requested';
export const SERVER_VALIDATION_RESPONDED = 'server/validation-responded';
export const SIDE_BAR_ADD_NEW_SERVER_CLICKED = 'side-bar/add-new-server-clicked';
export const SIDE_BAR_CONTEXT_MENU_TRIGGERED = 'side-bar/context-menu-triggered';
export const SIDE_BAR_REMOVE_SERVER_CLICKED = 'side-bar/remove-server-clicked';
export const SIDE_BAR_SERVER_SELECTED = 'side-bar/server-selected';
export const SIDE_BAR_SERVERS_SORTED = 'side-bar/servers-sorted';
export const SPELL_CHECKING_DICTIONARIES_UPDATED = 'spell-checking/dictionaries-updated';
export const SPELL_CHECKING_MISSPELT_WORDS_REQUESTED = 'spell-checking/misspelt-words-requested';
export const SPELL_CHECKING_MISSPELT_WORDS_RESPONDED = 'spell-checking/misspelt-words-responded';
export const SPELL_CHECKING_READY = 'spell-checking/ready';
export const SYSTEM_IDLE_STATE_REQUESTED = 'system/idle-state-resquested';
export const SYSTEM_IDLE_STATE_RESPONDED = 'system/idle-state-responded';
export const SYSTEM_LOCKING_SCREEN = 'system/locking-screen';
export const SYSTEM_SUSPENDING = 'system/suspending';
export const TOUCH_BAR_FORMAT_BUTTON_TOUCHED = 'touch-bar/format-button-touched';
export const TOUCH_BAR_SELECT_SERVER_TOUCHED = 'touch-bar/select-server-touched';
export const UPDATE_DIALOG_DISMISSED = 'update-dialog/dismissed';
export const UPDATE_DIALOG_INSTALL_BUTTON_CLICKED = 'update-dialog/install-button-clicked';
export const UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED = 'update-dialog/remind-update-later-clicked';
export const UPDATE_DIALOG_SKIP_UPDATE_CLICKED = 'update-dialog/skip-update-clicked';
export const UPDATE_SKIPPED = 'update/skipped';
export const UPDATES_CHECK_FOR_UPDATES_REQUESTED = 'updates/check-for-updates-requested';
export const UPDATES_CHECKING_FOR_UPDATE = 'updates/checking-for-update';
export const UPDATES_ERROR_THROWN = 'updates/error-thrown';
export const UPDATES_NEW_VERSION_AVAILABLE = 'updates/new-version-available';
export const UPDATES_NEW_VERSION_NOT_AVAILABLE = 'updates/new-version-not-available';
export const UPDATES_READY = 'updates/ready';
export const WEBVIEW_DID_FAIL_LOAD = 'webview/did-fail-load';
export const WEBVIEW_DID_NAVIGATE = 'webview/did-navigate';
export const WEBVIEW_DID_START_LOADING = 'webview/did-start-loading';
export const WEBVIEW_EDIT_FLAGS_CHANGED = 'webview/edit-flags-changed';
export const WEBVIEW_FAVICON_CHANGED = 'webview/favicon-changed';
export const WEBVIEW_FOCUS_REQUESTED = 'webview/focus-requested';
export const WEBVIEW_MESSAGE_BOX_BLURRED = 'webview/message-box-blurred';
export const WEBVIEW_MESSAGE_BOX_FOCUSED = 'webview/message-box-focused';
export const WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED = 'webview/screen-sharing-source-requested';
export const WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED = 'webview/screen-sharing-source-responded';
export const WEBVIEW_SIDEBAR_STYLE_CHANGED = 'webview/sidebar-style-changed';
export const WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED = 'webview/spell-checking-dictionary-toggled';
export const WEBVIEW_TITLE_CHANGED = 'webview/title-changed';
export const WEBVIEW_UNREAD_CHANGED = 'webview/unread-changed';
export const I18N_PARAMS_REQUESTED = 'i18n/params-requested';
export const I18N_PARAMS_RESPONDED = 'i18n/params-responded';
export const NOTIFICATIONS_CREATE_REQUESTED = 'notifications/create-requested';
export const NOTIFICATIONS_CREATE_RESPONDED = 'notifications/create-responded';
export const NOTIFICATIONS_NOTIFICATION_DISMISSED = 'notifications/notification-dismissed';
export const NOTIFICATIONS_NOTIFICATION_SHOWN = 'notifications/notification-shown';
export const NOTIFICATIONS_NOTIFICATION_CLOSED = 'notifications/notification-closed';
export const NOTIFICATIONS_NOTIFICATION_CLICKED = 'notifications/notification-clicked';
export const NOTIFICATIONS_NOTIFICATION_REPLIED = 'notifications/notification-replied';
export const NOTIFICATIONS_NOTIFICATION_ACTIONED = 'notifications/notification-actioned';

export type PersistableValuesMergedAction = FluxStandardAction<typeof PERSISTABLE_VALUES_MERGED, {
  currentServerUrl: string | null;
  doCheckForUpdatesOnStartup: boolean;
  isEachUpdatesSettingConfigurable: boolean;
  isMenuBarEnabled: boolean;
  isShowWindowOnUnreadChangedEnabled: boolean;
  isSideBarEnabled: boolean;
  isTrayIconEnabled: boolean;
  isUpdatingEnabled: boolean;
  mainWindowState: WindowState;
  servers: Server[];
  skippedUpdateVersion: string | null;
  spellCheckingDictionaries: Dictionary[];
  trustedCertificates: Record<Server['url'], Certificate['fingerprint']>;
}>;

export type UpdatesReadyAction = FluxStandardAction<typeof UPDATES_READY, {
  doCheckForUpdatesOnStartup: boolean;
  isEachUpdatesSettingConfigurable: boolean;
  isUpdatingAllowed: boolean;
  isUpdatingEnabled: boolean;
  skippedUpdateVersion: string | null;
}>;

export type AboutDialogDismissedAction = FluxStandardAction<typeof ABOUT_DIALOG_DISMISSED, never>;
export type AboutDialogToggleUpdateOnStartAction = FluxStandardAction<typeof ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, boolean>;
export type AddServerViewServerAddedAction = FluxStandardAction<typeof ADD_SERVER_VIEW_SERVER_ADDED, string>;
export type AppErrorThrownAction = FluxStandardAction<typeof APP_ERROR_THROWN, Error>;
export type AppPathSetAction = FluxStandardAction<typeof APP_PATH_SET, string>;
export type AppVersionSetAction = FluxStandardAction<typeof APP_VERSION_SET, string>;
export type CertificatesClearedAction = FluxStandardAction<typeof CERTIFICATES_CLEARED, never>;
export type CertificatesClientCertificateRequestedAction = FluxStandardAction<typeof CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED, Certificate[]>;
export type CertificatesUpdatedAction = FluxStandardAction<typeof CERTIFICATES_UPDATED, Record<Server['url'], Certificate['fingerprint']>>;
export type LoadingErrorViewReloadServerClickedAction = FluxStandardAction<typeof LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, { url: Server['url'] }>;
export type MenuBarAboutClickedAction = FluxStandardAction<typeof MENU_BAR_ABOUT_CLICKED, never>;
export type MenuBarAddNewServerClickedAction = FluxStandardAction<typeof MENU_BAR_ADD_NEW_SERVER_CLICKED, never>;
export type MenuBarSelectServerClickedAction = FluxStandardAction<typeof MENU_BAR_SELECT_SERVER_CLICKED, string>;
export type MenuBarToggleIsMenuBarEnabledClickedAction = FluxStandardAction<typeof MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED, boolean>;
export type MenuBarToggleIsShowWindowOnUnreadChangedEnabledClickedAction = FluxStandardAction<typeof MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED, boolean>;
export type MenuBarToggleIsSideBarEnabledClickedAction = FluxStandardAction<typeof MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED, boolean>;
export type MenuBarToggleIsTrayIconEnabledClickedAction = FluxStandardAction<typeof MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED, boolean>;
export type RootWindowEditFlagsChangedAction = FluxStandardAction<typeof ROOT_WINDOW_EDIT_FLAGS_CHANGED, EditFlags>;
export type RootWindowStateChangedAction = FluxStandardAction<typeof ROOT_WINDOW_STATE_CHANGED, WindowState>;
export type RootWindowWebContentsFocusedAction = FluxStandardAction<typeof ROOT_WINDOW_WEBCONTENTS_FOCUSED, number>;
export type ScreenSharingDialogDismissedAction = FluxStandardAction<typeof SCREEN_SHARING_DIALOG_DISMISSED, never>;
export type SelectClientCertificateDialogCertificateSelectedAction = FluxStandardAction<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED, never>;
export type SelectClientCertificateDialogDismissedAction = FluxStandardAction<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED, never>;
export type SideBarAddNewServerClickedAction = FluxStandardAction<typeof SIDE_BAR_ADD_NEW_SERVER_CLICKED, never>;
export type SideBarRemoveServerClickedAction = FluxStandardAction<typeof SIDE_BAR_REMOVE_SERVER_CLICKED, string>;
export type SideBarServerSelectedAction = FluxStandardAction<typeof SIDE_BAR_SERVER_SELECTED, string>;
export type SideBarServersSortedAction = FluxStandardAction<typeof SIDE_BAR_SERVERS_SORTED, string[]>;
export type SideBarContextMenuTriggeredAction = FluxStandardAction<typeof SIDE_BAR_CONTEXT_MENU_TRIGGERED, Server['url']>;
export type SpellCheckingDictionariesUpdatedAction = FluxStandardAction<typeof SPELL_CHECKING_DICTIONARIES_UPDATED, Dictionary[]>;
export type SpellCheckingMisspeltWordsRequestedAction = FluxStandardAction<typeof SPELL_CHECKING_MISSPELT_WORDS_REQUESTED, string[]>;
export type TouchBarFormatButtonTouchedAction = FluxStandardAction<typeof TOUCH_BAR_FORMAT_BUTTON_TOUCHED, 'bold' | 'italic' | 'strike' | 'inline_code' | 'multi_line' >;
export type TouchBarSelectServerTouchedAction = FluxStandardAction<typeof TOUCH_BAR_SELECT_SERVER_TOUCHED, string>;
export type UpdateDialogDismissedAction = FluxStandardAction<typeof UPDATE_DIALOG_DISMISSED, never>;
export type UpdateDialogInstallButtonClickedAction = FluxStandardAction<typeof UPDATE_DIALOG_INSTALL_BUTTON_CLICKED, never>;
export type UpdateDialogRemindUpdateLaterClickedAction = FluxStandardAction<typeof UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED, never>;
export type UpdateDialogSkipUpdateClickedAction = FluxStandardAction<typeof UPDATE_DIALOG_SKIP_UPDATE_CLICKED, never>;
export type UpdatesCheckingForUpdateAction = FluxStandardAction<typeof UPDATES_CHECKING_FOR_UPDATE, never>;
export type UpdatesErrorThrownAction = FluxStandardAction<typeof UPDATES_ERROR_THROWN, never>;
export type UpdateSkippedAction = FluxStandardAction<typeof UPDATE_SKIPPED, never>;
export type UpdatesNewVersionAvailableAction = FluxStandardAction<typeof UPDATES_NEW_VERSION_AVAILABLE, never>;
export type UpdatesNewVersionNotAvailableAction = FluxStandardAction<typeof UPDATES_NEW_VERSION_NOT_AVAILABLE, never>;
export type WebviewDidFailLoadAction = FluxStandardAction<typeof WEBVIEW_DID_FAIL_LOAD, { url: Server['url']; isMainFrame: boolean }>;
export type WebviewDidNavigateAction = FluxStandardAction<typeof WEBVIEW_DID_NAVIGATE, { url: Server['url']; pageUrl: Server['lastPath'] }>;
export type WebviewDidStartLoadingAction = FluxStandardAction<typeof WEBVIEW_DID_START_LOADING, { url: Server['url'] }>;
export type WebviewEditFlagsChangedAction = FluxStandardAction<typeof WEBVIEW_EDIT_FLAGS_CHANGED, EditFlags>;
export type WebviewFaviconChangedAction = FluxStandardAction<typeof WEBVIEW_FAVICON_CHANGED, { url: Server['url']; favicon: Server['favicon'] }>;
export type WebviewFocusRequestedAction = FluxStandardAction<typeof WEBVIEW_FOCUS_REQUESTED, { url: string }>;
export type WebviewMessageBoxBlurredAction = FluxStandardAction<typeof WEBVIEW_MESSAGE_BOX_BLURRED, never>;
export type WebviewMessageBoxFocusedAction = FluxStandardAction<typeof WEBVIEW_MESSAGE_BOX_FOCUSED, never>;
export type WebviewScreenSharingSourceRequestedAction = FluxStandardAction<typeof WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, never>;
export type WebviewScreenSharingSourceRespondedAction = FluxStandardAction<typeof WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED, never>;
export type WebviewSidebarStyleChangedAction = FluxStandardAction<typeof WEBVIEW_SIDEBAR_STYLE_CHANGED, { url: Server['url']; style: Server['style'] }>;
export type WebviewSpellCheckingDictionaryToggledAction = FluxStandardAction<typeof WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED, Dictionary>;
export type WebviewTitleChangedAction = FluxStandardAction<typeof WEBVIEW_TITLE_CHANGED, { url: Server['url']; title: Server['title'] }>;
export type WebviewUnreadChangedAction = FluxStandardAction<typeof WEBVIEW_UNREAD_CHANGED, { url: Server['url']; badge: Server['badge'] }>;
export type NotificationsCreateRequestedAction = FluxStandardAction<typeof NOTIFICATIONS_CREATE_REQUESTED, ExtendedNotificationOptions>;
export type NotificationsCreateRespondedAction = FluxStandardAction<typeof NOTIFICATIONS_CREATE_RESPONDED, { id: unknown }>;
export type NotificationsNotificationDismissedAction = FluxStandardAction<typeof NOTIFICATIONS_NOTIFICATION_DISMISSED, { id: unknown }>;
export type NotificationsNotificationShownAction = FluxStandardAction<typeof NOTIFICATIONS_NOTIFICATION_SHOWN, { id: unknown }>;
export type NotificationsNotificationClosedAction = FluxStandardAction<typeof NOTIFICATIONS_NOTIFICATION_CLOSED, { id: unknown }>;
export type NotificationsNotificationClickedAction = FluxStandardAction<typeof NOTIFICATIONS_NOTIFICATION_CLICKED, { id: unknown }>;
export type NotificationsNotificationRepliedAction = FluxStandardAction<typeof NOTIFICATIONS_NOTIFICATION_REPLIED, { id: unknown, reply: string }>;
export type NotificationsNotificationActionedAction = FluxStandardAction<typeof NOTIFICATIONS_NOTIFICATION_ACTIONED, { id: unknown, index: number }>;
export type SystemLockingScreenAction = FluxStandardAction<typeof SYSTEM_LOCKING_SCREEN, never>;
export type SystemSuspendingAction = FluxStandardAction<typeof SYSTEM_SUSPENDING, never>;

export type SideEffectAction = (
  AppErrorThrownAction
  | NotificationsNotificationDismissedAction
  | NotificationsNotificationActionedAction
  | NotificationsNotificationRepliedAction
  | NotificationsNotificationClickedAction
  | NotificationsNotificationClosedAction
  | NotificationsNotificationShownAction
  | SystemLockingScreenAction
  | SystemSuspendingAction
);
