import { APP_SETTINGS_LOADED } from '../../../app/actions';
import { DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB } from '../../../constants';
import {
  DEEP_LINKS_SERVER_ADDED,
  DEEP_LINKS_SERVER_FOCUSED,
} from '../../../deepLinks/actions';
import * as navigationActions from '../../../navigation/actions';
import * as outlookActions from '../../../outlookCalendar/actions';
import * as screenSharingActions from '../../../screenSharing/actions';
import { SERVERS_LOADED } from '../../../servers/actions';
import { UPDATES_NEW_VERSION_AVAILABLE } from '../../../updates/actions';
import * as uiActions from '../../actions';
import { availableBrowsers } from '../availableBrowsers';
import { currentView } from '../currentView';
import {
  dialogs,
  serverInfoModal,
  telephonyServerSelect,
  telephonyDefaultHandlerPrompt,
} from '../dialogs';
import { e2ePdfPreviewSizeLimit } from '../e2ePdfPreviewSizeLimit';
import { hasHideOnTrayNotificationShown } from '../hasHideOnTrayNotificationShown';
import { isMinimizeOnCloseEnabled } from '../isMinimizeOnCloseEnabled';
import { lastSelectedServerUrl } from '../lastSelectedServerUrl';
import { openDialog } from '../openDialog';
import { rootWindowIcon } from '../rootWindowIcon';
import { rootWindowState } from '../rootWindowState';
import { selectedBrowser } from '../selectedBrowser';
import { userThemePreference } from '../userThemePreference';
import { videoCallWindowState } from '../videoCallWindowState';

describe('availableBrowsers reducer', () => {
  it('returns default empty array and updates from action payload', () => {
    expect(availableBrowsers(undefined, { type: 'unknown' } as any)).toEqual(
      []
    );
    expect(
      availableBrowsers([], {
        type: uiActions.SETTINGS_AVAILABLE_BROWSERS_UPDATED,
        payload: ['safari', 'firefox'],
      } as any)
    ).toEqual(['safari', 'firefox']);
    expect(
      availableBrowsers(['chrome'], {
        type: APP_SETTINGS_LOADED,
        payload: { availableBrowsers: ['safari'] },
      } as any)
    ).toEqual(['chrome']);
  });
});

describe('currentView reducer', () => {
  it('loads from settings and deep links', () => {
    expect(
      currentView('add-new-server', {
        type: APP_SETTINGS_LOADED,
        payload: { currentView: 'downloads' },
      } as any)
    ).toEqual('downloads');
    expect(
      currentView('add-new-server', {
        type: DEEP_LINKS_SERVER_ADDED,
        payload: 'https://deep.example',
      } as any)
    ).toEqual({ url: 'https://deep.example' });
    expect(
      currentView('add-new-server', {
        type: DEEP_LINKS_SERVER_FOCUSED,
        payload: 'https://focused.example',
      } as any)
    ).toEqual({ url: 'https://focused.example' });
  });

  it('handles focus/download/action transitions', () => {
    expect(
      currentView({ url: 'https://abc' }, {
        type: uiActions.WEBVIEW_FOCUS_REQUESTED,
        payload: { url: 'https://focused.example', view: 'downloads' },
      } as any)
    ).toBe('downloads');

    expect(
      currentView({ url: 'https://abc' }, {
        type: uiActions.WEBVIEW_FOCUS_REQUESTED,
        payload: { url: 'https://focused.example', view: 'other' },
      } as any)
    ).toEqual({ url: 'https://focused.example' });
  });

  it('handles side-bar remove, downloads back button, and servers loaded', () => {
    expect(
      currentView({ url: 'https://stay.example' }, {
        type: uiActions.SIDE_BAR_REMOVE_SERVER_CLICKED,
        payload: 'https://other.example',
      } as any)
    ).toEqual({ url: 'https://stay.example' });

    expect(
      currentView({ url: 'https://stay.example' }, {
        type: uiActions.SIDE_BAR_REMOVE_SERVER_CLICKED,
        payload: 'https://stay.example',
      } as any)
    ).toEqual('add-new-server');

    expect(
      currentView('add-new-server', {
        type: uiActions.SIDE_BAR_SERVER_SELECTED,
        payload: 'https://side.example',
      } as any)
    ).toEqual({ url: 'https://side.example' });

    expect(
      currentView('add-new-server', {
        type: uiActions.MENU_BAR_ADD_NEW_SERVER_CLICKED,
      } as any)
    ).toEqual('add-new-server');

    expect(
      currentView('settings', {
        type: SERVERS_LOADED,
        payload: { selected: undefined },
      } as any)
    ).toEqual('add-new-server');

    expect(
      currentView('settings', {
        type: uiActions.SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
      } as any)
    ).toEqual('downloads');

    expect(
      currentView('downloads', {
        type: uiActions.SIDE_BAR_SETTINGS_BUTTON_CLICKED,
      } as any)
    ).toEqual('settings');

    expect(
      currentView('downloads', {
        type: uiActions.ADD_SERVER_VIEW_SERVER_ADDED,
        payload: 'https://added.example',
      } as any)
    ).toEqual({ url: 'https://added.example' });

    expect(
      currentView('downloads', { type: 'UNKNOWN_CURRENT_VIEW_ACTION' } as any)
    ).toEqual('downloads');

    expect(
      currentView({ url: 'https://abc' }, {
        type: SERVERS_LOADED,
        payload: { selected: 'https://selected.example' },
      } as any)
    ).toEqual({ url: 'https://selected.example' });

    expect(
      currentView('settings', { type: APP_SETTINGS_LOADED, payload: {} } as any)
    ).toBe('settings');

    expect(
      currentView(undefined, { type: 'UNKNOWN_CURRENT_VIEW_ACTION' } as any)
    ).toBe('add-new-server');
  });
});

describe('dialogs reducer', () => {
  it('opens and closes server info and telephony dialogs', () => {
    expect(
      dialogs(undefined, {
        type: uiActions.OPEN_SERVER_INFO_MODAL,
        payload: { url: 'https://server.example' },
      } as any).serverInfoModal
    ).toEqual({
      isOpen: true,
      serverData: { url: 'https://server.example' },
    });

    expect(
      dialogs(
        {
          serverInfoModal: {
            isOpen: true,
            serverData: { url: 'https://server.example' },
          },
          telephonyServerSelect: null,
          telephonyDefaultHandlerPrompt: null,
        },
        { type: uiActions.CLOSE_SERVER_INFO_MODAL } as any
      ).serverInfoModal.isOpen
    ).toBe(false);

    expect(
      dialogs(undefined, {
        type: uiActions.TELEPHONY_SERVER_SELECT_OPEN,
        payload: { phoneNumber: '111', rawUri: 'sip:111' },
      } as any).telephonyServerSelect
    ).toEqual({ isOpen: true, phoneNumber: '111', rawUri: 'sip:111' });

    expect(
      dialogs(
        {
          serverInfoModal: { isOpen: false, serverData: null },
          telephonyServerSelect: {
            isOpen: true,
            phoneNumber: '111',
            rawUri: 'sip:111',
          },
          telephonyDefaultHandlerPrompt: null,
        },
        { type: uiActions.TELEPHONY_SERVER_SELECT_CLOSE } as any
      ).telephonyServerSelect
    ).toBe(null);

    expect(
      dialogs(undefined, {
        type: uiActions.TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN,
      } as any).telephonyDefaultHandlerPrompt
    ).toEqual({ isOpen: true });

    expect(
      dialogs(
        {
          serverInfoModal: { isOpen: false, serverData: null },
          telephonyServerSelect: null,
          telephonyDefaultHandlerPrompt: { isOpen: true },
        },
        {
          type: uiActions.TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
        } as any
      ).telephonyDefaultHandlerPrompt
    ).toBe(null);
  });

  it('returns existing state for unknown actions', () => {
    const existingState = {
      serverInfoModal: {
        isOpen: false,
        serverData: null,
      },
      telephonyServerSelect: null,
      telephonyDefaultHandlerPrompt: null,
    };

    expect(
      dialogs(existingState, { type: 'unknown-dialog-action' } as any)
    ).toEqual(existingState);
  });

  it('keeps subreducers on unknown actions', () => {
    expect(
      serverInfoModal(
        {
          isOpen: true,
          serverData: { url: 'https://existing.example' },
        },
        { type: 'UNKNOWN_SERVER_INFO_MODAL_ACTION' } as any
      )
    ).toEqual({
      isOpen: true,
      serverData: { url: 'https://existing.example' },
    });

    expect(
      telephonyServerSelect(
        {
          isOpen: true,
          phoneNumber: '123',
          rawUri: 'sip:123',
        },
        { type: 'UNKNOWN_TELEPHONY_SERVER_SELECT_ACTION' } as any
      )
    ).toEqual({ isOpen: true, phoneNumber: '123', rawUri: 'sip:123' });

    expect(
      telephonyDefaultHandlerPrompt(
        {
          isOpen: true,
        },
        { type: 'UNKNOWN_TELEPHONY_DEFAULT_HANDLER_ACTION' } as any
      )
    ).toEqual({ isOpen: true });

    expect(
      serverInfoModal(undefined, {
        type: 'UNKNOWN_SERVER_INFO_MODAL_ACTION',
      } as any)
    ).toEqual({
      isOpen: false,
      serverData: null,
    });

    expect(
      telephonyServerSelect(undefined, {
        type: 'UNKNOWN_TELEPHONY_SERVER_SELECT_ACTION',
      } as any)
    ).toBe(null);

    expect(
      telephonyDefaultHandlerPrompt(undefined, {
        type: 'UNKNOWN_TELEPHONY_DEFAULT_HANDLER_ACTION' as any,
      } as any)
    ).toBe(null);

    expect(
      telephonyDefaultHandlerPrompt({ isOpen: true }, {
        type: uiActions.TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
      } as any)
    ).toBe(null);
  });
});

describe('openDialog reducer', () => {
  it('sets and clears open dialog state', () => {
    expect(
      openDialog(null, { type: uiActions.MENU_BAR_ABOUT_CLICKED } as any)
    ).toBe('about');
    expect(
      openDialog('about', {
        type: navigationActions.CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
      } as any)
    ).toBe('select-client-certificate');
    expect(
      openDialog('screen-sharing', {
        type: screenSharingActions.SCREEN_SHARING_DIALOG_DISMISSED,
      } as any)
    ).toBe(null);
    expect(
      openDialog(null, { type: UPDATES_NEW_VERSION_AVAILABLE } as any)
    ).toBe('update');
    expect(
      openDialog(null, {
        type: uiActions.WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
      } as any)
    ).toBe('screen-sharing');
  });

  it('ignores unknown actions', () => {
    expect(openDialog('about', { type: 'UNKNOWN_DIALOG_ACTION' } as any)).toBe(
      'about'
    );
    expect(
      openDialog(undefined, { type: 'UNKNOWN_DIALOG_ACTION' } as any)
    ).toBe(null);
  });

  it('handles dismiss actions and alternate branches', () => {
    expect(
      openDialog('about', { type: uiActions.ABOUT_DIALOG_DISMISSED } as any)
    ).toBe(null);

    expect(
      openDialog('settings', { type: uiActions.ABOUT_DIALOG_DISMISSED } as any)
    ).toBe('settings');

    expect(
      openDialog(null, {
        type: outlookActions.OUTLOOK_CALENDAR_DIALOG_DISMISSED,
      } as any)
    ).toBe(null);

    expect(
      openDialog(null, {
        type: outlookActions.OUTLOOK_CALENDAR_ASK_CREDENTIALS,
      } as any)
    ).toBe('outlook-credentials');
  });
});

describe('lastSelectedServerUrl', () => {
  it('prefers first server from settings when empty and picks from payload', () => {
    expect(
      lastSelectedServerUrl('', {
        type: APP_SETTINGS_LOADED,
        payload: {
          servers: [
            { url: 'https://first.example' },
            { url: 'https://second.example' },
          ],
        },
      } as any)
    ).toBe('https://first.example');

    expect(
      lastSelectedServerUrl('https://keep.example', {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe('https://keep.example');

    expect(
      lastSelectedServerUrl('https://keep.example', {
        type: uiActions.SIDE_BAR_SERVER_SELECTED,
        payload: 'https://clicked.example',
      } as any)
    ).toBe('https://clicked.example');

    expect(
      lastSelectedServerUrl(undefined, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe('');

    expect(
      lastSelectedServerUrl('https://keep.example', {
        type: 'UNKNOWN_SERVER_SELECTION_ACTION' as any,
      } as any)
    ).toBe('https://keep.example');

    expect(
      lastSelectedServerUrl(undefined, {
        type: 'UNKNOWN_SERVER_SELECTION_ACTION' as any,
      } as any)
    ).toBe('');
  });
});

describe('rootWindowIcon', () => {
  it('defaults null and sets icon payload', () => {
    expect(rootWindowIcon(null, { type: 'unknown' } as any)).toBe(null);
    expect(
      rootWindowIcon(null, {
        type: uiActions.ROOT_WINDOW_ICON_CHANGED,
        payload: { src: '/tmp/favicon.png', isVector: false },
      } as any)
    ).toEqual({ src: '/tmp/favicon.png', isVector: false });

    expect(
      rootWindowIcon(undefined, { type: 'unknown-icon-action' } as any)
    ).toBe(null);
  });
});

describe('rootWindowState and videoCallWindowState', () => {
  const statePayload = {
    focused: true,
    visible: false,
    maximized: false,
    minimized: false,
    fullscreen: false,
    normal: true,
    bounds: {
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    },
  };

  it('handles updates and settings load', () => {
    expect(
      rootWindowState(undefined, {
        type: uiActions.ROOT_WINDOW_STATE_CHANGED,
        payload: statePayload,
      } as any)
    ).toEqual(statePayload);

    expect(
      rootWindowState(statePayload, {
        type: APP_SETTINGS_LOADED,
        payload: { rootWindowState: 'ignored' as any },
      } as any)
    ).toEqual('ignored');
  });

  it('handles video call window state update and settings load', () => {
    expect(
      videoCallWindowState(undefined, {
        type: uiActions.VIDEO_CALL_WINDOW_STATE_CHANGED,
        payload: statePayload,
      } as any)
    ).toEqual(statePayload);

    expect(
      videoCallWindowState(statePayload, {
        type: APP_SETTINGS_LOADED,
        payload: { videoCallWindowState: statePayload },
      } as any)
    ).toEqual(statePayload);

    expect(
      videoCallWindowState(statePayload, {
        type: 'UNKNOWN_VIDEO_CALL_WINDOW_STATE_ACTION',
      } as any)
    ).toEqual(statePayload);
  });

  it('keeps root window state unchanged for unknown action', () => {
    expect(
      rootWindowState(statePayload, {
        type: 'UNKNOWN_ROOT_WINDOW_STATE_ACTION',
      } as any)
    ).toEqual(statePayload);
  });

  it('uses defaults with undefined state', () => {
    expect(
      rootWindowState(undefined, {
        type: 'UNKNOWN_ROOT_WINDOW_STATE_ACTION',
      } as any)
    ).toEqual({
      focused: true,
      visible: true,
      maximized: false,
      minimized: false,
      fullscreen: false,
      normal: true,
      bounds: { x: undefined, y: undefined, width: 1000, height: 600 },
    });

    expect(
      rootWindowState(statePayload, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toEqual(statePayload);

    expect(
      videoCallWindowState(undefined, {
        type: 'UNKNOWN_VIDEO_CALL_WINDOW_STATE_ACTION',
      } as any)
    ).toEqual({
      focused: true,
      visible: true,
      maximized: false,
      minimized: false,
      fullscreen: false,
      normal: true,
      bounds: { x: undefined, y: undefined, width: 0, height: 0 },
    });

    expect(
      videoCallWindowState(statePayload, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toEqual(statePayload);
  });
});

describe('selectedBrowser', () => {
  it('tracks selected browser preference', () => {
    expect(
      selectedBrowser(null, {
        type: uiActions.SETTINGS_SELECTED_BROWSER_CHANGED,
        payload: 'firefox',
      } as any)
    ).toBe('firefox');

    expect(
      selectedBrowser('chrome', {
        type: APP_SETTINGS_LOADED,
        payload: { selectedBrowser: 'safari' },
      } as any)
    ).toBe('safari');

    expect(
      selectedBrowser('firefox', {
        type: 'UNKNOWN_SELECTED_BROWSER_ACTION',
      } as any)
    ).toBe('firefox');

    expect(
      selectedBrowser(undefined, {
        type: 'UNKNOWN_SELECTED_BROWSER_ACTION',
      } as any)
    ).toBe(null);

    expect(
      selectedBrowser('safari', {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe('safari');
  });
});

describe('userThemePreference', () => {
  it('accepts valid values and warns on invalid', () => {
    expect(
      userThemePreference('auto', {
        type: uiActions.SETTINGS_USER_THEME_PREFERENCE_CHANGED,
        payload: 'dark',
      } as any)
    ).toBe('dark');

    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    expect(
      userThemePreference('dark', {
        type: uiActions.SETTINGS_USER_THEME_PREFERENCE_CHANGED,
        payload: 'rainbow',
      } as any)
    ).toBe('dark');

    expect(
      userThemePreference('dark', {
        type: APP_SETTINGS_LOADED,
        payload: { userThemePreference: 'invalid' },
      } as any)
    ).toBe('dark');

    expect(
      userThemePreference('light', {
        type: APP_SETTINGS_LOADED,
        payload: {} as any,
      })
    ).toBe('light');

    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('returns existing value for unknown actions', () => {
    expect(
      userThemePreference('light', {
        type: 'UNKNOWN_THEME_PREFERENCE_ACTION',
      } as any)
    ).toBe('light');
  });

  it('uses default theme state and handles settings value', () => {
    expect(
      userThemePreference(undefined, {
        type: 'UNKNOWN_THEME_PREFERENCE_ACTION',
      } as any)
    ).toBe('auto');

    expect(
      userThemePreference('light', {
        type: APP_SETTINGS_LOADED,
        payload: { userThemePreference: 'dark' },
      } as any)
    ).toBe('dark');
  });
});

describe('isMinimizeOnCloseEnabled', () => {
  it('returns platform default and responds to settings changes', () => {
    expect(
      isMinimizeOnCloseEnabled(undefined, { type: 'unknown' } as any)
    ).toBe(process.platform === 'win32');
    expect(
      isMinimizeOnCloseEnabled(false, {
        type: uiActions.SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);

    expect(
      isMinimizeOnCloseEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isMinimizeOnCloseEnabled: false },
      } as any)
    ).toBe(false);

    expect(
      isMinimizeOnCloseEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
  });
});

describe('e2ePdfPreviewSizeLimit', () => {
  it('uses default value and handles settings action', () => {
    expect(
      e2ePdfPreviewSizeLimit(undefined, {
        type: 'UNKNOWN_PDF_LIMIT_ACTION',
      } as any)
    ).toBe(DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB);

    expect(
      e2ePdfPreviewSizeLimit(DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB);

    expect(
      e2ePdfPreviewSizeLimit(DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB, {
        type: APP_SETTINGS_LOADED,
        payload: { e2ePdfPreviewSizeLimit: 77 },
      } as any)
    ).toBe(77);

    expect(
      e2ePdfPreviewSizeLimit(123, {
        type: uiActions.SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED,
        payload: 77,
      } as any)
    ).toBe(77);
  });
});

describe('hasHideOnTrayNotificationShown', () => {
  it('loads from settings and applies update action', () => {
    expect(
      hasHideOnTrayNotificationShown(false, {
        type: APP_SETTINGS_LOADED,
        payload: { hasHideOnTrayNotificationShown: true },
      } as any)
    ).toBe(true);

    expect(
      hasHideOnTrayNotificationShown(false, {
        type: uiActions.SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN,
        payload: true,
      } as any)
    ).toBe(true);

    expect(
      hasHideOnTrayNotificationShown(undefined, {
        type: 'UNKNOWN_HAS_HIDE_ON_TRAY_NOTIFICATION_ACTION',
      } as any)
    ).toBe(false);
  });
});
