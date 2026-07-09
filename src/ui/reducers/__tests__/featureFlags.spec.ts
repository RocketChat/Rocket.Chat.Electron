import { APP_SETTINGS_LOADED } from '../../../app/actions';
import { DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB } from '../../../constants';
import { UPDATES_READY } from '../../../updates/actions';
import * as uiActions from '../../actions';
import { e2ePdfPreviewSizeLimit } from '../e2ePdfPreviewSizeLimit';
import { hasHideOnTrayNotificationShown } from '../hasHideOnTrayNotificationShown';
import { isAddNewServersEnabled } from '../isAddNewServersEnabled';
import { isBugsnagEnabled } from '../isBugsnagEnabled';
import { isDebugLoggingEnabled } from '../isDebugLoggingEnabled';
import { isDetailedEventsLoggingEnabled } from '../isDetailedEventsLoggingEnabled';
import { isDeveloperModeEnabled } from '../isDeveloperModeEnabled';
import { isFlashFrameEnabled } from '../isFlashFrameEnabled';
import { isHardwareAccelerationEnabled } from '../isHardwareAccelerationEnabled';
import { isInternalVideoChatWindowEnabled } from '../isInternalVideoChatWindowEnabled';
import { isMessageBoxFocused } from '../isMessageBoxFocused';
import { isMinimizeOnCloseEnabled } from '../isMinimizeOnCloseEnabled';
import { isNTLMCredentialsEnabled } from '../isNTLMCredentialsEnabled';
import { isReportEnabled } from '../isReportEnabled';
import { isShowWindowOnUnreadChangedEnabled } from '../isShowWindowOnUnreadChangedEnabled';
import { isTelephonyEnabled } from '../isTelephonyEnabled';
import { isTransparentWindowEnabled } from '../isTransparentWindowEnabled';
import { isTrayIconEnabled } from '../isTrayIconEnabled';
import { isVerboseOutlookLoggingEnabled } from '../isVerboseOutlookLoggingEnabled';
import { isVideoCallDevtoolsAutoOpenEnabled } from '../isVideoCallDevtoolsAutoOpenEnabled';
import { isVideoCallScreenCaptureFallbackEnabled } from '../isVideoCallScreenCaptureFallbackEnabled';
import { isVideoCallWindowPersistenceEnabled } from '../isVideoCallWindowPersistenceEnabled';

describe('isAddNewServersEnabled', () => {
  const actionPayload = {
    type: APP_SETTINGS_LOADED,
    payload: { isAddNewServersEnabled: false },
  } as const;

  it('uses default state when no state is passed', () => {
    expect(isAddNewServersEnabled(undefined, { type: 'UNKNOWN' } as any)).toBe(
      true
    );
  });

  it('reads isAddNewServersEnabled from APP_SETTINGS_LOADED', () => {
    expect(isAddNewServersEnabled(true, actionPayload)).toBe(false);
  });
});

describe('isBugsnagEnabled', () => {
  it('prefers APP_SETTINGS_LOADED', () => {
    expect(
      isBugsnagEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isReportEnabled: true },
      } as any)
    ).toBe(true);
  });

  it('reads isReportEnabled from UPDATES_READY', () => {
    expect(
      isBugsnagEnabled(false, {
        type: UPDATES_READY,
        payload: { isReportEnabled: true },
      } as any)
    ).toBe(true);
  });

  it('applies SETTINGS_SET_REPORT_OPT_IN_CHANGED', () => {
    expect(
      isBugsnagEnabled(true, {
        type: uiActions.SETTINGS_SET_REPORT_OPT_IN_CHANGED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isDebugLoggingEnabled', () => {
  it('starts disabled and applies SETTINGS_SET_DEBUG_LOGGING_CHANGED', () => {
    expect(
      isDebugLoggingEnabled(false, {
        type: uiActions.SETTINGS_SET_DEBUG_LOGGING_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
  });

  it('reads APP_SETTINGS_LOADED isDebugLoggingEnabled', () => {
    expect(
      isDebugLoggingEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isDebugLoggingEnabled: true },
      } as any)
    ).toBe(true);
  });
});

describe('isDetailedEventsLoggingEnabled', () => {
  it('starts disabled and applies SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED', () => {
    expect(
      isDetailedEventsLoggingEnabled(false, {
        type: uiActions.SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
  });

  it('reads APP_SETTINGS_LOADED isDetailedEventsLoggingEnabled', () => {
    expect(
      isDetailedEventsLoggingEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isDetailedEventsLoggingEnabled: true },
      } as any)
    ).toBe(true);
  });
});

describe('isDeveloperModeEnabled', () => {
  it('handles menu bar toggle and settings changed payload', () => {
    expect(
      isDeveloperModeEnabled(false, {
        type: uiActions.SETTINGS_SET_IS_DEVELOPER_MODE_ENABLED_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
    expect(
      isDeveloperModeEnabled(true, {
        type: uiActions.MENU_BAR_TOGGLE_IS_DEVELOPER_MODE_ENABLED_CLICKED,
        payload: false,
      } as any)
    ).toBe(false);
  });

  it('reads APP_SETTINGS_LOADED isDeveloperModeEnabled', () => {
    expect(
      isDeveloperModeEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isDeveloperModeEnabled: true },
      } as any)
    ).toBe(true);
  });
});

describe('isFlashFrameEnabled', () => {
  it('reads from APP_SETTINGS_LOADED and UPDATES_READY', () => {
    expect(
      isFlashFrameEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isFlashFrameEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isFlashFrameEnabled(false, {
        type: UPDATES_READY,
        payload: { isFlashFrameEnabled: true },
      } as any)
    ).toBe(true);
  });

  it('applies SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED', () => {
    expect(
      isFlashFrameEnabled(true, {
        type: uiActions.SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isHardwareAccelerationEnabled', () => {
  it('handles APP_SETTINGS_LOADED, UPDATES_READY, and reducer action', () => {
    expect(
      isHardwareAccelerationEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isHardwareAccelerationEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isHardwareAccelerationEnabled(false, {
        type: UPDATES_READY,
        payload: { isHardwareAccelerationEnabled: false },
      } as any)
    ).toBe(false);
    expect(
      isHardwareAccelerationEnabled(true, {
        type: uiActions.SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isInternalVideoChatWindowEnabled', () => {
  it('handles APP_SETTINGS_LOADED, UPDATES_READY, and reducer action', () => {
    expect(
      isInternalVideoChatWindowEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isInternalVideoChatWindowEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isInternalVideoChatWindowEnabled(false, {
        type: UPDATES_READY,
        payload: { isInternalVideoChatWindowEnabled: false },
      } as any)
    ).toBe(false);
    expect(
      isInternalVideoChatWindowEnabled(true, {
        type: uiActions.SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isMessageBoxFocused', () => {
  it('changes focus state based on message-box actions', () => {
    expect(
      isMessageBoxFocused(false, {
        type: uiActions.WEBVIEW_MESSAGE_BOX_FOCUSED,
      } as any)
    ).toBe(true);
    expect(
      isMessageBoxFocused(true, {
        type: uiActions.WEBVIEW_MESSAGE_BOX_BLURRED,
      } as any)
    ).toBe(false);
    expect(
      isMessageBoxFocused(false, {
        type: uiActions.WEBVIEW_DID_START_LOADING,
      } as any)
    ).toBe(false);
    expect(
      isMessageBoxFocused(true, {
        type: uiActions.WEBVIEW_DID_FAIL_LOAD,
      } as any)
    ).toBe(false);
  });
});

describe('isNTLMCredentialsEnabled', () => {
  it('prefers APP_SETTINGS_LOADED and SETTINGS_NTLM_CREDENTIALS_CHANGED', () => {
    expect(
      isNTLMCredentialsEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isNTLMCredentialsEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isNTLMCredentialsEnabled(false, {
        type: uiActions.SETTINGS_NTLM_CREDENTIALS_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
  });
});

describe('isReportEnabled', () => {
  it('reads APP_SETTINGS_LOADED and UPDATES_READY', () => {
    expect(
      isReportEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isReportEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isReportEnabled(false, {
        type: UPDATES_READY,
        payload: { isReportEnabled: true },
      } as any)
    ).toBe(true);
  });

  it('applies SETTINGS_SET_REPORT_OPT_IN_CHANGED', () => {
    expect(
      isReportEnabled(true, {
        type: uiActions.SETTINGS_SET_REPORT_OPT_IN_CHANGED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isShowWindowOnUnreadChangedEnabled', () => {
  it('prefers APP_SETTINGS_LOADED and toggle action', () => {
    expect(
      isShowWindowOnUnreadChangedEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isShowWindowOnUnreadChangedEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isShowWindowOnUnreadChangedEnabled(true, {
        type: uiActions.MENU_BAR_TOGGLE_IS_SHOW_WINDOW_ON_UNREAD_CHANGED_ENABLED_CLICKED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isTelephonyEnabled', () => {
  it('reads APP_SETTINGS_LOADED and settings action', () => {
    expect(
      isTelephonyEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isTelephonyEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isTelephonyEnabled(false, {
        type: uiActions.SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
  });
});

describe('isTransparentWindowEnabled', () => {
  it('applies SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED with boolean payload', () => {
    expect(
      isTransparentWindowEnabled(false, {
        type: uiActions.SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
  });

  it('ignores non-boolean payload and keeps previous state', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    expect(
      isTransparentWindowEnabled(false, {
        type: uiActions.SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
        payload: 'invalid',
      } as any)
    ).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('reads from APP_SETTINGS_LOADED', () => {
    expect(
      isTransparentWindowEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isTransparentWindowEnabled: true },
      } as any)
    ).toBe(true);
  });
});

describe('isTrayIconEnabled', () => {
  it('uses platform default when no action matches', () => {
    expect(
      isTrayIconEnabled(undefined, { type: 'UNKNOWN_ACTION' } as any)
    ).toBe(process.platform !== 'linux');
  });

  it('applies settings loaded and action updates', () => {
    expect(
      isTrayIconEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isTrayIconEnabled: false },
      } as any)
    ).toBe(false);
    expect(
      isTrayIconEnabled(false, {
        type: uiActions.SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
    expect(
      isTrayIconEnabled(false, {
        type: uiActions.MENU_BAR_TOGGLE_IS_TRAY_ICON_ENABLED_CLICKED,
        payload: true,
      } as any)
    ).toBe(true);
  });
});

describe('isVerboseOutlookLoggingEnabled', () => {
  it('reads APP_SETTINGS_LOADED and settings action', () => {
    expect(
      isVerboseOutlookLoggingEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isVerboseOutlookLoggingEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isVerboseOutlookLoggingEnabled(false, {
        type: uiActions.SETTINGS_SET_VERBOSE_OUTLOOK_LOGGING_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
  });
});

describe('isVideoCallDevtoolsAutoOpenEnabled', () => {
  it('reads APP_SETTINGS_LOADED and applies menu/setting actions', () => {
    expect(
      isVideoCallDevtoolsAutoOpenEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isVideoCallDevtoolsAutoOpenEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isVideoCallDevtoolsAutoOpenEnabled(false, {
        type: uiActions.SETTINGS_SET_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);
    expect(
      isVideoCallDevtoolsAutoOpenEnabled(true, {
        type: uiActions.MENU_BAR_TOGGLE_IS_VIDEO_CALL_DEVTOOLS_AUTO_OPEN_ENABLED_CLICKED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isVideoCallScreenCaptureFallbackEnabled', () => {
  it('reads APP_SETTINGS_LOADED, UPDATES_READY, and reducer action', () => {
    expect(
      isVideoCallScreenCaptureFallbackEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isVideoCallScreenCaptureFallbackEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isVideoCallScreenCaptureFallbackEnabled(false, {
        type: UPDATES_READY,
        payload: { isVideoCallScreenCaptureFallbackEnabled: true },
      } as any)
    ).toBe(true);
    expect(
      isVideoCallScreenCaptureFallbackEnabled(true, {
        type: uiActions.SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isVideoCallWindowPersistenceEnabled', () => {
  it('uses APP_SETTINGS_LOADED and reducer action', () => {
    expect(
      isVideoCallWindowPersistenceEnabled(true, {
        type: APP_SETTINGS_LOADED,
        payload: { isVideoCallWindowPersistenceEnabled: false },
      } as any)
    ).toBe(false);
    expect(
      isVideoCallWindowPersistenceEnabled(true, {
        type: uiActions.SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('e2ePdfPreviewSizeLimit', () => {
  it('uses default and APP_SETTINGS_LOADED values', () => {
    expect(
      e2ePdfPreviewSizeLimit(undefined, {
        type: 'UNKNOWN' as const,
      } as any)
    ).toBe(DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB);
    expect(
      e2ePdfPreviewSizeLimit(DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB, {
        type: APP_SETTINGS_LOADED,
        payload: { e2ePdfPreviewSizeLimit: 18 },
      } as any)
    ).toBe(18);
    expect(
      e2ePdfPreviewSizeLimit(18, {
        type: uiActions.SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED,
        payload: 20,
      } as any)
    ).toBe(20);
  });

  it('keeps prior value when APP_SETTINGS_LOADED omits e2ePdfPreviewSizeLimit', () => {
    expect(
      e2ePdfPreviewSizeLimit(12, {
        type: APP_SETTINGS_LOADED,
        payload: { otherSetting: true },
      } as any)
    ).toBe(12);
  });
});

describe('hasHideOnTrayNotificationShown', () => {
  it('defaults to false and reads APP_SETTINGS_LOADED payload', () => {
    expect(
      hasHideOnTrayNotificationShown(undefined, {
        type: 'UNKNOWN' as const,
      } as any)
    ).toBe(false);
    expect(
      hasHideOnTrayNotificationShown(false, {
        type: APP_SETTINGS_LOADED,
        payload: { hasHideOnTrayNotificationShown: true },
      } as any)
    ).toBe(true);
  });

  it('respects explicit tray notification action updates', () => {
    expect(
      hasHideOnTrayNotificationShown(true, {
        type: uiActions.SET_HAS_TRAY_MINIMIZE_NOTIFICATION_SHOWN,
        payload: false,
      } as any)
    ).toBe(false);
  });
});

describe('isMinimizeOnCloseEnabled', () => {
  const originalPlatform = process.platform;

  const setPlatform = (platform: NodeJS.Platform): void => {
    Object.defineProperty(process, 'platform', {
      value: platform,
      configurable: true,
    });
  };

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('defaults to window platform flag and updates from settings/action', () => {
    setPlatform('darwin');
    expect(
      isMinimizeOnCloseEnabled(undefined, { type: 'UNKNOWN' as const } as any)
    ).toBe(false);

    setPlatform('win32');
    expect(
      isMinimizeOnCloseEnabled(undefined, { type: 'UNKNOWN' as const } as any)
    ).toBe(true);

    expect(
      isMinimizeOnCloseEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: { isMinimizeOnCloseEnabled: false },
      } as any)
    ).toBe(false);
    expect(
      isMinimizeOnCloseEnabled(false, {
        type: uiActions.SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED,
        payload: true,
      } as any)
    ).toBe(true);

    expect(
      isMinimizeOnCloseEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
  });

  it('keeps existing state for unknown actions', () => {
    expect(
      isMinimizeOnCloseEnabled(true, {
        type: 'UNKNOWN_MINIMIZE_ON_CLOSE',
      } as any)
    ).toBe(true);
  });
});

describe('reducers keep state on unknown actions', () => {
  it('keeps feature flags unchanged', () => {
    expect(isBugsnagEnabled(true, { type: 'UNKNOWN_BUGSNAG' } as any)).toBe(
      true
    );
    expect(
      isDebugLoggingEnabled(true, { type: 'UNKNOWN_DEBUG_LOGGING' } as any)
    ).toBe(true);
    expect(
      isDetailedEventsLoggingEnabled(false, {
        type: 'UNKNOWN_DETAILED_EVENTS',
      } as any)
    ).toBe(false);
    expect(
      isDeveloperModeEnabled(true, { type: 'UNKNOWN_DEVELOPER_MODE' } as any)
    ).toBe(true);
    expect(
      isFlashFrameEnabled(true, { type: 'UNKNOWN_FLASH_FRAME' } as any)
    ).toBe(true);
    expect(
      isHardwareAccelerationEnabled(false, {
        type: 'UNKNOWN_HARDWARE_ACCEL',
      } as any)
    ).toBe(false);
    expect(
      isInternalVideoChatWindowEnabled(true, {
        type: 'UNKNOWN_INTERNAL_VIDEO_CHAT',
      } as any)
    ).toBe(true);
    expect(
      isMessageBoxFocused(true, { type: 'UNKNOWN_MESSAGE_BOX' } as any)
    ).toBe(true);
    expect(
      isNTLMCredentialsEnabled(true, { type: 'UNKNOWN_NTLM' } as any)
    ).toBe(true);
    expect(isReportEnabled(true, { type: 'UNKNOWN_REPORT' } as any)).toBe(true);
    expect(
      isShowWindowOnUnreadChangedEnabled(true, {
        type: 'UNKNOWN_UNREAD_CHANGED',
      } as any)
    ).toBe(true);
    expect(
      isTelephonyEnabled(false, { type: 'UNKNOWN_TELEPHONY' } as any)
    ).toBe(false);
    expect(
      isTransparentWindowEnabled(true, {
        type: 'UNKNOWN_TRANSPARENT_WINDOW',
      } as any)
    ).toBe(true);
    expect(
      isVerboseOutlookLoggingEnabled(false, {
        type: 'UNKNOWN_VERBOSE_OUTLOOK',
      } as any)
    ).toBe(false);
    expect(
      isVideoCallDevtoolsAutoOpenEnabled(true, {
        type: 'UNKNOWN_VIDEO_CALL_DEVTOOLS_AUTO_OPEN',
      } as any)
    ).toBe(true);
    expect(
      isVideoCallScreenCaptureFallbackEnabled(true, {
        type: 'UNKNOWN_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK',
      } as any)
    ).toBe(true);
    expect(
      isVideoCallWindowPersistenceEnabled(false, {
        type: 'UNKNOWN_VIDEO_CALL_WINDOW_PERSISTENCE',
      } as any)
    ).toBe(false);
  });

  it('keeps default state when initial state is undefined', () => {
    expect(
      isBugsnagEnabled(undefined, { type: 'UNKNOWN_BUGSNAG' } as any)
    ).toBe(false);
    expect(
      isDebugLoggingEnabled(undefined, { type: 'UNKNOWN_DEBUG_LOGGING' } as any)
    ).toBe(false);
    expect(
      isDetailedEventsLoggingEnabled(undefined, {
        type: 'UNKNOWN_DETAILED_EVENTS',
      } as any)
    ).toBe(false);
    expect(
      isDeveloperModeEnabled(undefined, {
        type: 'UNKNOWN_DEVELOPER_MODE',
      } as any)
    ).toBe(false);
    expect(
      isFlashFrameEnabled(undefined, { type: 'UNKNOWN_FLASH_FRAME' } as any)
    ).toBe(false);
    expect(
      isHardwareAccelerationEnabled(undefined, {
        type: 'UNKNOWN_HARDWARE_ACCEL',
      } as any)
    ).toBe(false);
    expect(
      isInternalVideoChatWindowEnabled(undefined, {
        type: 'UNKNOWN_INTERNAL_VIDEO_CHAT',
      } as any)
    ).toBe(false);
    expect(
      isMessageBoxFocused(undefined, { type: 'UNKNOWN_MESSAGE_BOX' } as any)
    ).toBe(false);
    expect(
      isNTLMCredentialsEnabled(undefined, { type: 'UNKNOWN_NTLM' } as any)
    ).toBe(false);
    expect(isReportEnabled(undefined, { type: 'UNKNOWN_REPORT' } as any)).toBe(
      false
    );
    expect(
      isShowWindowOnUnreadChangedEnabled(undefined, {
        type: 'UNKNOWN_UNREAD_CHANGED',
      } as any)
    ).toBe(false);
    expect(
      isTelephonyEnabled(undefined, { type: 'UNKNOWN_TELEPHONY' } as any)
    ).toBe(false);
    expect(
      isTransparentWindowEnabled(undefined, {
        type: 'UNKNOWN_TRANSPARENT_WINDOW',
      } as any)
    ).toBe(false);
    expect(
      isVerboseOutlookLoggingEnabled(undefined, {
        type: 'UNKNOWN_VERBOSE_OUTLOOK',
      } as any)
    ).toBe(false);
    expect(
      isVideoCallDevtoolsAutoOpenEnabled(undefined, {
        type: 'UNKNOWN_VIDEO_CALL_DEVTOOLS_AUTO_OPEN',
      } as any)
    ).toBe(false);
    expect(
      isVideoCallScreenCaptureFallbackEnabled(undefined, {
        type: 'UNKNOWN_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK',
      } as any)
    ).toBe(false);
    expect(
      isVideoCallWindowPersistenceEnabled(undefined, {
        type: 'UNKNOWN_VIDEO_CALL_WINDOW_PERSISTENCE',
      } as any)
    ).toBe(true);
  });

  it('falls back to defaults when settings payload values are missing', () => {
    expect(
      isBugsnagEnabled(false, { type: APP_SETTINGS_LOADED, payload: {} } as any)
    ).toBe(false);
    expect(
      isDebugLoggingEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isDetailedEventsLoggingEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isDeveloperModeEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isFlashFrameEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isHardwareAccelerationEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isInternalVideoChatWindowEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isNTLMCredentialsEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isShowWindowOnUnreadChangedEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isTelephonyEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isTransparentWindowEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isVerboseOutlookLoggingEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isVideoCallDevtoolsAutoOpenEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isVideoCallScreenCaptureFallbackEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
    expect(
      isVideoCallWindowPersistenceEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
  });

  it('covers additional fallback branches', () => {
    expect(
      isVideoCallScreenCaptureFallbackEnabled(false, {
        type: UPDATES_READY,
        payload: {},
      } as any)
    ).toBe(false);

    expect(
      isTrayIconEnabled(false, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(false);
  });
});
