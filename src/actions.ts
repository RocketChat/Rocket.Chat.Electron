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

export type PersistableValuesMergedAction = FluxStandardAction<{
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
}, typeof PERSISTABLE_VALUES_MERGED>;

export type UpdatesReadyAction = FluxStandardAction<{
  doCheckForUpdatesOnStartup: boolean;
  isEachUpdatesSettingConfigurable: boolean;
  isUpdatingAllowed: boolean;
  isUpdatingEnabled: boolean;
  skippedUpdateVersion: string | null;
}, typeof UPDATES_READY>;

export type AboutDialogDismissedAction = FluxStandardAction<undefined, typeof ABOUT_DIALOG_DISMISSED>;
export type AboutDialogToggleUpdateOnStartAction = FluxStandardAction<boolean, typeof ABOUT_DIALOG_TOGGLE_UPDATE_ON_START>;
export type AddServerViewServerAddedAction = FluxStandardAction<string, typeof ADD_SERVER_VIEW_SERVER_ADDED>;
export type AppErrorThrown = FluxStandardAction<Error, typeof APP_ERROR_THROWN>;
export type AppPathSetAction = FluxStandardAction<string, typeof APP_PATH_SET>;
export type AppVersionSetAction = FluxStandardAction<string, typeof APP_VERSION_SET>;
export type CertificatesClearedAction = FluxStandardAction<undefined, typeof CERTIFICATES_CLEARED>;
export type CertificatesClientCertificateRequestedAction = FluxStandardAction<Certificate[], typeof CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED>;
export type CertificatesUpdatedAction = FluxStandardAction<Record<Server['url'], Certificate['fingerprint']>, typeof CERTIFICATES_UPDATED>;
export type LoadingErrorViewReloadServerClickedAction = FluxStandardAction<{ url: Server['url'] }, typeof LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED>;
export type MenuBarAboutClickedAction = FluxStandardAction<undefined, typeof MENU_BAR_ABOUT_CLICKED>;
export type MenuBarAddNewServerClickedAction = FluxStandardAction<undefined, typeof MENU_BAR_ADD_NEW_SERVER_CLICKED>;
export type MenuBarSelectServerClickedAction = FluxStandardAction<string, typeof MENU_BAR_SELECT_SERVER_CLICKED>;
export type MenuBarToggleIsMenuBarEnabledClickedAction = FluxStandardAction<boolean, typeof MENU_BAR_TOGGLE_IS_MENU_BAR_ENABLED_CLICKED>;
export type MenuBarToggleIsShowWindowOnUnreadChangedEnabledClickedAction = FluxStandardAction<boolean, typeof MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED>;
export type MenuBarToggleIsSideBarEnabledClickedAction = FluxStandardAction<boolean, typeof MENU_BAR_TOGGLE_IS_SIDE_BAR_ENABLED_CLICKED>;
export type MenuBarToggleIsTrayIconEnabledClickedAction = FluxStandardAction<boolean, typeof MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED>;
export type RootWindowEditFlagsChangedAction = FluxStandardAction<EditFlags, typeof ROOT_WINDOW_EDIT_FLAGS_CHANGED>;
export type RootWindowStateChangedAction = FluxStandardAction<WindowState, typeof ROOT_WINDOW_STATE_CHANGED>;
export type RootWindowWebContentsFocusedAction = FluxStandardAction<number, typeof ROOT_WINDOW_WEBCONTENTS_FOCUSED>;
export type ScreenSharingDialogDismissedAction = FluxStandardAction<undefined, typeof SCREEN_SHARING_DIALOG_DISMISSED>;
export type SelectClientCertificateDialogCertificateSelectedAction = FluxStandardAction<undefined, typeof SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED>;
export type SelectClientCertificateDialogDismissedAction = FluxStandardAction<undefined, typeof SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED>;
export type SideBarAddNewServerClickedAction = FluxStandardAction<undefined, typeof SIDE_BAR_ADD_NEW_SERVER_CLICKED>;
export type SideBarRemoveServerClickedAction = FluxStandardAction<string, typeof SIDE_BAR_REMOVE_SERVER_CLICKED>;
export type SideBarServerSelectedAction = FluxStandardAction<string, typeof SIDE_BAR_SERVER_SELECTED>;
export type SideBarServersSortedAction = FluxStandardAction<string[], typeof SIDE_BAR_SERVERS_SORTED>;
export type SideBarContextMenuTriggeredAction = FluxStandardAction<Server['url'], typeof SIDE_BAR_CONTEXT_MENU_TRIGGERED>;
export type SpellCheckingDictionariesUpdatedAction = FluxStandardAction<Dictionary[], typeof SPELL_CHECKING_DICTIONARIES_UPDATED>;
export type SpellCheckingMisspeltWordsRequestedAction = FluxStandardAction<string[], typeof SPELL_CHECKING_MISSPELT_WORDS_REQUESTED>;
export type TouchBarFormatButtonTouchedAction = FluxStandardAction<'bold' | 'italic' | 'strike' | 'inline_code' | 'multi_line' | typeof TOUCH_BAR_FORMAT_BUTTON_TOUCHED>;
export type TouchBarSelectServerTouchedAction = FluxStandardAction<string, typeof TOUCH_BAR_SELECT_SERVER_TOUCHED>;
export type UpdateDialogDismissedAction = FluxStandardAction<undefined, typeof UPDATE_DIALOG_DISMISSED>;
export type UpdateDialogInstallButtonClickedAction = FluxStandardAction<undefined, typeof UPDATE_DIALOG_INSTALL_BUTTON_CLICKED>;
export type UpdateDialogRemindUpdateLaterClickedAction = FluxStandardAction<undefined, typeof UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED>;
export type UpdateDialogSkipUpdateClickedAction = FluxStandardAction<undefined, typeof UPDATE_DIALOG_SKIP_UPDATE_CLICKED>;
export type UpdatesCheckingForUpdateAction = FluxStandardAction<undefined, typeof UPDATES_CHECKING_FOR_UPDATE>;
export type UpdatesErrorThrownAction = FluxStandardAction<undefined, typeof UPDATES_ERROR_THROWN>;
export type UpdateSkippedAction = FluxStandardAction<undefined, typeof UPDATE_SKIPPED>;
export type UpdatesNewVersionAvailableAction = FluxStandardAction<undefined, typeof UPDATES_NEW_VERSION_AVAILABLE>;
export type UpdatesNewVersionNotAvailableAction = FluxStandardAction<undefined, typeof UPDATES_NEW_VERSION_NOT_AVAILABLE>;
export type WebviewDidFailLoadAction = FluxStandardAction<{ url: Server['url']; isMainFrame: boolean }, typeof WEBVIEW_DID_FAIL_LOAD>;
export type WebviewDidNavigateAction = FluxStandardAction<{ url: Server['url']; pageUrl: Server['lastPath'] }, typeof WEBVIEW_DID_NAVIGATE>;
export type WebviewDidStartLoadingAction = FluxStandardAction<{ url: Server['url'] }, typeof WEBVIEW_DID_START_LOADING>;
export type WebviewEditFlagsChangedAction = FluxStandardAction<EditFlags, typeof WEBVIEW_EDIT_FLAGS_CHANGED>;
export type WebviewFaviconChangedAction = FluxStandardAction<{ url: Server['url']; favicon: Server['favicon'] }, typeof WEBVIEW_FAVICON_CHANGED>;
export type WebviewFocusRequestedAction = FluxStandardAction<{ url: string }, typeof WEBVIEW_FOCUS_REQUESTED>;
export type WebviewMessageBoxBlurredAction = FluxStandardAction<undefined, typeof WEBVIEW_MESSAGE_BOX_BLURRED>;
export type WebviewMessageBoxFocusedAction = FluxStandardAction<undefined, typeof WEBVIEW_MESSAGE_BOX_FOCUSED>;
export type WebviewScreenSharingSourceRequestedAction = FluxStandardAction<undefined, typeof WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED>;
export type WebviewScreenSharingSourceRespondedAction = FluxStandardAction<undefined, typeof WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED>;
export type WebviewSidebarStyleChangedAction = FluxStandardAction<{ url: Server['url']; style: Server['style'] }, typeof WEBVIEW_SIDEBAR_STYLE_CHANGED>;
export type WebviewSpellCheckingDictionaryToggledAction = FluxStandardAction<Dictionary, typeof WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED>;
export type WebviewTitleChangedAction = FluxStandardAction<{ url: Server['url']; title: Server['title'] }, typeof WEBVIEW_TITLE_CHANGED>;
export type WebviewUnreadChangedAction = FluxStandardAction<{ url: Server['url']; badge: Server['badge'] }, typeof WEBVIEW_UNREAD_CHANGED>;
export type NotificationsCreateRequestedAction = FluxStandardAction<ExtendedNotificationOptions, typeof NOTIFICATIONS_CREATE_REQUESTED>;
export type NotificationsCreateRespondedAction = FluxStandardAction<{ id: unknown }, typeof NOTIFICATIONS_CREATE_RESPONDED>;
export type NotificationsNotificationDismissedAction = FluxStandardAction<{ id: unknown }, typeof NOTIFICATIONS_NOTIFICATION_DISMISSED>;
export type NotificationsNotificationShownAction = FluxStandardAction<{ id: unknown }, typeof NOTIFICATIONS_NOTIFICATION_SHOWN>;
export type NotificationsNotificationClosedAction = FluxStandardAction<{ id: unknown }, typeof NOTIFICATIONS_NOTIFICATION_CLOSED>;
export type NotificationsNotificationClickedAction = FluxStandardAction<{ id: unknown }, typeof NOTIFICATIONS_NOTIFICATION_CLICKED>;
export type NotificationsNotificationRepliedAction = FluxStandardAction<{ id: unknown, reply: string }, typeof NOTIFICATIONS_NOTIFICATION_REPLIED>;
export type NotificationsNotificationActionedAction = FluxStandardAction<{ id: unknown, index: number }, typeof NOTIFICATIONS_NOTIFICATION_ACTIONED>;

export type AppPathActionTypes = AppPathSetAction;

export type AppVersionActionTypes = AppVersionSetAction;

export type ClientCertificatesActionTypes = (
  CertificatesClientCertificateRequestedAction
  | SelectClientCertificateDialogCertificateSelectedAction
  | SelectClientCertificateDialogDismissedAction
);

export type CurrentServerUrlActionTypes = (
  AddServerViewServerAddedAction
  | MenuBarAddNewServerClickedAction
  | MenuBarSelectServerClickedAction
  | SideBarAddNewServerClickedAction
  | SideBarRemoveServerClickedAction
  | SideBarServerSelectedAction
  | TouchBarSelectServerTouchedAction
  | WebviewFocusRequestedAction
  | PersistableValuesMergedAction
);

export type DoCheckForUpdatesOnStartupActionTypes = (
  AboutDialogToggleUpdateOnStartAction
  | UpdatesReadyAction
  | PersistableValuesMergedAction
);

export type EditFlagsActionTypes = (
  RootWindowEditFlagsChangedAction
  | WebviewEditFlagsChangedAction
);

export type FocusedWebContentsIdActionTypes = RootWindowWebContentsFocusedAction;

export type IsCheckingForUpdatesActionTypes = (
  UpdatesCheckingForUpdateAction
  | UpdatesErrorThrownAction
  | UpdatesNewVersionAvailableAction
  | UpdatesNewVersionNotAvailableAction
);

export type IsEachUpdatesSettingConfigurableActionTypes = (
  UpdatesReadyAction
  | PersistableValuesMergedAction
);

export type IsMenuBarEnabledActionTypes = (
  MenuBarToggleIsMenuBarEnabledClickedAction
  | PersistableValuesMergedAction
);

export type IsMessageBoxFocusedActionTypes = (
  WebviewMessageBoxFocusedAction
  | WebviewMessageBoxBlurredAction
  | WebviewDidStartLoadingAction
  | WebviewDidFailLoadAction
)

export type IsShowWindowOnUnreadChangedEnabledActionTypes = (
  MenuBarToggleIsShowWindowOnUnreadChangedEnabledClickedAction
  | PersistableValuesMergedAction
);

export type IsSideBarEnabledActionTypes = (
  MenuBarToggleIsSideBarEnabledClickedAction
  | PersistableValuesMergedAction
);

export type IsTrayIconEnabledActionTypes = (
  MenuBarToggleIsTrayIconEnabledClickedAction
  | PersistableValuesMergedAction
);

export type IsUpdatingAllowedActionTypes = UpdatesReadyAction;

export type IsUpdatingEnabledActionTypes = (
  UpdatesReadyAction
  | PersistableValuesMergedAction
);

export type MainWindowStateActionTypes = (
  RootWindowStateChangedAction
  | PersistableValuesMergedAction
);

export type NewUpdateVersionActionTypes = (
  UpdatesNewVersionAvailableAction
  | UpdatesNewVersionNotAvailableAction
);

export type OpenDialogActionTypes = (
  AboutDialogDismissedAction
  | CertificatesClientCertificateRequestedAction
  | MenuBarAboutClickedAction
  | ScreenSharingDialogDismissedAction
  | SelectClientCertificateDialogCertificateSelectedAction
  | SelectClientCertificateDialogDismissedAction
  | UpdateDialogDismissedAction
  | UpdateDialogInstallButtonClickedAction
  | UpdateDialogRemindUpdateLaterClickedAction
  | UpdateDialogSkipUpdateClickedAction
  | UpdatesNewVersionAvailableAction
  | WebviewScreenSharingSourceRequestedAction
  | WebviewScreenSharingSourceRespondedAction
);

export type ServersActionTypes = (
  AddServerViewServerAddedAction
  | SideBarRemoveServerClickedAction
  | SideBarServersSortedAction
  | WebviewDidNavigateAction
  | WebviewSidebarStyleChangedAction
  | WebviewTitleChangedAction
  | WebviewUnreadChangedAction
  | WebviewFaviconChangedAction
  | PersistableValuesMergedAction
  | WebviewDidStartLoadingAction
  | WebviewDidFailLoadAction
);

export type SkippedUpdateVersionActionTypes = (
  UpdatesReadyAction
  | PersistableValuesMergedAction
  | UpdateSkippedAction
);

export type SpellCheckingDictionariesActionTypes = (
  PersistableValuesMergedAction
  | SpellCheckingDictionariesUpdatedAction
  | WebviewSpellCheckingDictionaryToggledAction
);

export type TrustedCertificatesActionTypes = (
  CertificatesUpdatedAction
  | CertificatesClearedAction
  | PersistableValuesMergedAction
);

export type UpdateErrorActionTypes = (
  UpdatesCheckingForUpdateAction
  | UpdatesErrorThrownAction
  | UpdatesNewVersionAvailableAction
  | UpdatesNewVersionNotAvailableAction
);
